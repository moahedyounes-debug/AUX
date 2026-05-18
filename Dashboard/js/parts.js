// ═══════════════════════════════════════════════════════════════
//  AUX ASC DASHBOARD · SPARE PARTS
//  Stock logic (Sort column):
//    Sort 5  = Physical Inbound in KSA WH   → +WH stock
//    Sort 6  = Part Request by SVC           → −WH / +SVC
//    Sort 8  = Part Used by Tech             → −SVC (consumed)
//    Sort 10 = Part Return Received          → +WH (used part return)
//    Sort 12 = New Part Return Received      → +WH (new part return)
//    All other sorts ignored for stock balance
//
//  Part name = "Part Name" if not blank, else "Second Part Name"
//  Part code = "Accessory Code"
// ═══════════════════════════════════════════════════════════════

const PARTS_DB = {
  transactions: [],
  loaded:       false,
  loading:      false,
  // model → Set of part codes  (built from Parts Model sheet)
  modelMap:     {},   // { "ATW18A2DI-CSA": Set(["11223...", "11224..."]), ... }
  modelRows:    [],   // raw rows from Parts Model sheet (for autocomplete / display)
};
let PARTS_REQUESTS = []; // loaded from Parts tab in main sheet

// State for interactive card filtering
let _metricsFilterState = {
  activeMetric: null, // 'lowStock', 'zeroStock', 'reorderAlert', or null
};

// ── Build model→partCode lookup from Parts Model sheet rows ────
function buildModelMap(rows) {
  const map = {};
  let debugInfo = { totalRows: rows.length, modelCount: 0, noModel: 0, noCode: 0, noModelOrCode: 0 };

  // Log first row structure to understand available columns
  if (rows.length > 0) {
    console.log('First row keys:', Object.keys(rows[0]));
    console.log('First row sample:', rows[0]);
  }

  rows.forEach((row, idx) => {
    // Primary model source: Customer Model (friendly names like ATW24A2DI-CSA)
    // Fallback: *Model Code (numeric internal codes)
    const model = (
      row['Customer Model'] || row['customer model'] ||
      row['*Model Code']    || row['Model Code']    ||
      row['Model']          || row['model']          ||
      row['CustomerModel']  || ''
    ).trim();

    const code = (
      row['*Accessory Code'] || row['Accessory Code'] || row['accessory code'] ||
      row['Part Code']      || row['part code']      ||
      row['Code']           || row['code']           ||
      row['ACC_CODE']       || ''
    ).trim();

    if (!model && !code) {
      debugInfo.noModelOrCode++;
    } else if (!model) {
      debugInfo.noModel++;
    } else if (!code) {
      debugInfo.noCode++;
    } else {
      debugInfo.modelCount++;
    }

    if (!model || !code) return;

    const key = model.toLowerCase();
    if (!map[key]) map[key] = { label: model, codes: new Set() };
    map[key].codes.add(code);
  });

  console.log('buildModelMap debug:', debugInfo);
  return map;
}

// ── Load ───────────────────────────────────────────────────────
async function loadPartsData() {
  if (PARTS_DB.loading) return;
  PARTS_DB.loading = true;
  try {
    const [txResp, modelsResp, reqResp] = await Promise.all([
      fetch(partsSheetUrl(CONFIG.PARTS_TRANSACTION)),
      fetch(partsSheetUrl(CONFIG.PARTS_MODELS)).catch(() => null),
      fetch(sheetUrl(CONFIG.PARTS_SHEET)).catch(() => null),
    ]);
    if (!txResp.ok) throw new Error('Cannot load Transaction sheet');

    PARTS_DB.transactions = parseCSV(await txResp.text()).map(enrichTransaction);

    if (modelsResp && modelsResp.ok) {
      PARTS_DB.modelRows = parseCSV(await modelsResp.text());
      PARTS_DB.modelMap  = buildModelMap(PARTS_DB.modelRows);
      console.log(`Parts Model sheet loaded: ${PARTS_DB.modelRows.length} rows, ${Object.keys(PARTS_DB.modelMap).length} models`);
    } else {
      console.warn('Parts Model sheet not available');
    }

    if (reqResp && reqResp.ok) {
      PARTS_REQUESTS = parseCSV(await reqResp.text());
    }

    PARTS_DB.loaded = true;
  } catch(e) {
    console.error('Parts load:', e);
    PARTS_DB.loaded = false;
  }
  PARTS_DB.loading = false;
}

// ── Enrich transaction row ─────────────────────────────────────
function enrichTransaction(row) {
  const C = CONFIG.PARTS_COLS;
  const r = {...row};
  r._sort    = parseInt(r[C.SORT] || r['Sort'] || '0') || 0;
  r._qty     = Math.abs(parseFloat(r[C.QTY]) || 0);
  r._date    = parseDate(r[C.CREATED]);

  const warehouseName = (r[C.WAREHOUSE] || '').trim().toLowerCase();
  const isWarehouse = warehouseName && (warehouseName.includes('warehouse') || warehouseName.includes('riyadh'));

  r._branch  = isWarehouse ? 'AUX Main WH Stock' : normalizeCityName((r[C.BRANCH] || r[C.BRANCH2] || '').trim() || 'Unknown');
  r._asc     = isWarehouse ? '' : ((r[C.ASC] || r[C.ASC2] || '').trim());
  r._partName = ((r[C.PART_NAME]||'').trim() || (r[C.PART_NAME2]||'').trim() || (r[C.ACC_NAME]||'').trim());
  r._partCode = ((r[C.ACC_CODE]||'').trim()  || (r[C.CODE]||'').trim() || (r[C.CODE2]||'').trim());
  r._key     = r._partCode || r._partName;
  r._awb     = (r[C.REF] || '').trim();
  r._orderNo = (r[C.ORDER_NO] || '').trim();
  r._monthKey = r._date
    ? `${r._date.getFullYear()}-${String(r._date.getMonth()+1).padStart(2,'0')}` : '';
  r._transactionType = mapTransactionTypeFromSort(r._sort);
  return r;
}

// ── Transaction type mapping from Sort column ──────────
function mapTransactionTypeFromSort(sort) {
  switch (sort) {
    case 5:  return 'Part Inbound';
    case 6:  return 'Part Request By SVC';
    case 8:  return 'Part Used By Tech';
    case 10: return 'Part Return Received';
    case 12: return 'Part Return Received';
    default: return null;
  }
}

// ── Stock calculation (Sort-based) ────────────────────────────
function calcStockMap(transactions) {
  const m = {};
  function get(r) {
    const k = r._key; if (!k) return null;
    if (!m[k]) m[k] = {
      code:r._partCode, name:r._partName, branch:r._branch, asc:r._asc,
      wh:0, svc:0, consumed:0, returnedWH:0, awb:'',
      monthlyConsumption:{}, lastUsed:null,
    };
    return m[k];
  }
  transactions.forEach(r => {
    const p = get(r); if (!p) return;
    switch (r._sort) {
      case 5:  p.wh  += r._qty; break;
      case 6:  p.wh  -= r._qty; p.svc  += r._qty; break;
      case 8:  p.svc -= r._qty; p.consumed += r._qty;
               if (r._monthKey) {
                 p.monthlyConsumption[r._monthKey] = (p.monthlyConsumption[r._monthKey]||0)+r._qty;
               }
               if (!p.lastUsed||(r._date&&r._date>p.lastUsed)) p.lastUsed=r._date;
               break;
      case 10: p.wh  += r._qty; p.returnedWH += r._qty; break;
      case 12: p.wh  += r._qty; p.returnedWH += r._qty; break;
    }
    if (r._awb && !p.awb) p.awb = r._awb;
  });
  Object.values(m).forEach(p => { p.wh=Math.max(0,p.wh); p.svc=Math.max(0,p.svc); });
  return m;
}

// ── Stock per-branch (for "Search by Part Number" view) ────────
function calcStockByBranch(transactions) {
  const m = {};
  transactions.forEach(r => {
    if (!r._key) return;
    const k = `${r._key}::${r._branch}`;
    if (!m[k]) m[k] = {
      code: r._partCode, name: r._partName, branch: r._branch, asc: r._asc,
      wh: 0, svc: 0, consumed: 0, returnedWH: 0,
      monthlyConsumption: {}, lastUsed: null,
    };
    const p = m[k];
    switch (r._sort) {
      case 5:  p.wh  += r._qty; break;
      case 6:  p.wh  -= r._qty; p.svc  += r._qty; break;
      case 8:  p.svc -= r._qty; p.consumed += r._qty;
               if (r._monthKey) p.monthlyConsumption[r._monthKey] = (p.monthlyConsumption[r._monthKey]||0)+r._qty;
               if (!p.lastUsed||(r._date&&r._date>p.lastUsed)) p.lastUsed=r._date;
               break;
      case 10: p.wh += r._qty; p.returnedWH += r._qty; break;
      case 12: p.wh += r._qty; p.returnedWH += r._qty; break;
    }
  });
  Object.values(m).forEach(p => { p.wh=Math.max(0,p.wh); p.svc=Math.max(0,p.svc); });
  return Object.values(m);
}

// ── ABC (based on Sort 8 consumption) ─────────────────────────
function classifyABC(arr) {
  const sorted = [...arr].sort((a,b)=>b.consumed-a.consumed);
  const total  = sorted.reduce((s,p)=>s+p.consumed,0)||1;
  let cum=0;
  sorted.forEach(p=>{ cum+=p.consumed; const r=cum/total; p.abc=r<=.7?'A':r<=.9?'B':'C'; });
  return sorted;
}

// ── Forecast ───────────────────────────────────────────────────
function calcForecast(p, isWarehouse=false) {
  const months = Object.values(p.monthlyConsumption);
  if (!months.length||!months.some(v=>v>0)) return null;
  const avgMonthly = months.reduce((a,b)=>a+b,0)/months.length;
  if (!avgMonthly) return null;
  const availableStock = isWarehouse ? p.wh : p.svc;
  return { avgMonthly, monthsLeft:+(availableStock/avgMonthly).toFixed(1), reorderQty:Math.ceil(avgMonthly*3) };
}

// ── Month label ────────────────────────────────────────────────
function fmtMo(mk) {
  if (!mk) return '—';
  const [y,m]=mk.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]+' '+y;
}

// ── Build Parts Return Summary (Consumed vs Returned) ───────────
function buildPartsReturnSummary(transactions) {
  const partsMap = {};

  transactions.forEach(tx => {
    if (tx._sort !== 8) return;
    if (tx._branch === 'AUX Main WH Stock') return;
    const key = tx._partCode || tx._partName;
    if (!key) return;
    if (!partsMap[key]) {
      partsMap[key] = { code:tx._partCode, name:tx._partName, branch:tx._branch, asc:tx._asc, consumed:0, returned:0 };
    }
    const p = partsMap[key];
    p.consumed += tx._qty;
    p.branch = tx._branch;
    p.asc = tx._asc;
  });

  transactions.forEach(tx => {
    if (tx._sort !== 10 && tx._sort !== 12) return;
    if (tx._branch === 'AUX Main WH Stock') return;
    const key = tx._partCode || tx._partName;
    if (!key) return;
    if (!partsMap[key]) {
      partsMap[key] = { code:tx._partCode, name:tx._partName, branch:tx._branch, asc:tx._asc, consumed:0, returned:0 };
    }
    partsMap[key].returned += tx._qty;
  });

  return Object.values(partsMap).map(p => ({ ...p, remaining:Math.max(0,p.consumed-p.returned) }));
}

// ── Build Part Return Status (Sort 6 → Sort 10 tracking) ────────
function buildPartReturnStatus(transactions) {
  const statusMap = new Map();

  transactions.forEach(tx => {
    if (tx._branch === 'AUX Main WH Stock' && tx._sort >= 6 && tx._sort <= 9) return;
    if (tx._sort < 6 || tx._sort > 10) return;

    if (tx._sort >= 6 && tx._sort <= 9) {
      if (tx._branch === 'AUX Main WH Stock') return;
      const key = `${tx._branch}|${tx._asc}|${tx._partCode || tx._partName}`;
      if (!statusMap.has(key)) {
        statusMap.set(key, {
          code: tx._partCode || '—',
          name: tx._partName || '—',
          branch: tx._branch,
          asc: tx._asc || '—',
          sortStages: { 6:false, 7:false, 8:false, 9:false, 10:false },
          dates: { requestedDate:null, usedDate:null, returnRequestedDate:null, returnReceivedDate:null },
          reference: { returnRequestId:null, returnReceiptId:null }
        });
      }
      const entry = statusMap.get(key);
      if (tx._sort === 6) { entry.sortStages[6]=true; entry.dates.requestedDate=entry.dates.requestedDate||tx._date; }
      if (tx._sort === 7) { entry.sortStages[7]=true; }
      if (tx._sort === 8) { entry.sortStages[8]=true; entry.dates.usedDate=tx._date; }
      if (tx._sort === 9) { entry.sortStages[9]=true; entry.dates.returnRequestedDate=entry.dates.returnRequestedDate||tx._date; entry.reference.returnRequestId=entry.reference.returnRequestId||tx._awb; }
    }
  });

  transactions.forEach(tx => {
    if (tx._sort !== 10) return;
    const partCode = tx._partCode || tx._partName;
    for (const [key, entry] of statusMap.entries()) {
      if ((entry.code === partCode || entry.name === partCode) && entry.sortStages[9]) {
        entry.sortStages[10] = true;
        entry.dates.returnReceivedDate = tx._date;
        entry.reference.returnReceiptId = tx._orderNo;
        break;
      }
    }
  });

  return Array.from(statusMap.values())
    .filter(p => p.sortStages[8]) // ← CRITICAL: Only show parts that have been CONSUMED (Sort 8)
    .map(p => {
      const has = p.sortStages;
      if (has[10]) {
        p.status = 'RETURNED';
        p.displayRef = p.reference.returnReceiptId;
      } else if (has[9]) {
        p.status = 'IN_TRANSIT';
        p.displayRef = p.reference.returnRequestId;
      } else if (has[8]) {
        p.status = 'PENDING_RETURN';
        p.displayRef = null;
      } else {
        p.status = 'UNKNOWN';
        p.displayRef = null;
      }
      return p;
    });
}

// ── Build inventory table rows ─────────────────────────────────
// Changes:
//   • Model search: text input with partial/substring match across all models
//   • In-stock indicator: ✅ badge when p.svc > 0 (replaces plain "+ Request")
function buildInventoryTableRows(partsArr, transactions) {
  // WH stock lookup (Sort 5 only)
  const whStockMap = {};
  transactions.forEach(tx => {
    if (tx._branch === 'AUX Main WH Stock' && tx._sort === 5) {
      if (!whStockMap[tx._key]) whStockMap[tx._key] = 0;
      whStockMap[tx._key] += tx._qty;
    }
  });

  const modelSearch    = (document.getElementById('search-model')?.value    || '').toLowerCase().trim();
  const partCodeSearch = (document.getElementById('search-part-code')?.value || '').toLowerCase().trim();

  // ── MODE A: Search by Part Number → per-branch breakdown ──────
  if (partCodeSearch) {
    const byBranch = calcStockByBranch(transactions)
      .filter(p =>
        (p.code && p.code.toLowerCase().includes(partCodeSearch)) ||
        (p.name && p.name.toLowerCase().includes(partCodeSearch))
      )
      .sort((a,b) => (a.code+a.branch).localeCompare(b.code+b.branch));

    if (byBranch.length === 0) {
      return '<tr><td colspan="10" class="table-empty">No parts found for that part number</td></tr>';
    }

    let lastCode = null;
    return byBranch.map(p => {
      const isWH = p.branch === 'AUX Main WH Stock';
      const f    = calcForecast(p, isWH);
      const sc   = p.svc <= 0 ? 'color-danger' : p.svc < 3 ? 'color-warning' : '';

      // In-stock indicator per branch row
      const reqCell = isWH
        ? '<span style="font-size:11px;color:var(--gray-400)">WH</span>'
        : (p.svc > 0
            ? `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">
                 <span style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:5px;
                        padding:2px 8px;font-size:10px;font-weight:600;white-space:nowrap;display:block">
                   ✅ In Stock (${fmt(p.svc)})
                 </span>
                 <button class="req-btn" onclick="showPartsRequestModal({code:'${esc(p.code)}',name:'${esc(p.name)}'})">
                   + Request More
                 </button>
               </div>`
            : `<button class="req-btn" onclick="showPartsRequestModal({code:'${esc(p.code)}',name:'${esc(p.name)}'})">
                 + Request
               </button>`
          );

      let html = '';
      if (p.code !== lastCode) {
        lastCode = p.code;
        html += `<tr style="background:var(--blue-50,#eff6ff)">
          <td colspan="10" style="padding:6px 10px;font-weight:700;font-size:12px;color:#1e40af;letter-spacing:.5px">
            ${esc(p.code)} — ${esc(p.name)}
          </td></tr>`;
      }
      html += `<tr ${isWH ? 'style="opacity:.75"' : ''}>
        <td style="padding-left:20px">${reqCell}</td>
        <td class="text-sm">${isWH ? '<span class="badge badge-blue">WH</span>' : esc(p.asc||'—')}</td>
        <td class="text-sm fw-600">${isWH ? 'AUX Main Warehouse' : esc(p.branch)}</td>
        <td class="text-mono ${isWH ? 'fw-600' : ''}"><strong>${fmt(isWH ? p.wh : p.svc)}</strong></td>
        <td class="text-mono">${fmt(p.consumed)}</td>
        <td class="text-mono">${fmt(p.returnedWH)}</td>
        <td class="text-mono">${f ? fmt(f.avgMonthly,1) : '—'}</td>
        <td>${f ? `<span class="badge ${f.monthsLeft<1?'badge-red':f.monthsLeft<3?'badge-amber':'badge-green'}">${fmt(f.monthsLeft,1)}mo</span>` : '—'}</td>
        <td></td><td></td>
      </tr>`;
      return html;
    }).join('');
  }

  // ── MODE B: Search by Customer Model — partial/substring match ──
  let filtered = partsArr;

  if (modelSearch) {
    const modelMatchedCodes = new Set();
    const matchedModels     = [];

    // Collect codes from every model whose key contains the typed text
    Object.entries(PARTS_DB.modelMap).forEach(([key, entry]) => {
      if (key.includes(modelSearch)) {
        entry.codes.forEach(c => modelMatchedCodes.add(c));
        matchedModels.push(entry.label);
      }
    });

    if (modelMatchedCodes.size === 0) {
      const modelLoaded = Object.keys(PARTS_DB.modelMap).length > 0;
      return `<tr><td colspan="11" class="table-empty">
        ${modelLoaded
          ? `No models found matching "<strong>${esc(modelSearch)}</strong>" — try "ATW24" or "ATW18"`
          : `Parts Model sheet not loaded yet — try refreshing the page`}
      </td></tr>`;
    }

    filtered = partsArr.filter(p => modelMatchedCodes.has(p.code));

    if (filtered.length === 0) {
      const preview = matchedModels.slice(0,3).join(', ') + (matchedModels.length > 3 ? `… (+${matchedModels.length-3} more)` : '');
      return `<tr><td colspan="11" class="table-empty">
        Found <strong>${matchedModels.length}</strong> model(s) matching
        "<strong>${esc(modelSearch)}</strong>" (${esc(preview)})
        but none of their parts appear in the Transaction sheet yet.
      </td></tr>`;
    }
  }

  // ── Apply metric filter (from card clicks) ─────────────────────
  filtered = applyMetricFilterToInventory(filtered);

  // ── Render rows — show ✅ In SVC Stock badge when p.svc > 0 ──
  return filtered.slice(0, 200).map(p => {
    const f     = calcForecast(p);
    const ac    = p.abc==='A' ? 'badge-red' : p.abc==='B' ? 'badge-amber' : 'badge-gray';
    const whQty = whStockMap[p.code] || 0;
    const wc    = whQty < 5 ? 'color-danger' : whQty < 20 ? 'color-warning' : '';
    const sc    = p.svc <= 0 ? 'color-danger' : p.svc < 3 ? 'color-warning' : '';

    const reqCell = p.svc > 0
      ? `<div style="display:flex;flex-direction:column;gap:3px;align-items:flex-start">
           <span style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:5px;
                  padding:2px 8px;font-size:10px;font-weight:600;white-space:nowrap;display:block;text-align:center">
             ✅ In SVC Stock
           </span>
           <button class="req-btn" onclick="showPartsRequestModal({code:'${esc(p.code)}',name:'${esc(p.name)}'})">
             + Request More
           </button>
         </div>`
      : `<button class="req-btn" onclick="showPartsRequestModal({code:'${esc(p.code)}',name:'${esc(p.name)}'})">
           + Request
         </button>`;

    return `<tr>
      <td>${reqCell}</td>
      <td><span class="badge ${ac}">${p.abc}</span></td>
      <td class="text-mono text-sm">${esc(p.code)}</td>
      <td class="fw-600" style="text-align:left">${esc(truncate(p.name,32))}</td>
      <td class="text-sm">${p.branch==='AUX Main WH Stock' ? 'AUX main warehouse stock' : esc(p.branch)}</td>
      <td class="text-mono ${wc}">${fmt(whQty)}</td>
      <td class="text-mono ${sc}">${fmt(p.svc)}</td>
      <td class="text-mono">${fmt(p.consumed)}</td>
      <td class="text-mono">${fmt(p.returnedWH)}</td>
      <td class="text-mono">${f ? fmt(f.avgMonthly,1) : '—'}</td>
      <td>${f ? `<span class="badge ${f.monthsLeft<1?'badge-red':f.monthsLeft<3?'badge-amber':'badge-green'}">${fmt(f.monthsLeft,1)}mo</span>` : '—'}</td>
    </tr>`;
  }).join('');
}

// ── Filter Full Inventory table (called from both search inputs) ──
async function filterInventory() {
  const tableBody = document.getElementById('inventory-table-body');
  if (!tableBody) return;

  // Ensure parts data is loaded before filtering
  const modelSearch = (document.getElementById('search-model')?.value || '').trim();
  if (modelSearch && !PARTS_DB.loaded) {
    if (PARTS_DB.loading) {
      await new Promise(r => {
        const check = setInterval(() => { if (!PARTS_DB.loading) { clearInterval(check); r(); } }, 100);
      });
    } else {
      await loadPartsData();
    }
  }

  const tx       = getFilteredTx();
  const stockMap = calcStockMap(tx);
  const partsArr = classifyABC(Object.values(stockMap));
  tableBody.innerHTML = buildInventoryTableRows(partsArr, tx);

  // Update thead to match current mode
  const partCodeSearch = (document.getElementById('search-part-code')?.value || '').trim();
  const thead = document.getElementById('inventory-thead');
  if (thead) {
    thead.innerHTML = partCodeSearch
      ? '<tr><th></th><th>ASC</th><th style="text-align:left">Branch</th><th>SVC Stock</th><th>Consumed</th><th>Returned</th><th>Avg/Mo</th><th>Months Left</th><th></th><th></th></tr>'
      : '<tr><th></th><th>ABC</th><th>Code</th><th style="text-align:left">Part Name</th><th>Branch</th><th>WH Stock</th><th>SVC Stock</th><th>Consumed</th><th>Returned</th><th>Avg/Mo</th><th>Months Left</th></tr>';
  }
}
// Backward compat alias
function filterInventoryByModel() { filterInventory(); }

// ── Filter transactions ────────────────────────────────────────
function getFilteredTx() {
  let tx = PARTS_DB.transactions;
  if (!DB.isAdmin && DB.userASC && DB.userASC !== 'All')
    tx = tx.filter(r => r._asc === DB.userASC);
  const co = document.getElementById('filter-company')?.value;
  const br = document.getElementById('filter-branch')?.value;
  if (DB.isAdmin && co) tx = tx.filter(r => r._asc === co);
  if (br) tx = tx.filter(r => r._branch === br);
  return tx;
}

// ── Populate branch filter dropdown ─────────────────────────────
function populateBranchFilter() {
  const select = document.getElementById('filter-branch');
  if (!select) return;

  const branches = new Set();
  PARTS_DB.transactions.forEach(tx => { if (tx._branch) branches.add(tx._branch); });

  const sortedBranches = Array.from(branches).sort((a,b) => {
    if (a === 'AUX Main WH Stock') return -1;
    if (b === 'AUX Main WH Stock') return 1;
    return a.localeCompare(b);
  });

  const currentValue = select.value;
  select.innerHTML = '<option value="">All Branches</option>';
  sortedBranches.forEach(br => {
    const opt = document.createElement('option');
    opt.value = br;
    opt.textContent = br;
    select.appendChild(opt);
  });
  select.value = currentValue;
}

// ── Handle filter changes for Spare Parts page ─────────────────────
function onPartsFilterChange() {
  // When any filter (branch, date, etc.) changes, re-render the parts page
  if (document.getElementById('page-parts')) {
    renderParts();
  }
}

// ── Unified filter change handler for branch filter ─────────────────
// The branch filter is shared across all pages, but has different data formats:
// - Main dashboard: branch format is "City - ASC" (e.g., "Dammam - ZAM")
// - Parts page: branch format is just City (e.g., "Dammam")
// This function routes to the appropriate filter handler based on the current page
function handleBranchFilterChange() {
  const activePage = document.querySelector('.page.active')?.id || currentPage;
  if (activePage === 'page-parts') {
    // For parts page, only re-render parts (don't call global applyFilters which uses different data format)
    onPartsFilterChange();
  } else {
    // For all other pages (main dashboard), apply global filters using applyFilters()
    applyFilters();
  }
}

// ── Filter return status cards ────────────────────────────────────────
let _returnStatusFilterState = { activeStatus: null };
function filterReturnStatus(status) {
  const currentStatus = _returnStatusFilterState.activeStatus;
  // Toggle: click same card again to reset filter
  _returnStatusFilterState.activeStatus = (currentStatus === status) ? null : status;
  updateReturnStatusCardStyles();
  applyReturnStatusFilter();
}

function updateReturnStatusCardStyles() {
  const status = _returnStatusFilterState.activeStatus;
  document.querySelectorAll('.kpi-grid .kpi-card').forEach((card, idx) => {
    const statuses = ['all', 'available', 'pendingReturn', 'inTransit', 'returned'];
    if (statuses[idx] === status) {
      card.style.borderColor = card.classList[1] === 'blue' ? '#003D8F' :
                               card.classList[1] === 'green' ? '#16a34a' :
                               card.classList[1] === 'amber' ? '#d97706' :
                               card.classList[1] === 'orange' ? '#ea580c' : '#0891b2';
      card.style.borderWidth = '2px';
    } else {
      card.style.borderColor = 'transparent';
      card.style.borderWidth = '2px';
    }
  });
}

function applyReturnStatusFilter() {
  const status = _returnStatusFilterState.activeStatus;
  const table = document.querySelector('[data-export-id="return-status-table"]');
  if (!table) return;

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    if (!status) {
      row.style.display = '';
    } else {
      const statusCell = row.cells[3]?.textContent?.trim() || '';
      let matches = false;
      switch(status) {
        case 'available': matches = statusCell === 'AVAILABLE'; break;
        case 'pendingReturn': matches = statusCell === 'PENDING_RETURN'; break;
        case 'inTransit': matches = statusCell === 'IN_TRANSIT'; break;
        case 'returned': matches = statusCell === 'RETURNED'; break;
        case 'all': matches = true; break;
      }
      row.style.display = matches ? '' : 'none';
    }
  });
}

// ── Quick date filter helper ────────────────────────────────────────
function setQuickDateFilter(range) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const date = today.getDate();

  let from, to;

  switch(range) {
    case 'thisMonth':
      from = new Date(year, month, 1);
      to = new Date(year, month + 1, 0); // Last day of current month
      break;
    case 'last30':
      to = new Date(today);
      from = new Date(today.setDate(today.getDate() - 30));
      break;
    case 'ytd':
      from = new Date(year, 0, 1); // January 1
      to = new Date(year, month, date); // Today
      break;
    case 'reset':
      document.getElementById('filter-from').value = '';
      document.getElementById('filter-to').value = '';
      applyFilters();
      onPartsFilterChange();
      return;
    default:
      return;
  }

  // Format dates as YYYY-MM-DD for date input
  const formatDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  };

  document.getElementById('filter-from').value = formatDate(from);
  document.getElementById('filter-to').value = formatDate(to);

  applyFilters();
  onPartsFilterChange();
}

// ── Filter inventory by metric (card click handler) ──────────────────
function filterByMetric(metric) {
  // Toggle metric filter (click again to deactivate)
  if (_metricsFilterState.activeMetric === metric) {
    _metricsFilterState.activeMetric = null;
  } else {
    _metricsFilterState.activeMetric = metric;
  }

  // Re-render to update filtered inventory display and card highlighting
  if (document.getElementById('page-parts')) {
    filterInventory(); // Update inventory table with metric filter
    updateMetricCardStyles(); // Update visual highlighting on cards
  }
}

// ── Update visual highlighting on metric cards ───────────────────────
function updateMetricCardStyles() {
  const cardIds = ['kpi-lowStock', 'kpi-zeroStock', 'kpi-reorderAlert'];
  const metricsMap = {
    'lowStock': 'kpi-lowStock',
    'zeroStock': 'kpi-zeroStock',
    'reorderAlert': 'kpi-reorderAlert'
  };

  for (let metric in metricsMap) {
    const cardEl = document.getElementById(metricsMap[metric]);
    if (cardEl) {
      if (_metricsFilterState.activeMetric === metric) {
        cardEl.style.borderColor = '#003D8F';
        cardEl.style.borderWidth = '2px';
        cardEl.style.boxShadow = '0 0 0 3px rgba(0, 61, 143, 0.1)';
      } else {
        cardEl.style.borderColor = 'transparent';
        cardEl.style.borderWidth = '1px';
        cardEl.style.boxShadow = 'none';
      }
    }
  }
}

// ── Apply metric filter to inventory table ────────────────────────────
function applyMetricFilterToInventory(partsArr) {
  if (!_metricsFilterState.activeMetric) {
    return partsArr; // No filter, return all parts
  }

  const metric = _metricsFilterState.activeMetric;
  return partsArr.filter(p => {
    switch(metric) {
      case 'lowStock':
        return p.svc > 0 && p.svc <= 3; // Parts with low stock at SVC
      case 'zeroStock':
        return p.svc <= 0 && p.consumed > 0; // Parts with zero stock but consumed before
      case 'reorderAlert':
        const f = calcForecast(p);
        return f && f.monthsLeft < 3 && p.svc > 0; // Parts needing reorder
      default:
        return true;
    }
  });
}

// ── populateModelDropdown — kept as no-op (UI now uses text input) ──
function populateModelDropdown() { /* replaced by free-text search */ }

// ── Excel Export Helper ────────────────────────────────────────
function exportTableToExcel(headers, rows, sheetName, filename) {
  // Create cell entries in Excel XML format
  function xesc(v) {
    return String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function cell(v, ci, ri) {
    return '<c r="' + String.fromCharCode(65 + ci) + (ri + 1) + '" t="inlineStr"><is><t>' + xesc(v) + '</t></is></c>';
  }

  // Build all rows with headers first
  const allRows = [headers].concat(rows);

  // Generate worksheet XML
  const sx = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>' +
    allRows.map((row, ri) => {
      return '<row r="' + (ri + 1) + '">' +
        row.map((v, ci) => cell(v, ci, ri)).join('') +
        '</row>';
    }).join('') +
    '</sheetData></worksheet>';

  // Build ZIP structure with all required XLSX files
  const files = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xesc(sheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml': sx
  };

  // Use buildZipStore from pages.js (reuse existing utility)
  const blob = buildZipStore(files, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename + '.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Export Handlers ────────────────────────────────────────────
function exportFullInventory() {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) {
    alert('Inventory table not found');
    return;
  }

  // Get headers from table
  const headers = ['ABC', 'Code', 'Part Name', 'Branch', 'WH Stock', 'SVC Stock', 'Consumed', 'Returned', 'Avg/Mo', 'Months Left'];

  // Get rows from visible table
  const rows = [];
  const trs = tbody.querySelectorAll('tr');
  trs.forEach(tr => {
    // ← CRITICAL: Only export VISIBLE rows (respect applied filters)
    if (tr.style.display === 'none') return;

    const cells = tr.querySelectorAll('td');
    if (cells.length > 0) {
      const row = [];
      cells.forEach((td, idx) => {
        // Skip first column (checkbox/icon)
        if (idx === 0) return;
        // Get text content, removing emojis and badges
        let text = td.textContent.trim();
        // For badge cells, extract the text content only
        const badge = td.querySelector('.badge');
        if (badge) {
          text = badge.textContent.trim();
        }
        row.push(text);
      });
      if (row.length > 0) rows.push(row);
    }
  });

  if (rows.length === 0) {
    alert('No data to export');
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  exportTableToExcel(headers, rows, 'Full Inventory', 'Spare_Parts_Full_Inventory_' + timestamp);
}

function exportBranchStock() {
  const table = document.querySelector('[data-export-id="branch-stock-table"]');
  if (!table) {
    alert('Branch Stock Summary table not found');
    return;
  }

  const headers = ['Branch / Warehouse', 'SKUs', 'SVC Stock', 'Low (≤3)', 'Out of Stock', 'Consumed', 'Health'];
  const rows = [];

  table.querySelectorAll('tbody tr').forEach(tr => {
    // ← CRITICAL: Only export VISIBLE rows (respect applied filters)
    if (tr.style.display === 'none') return;

    const cells = tr.querySelectorAll('td');
    if (cells.length > 0) {
      const row = [];
      cells.forEach(td => {
        let text = td.textContent.trim();
        const badge = td.querySelector('.badge');
        if (badge) {
          text = badge.textContent.trim();
        }
        row.push(text);
      });
      rows.push(row);
    }
  });

  if (rows.length === 0) {
    alert('No data to export (may be filtered)');
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  exportTableToExcel(headers, rows, 'Branch Stock', 'Spare_Parts_Branch_Stock_' + timestamp);
}

function exportReturnStatus() {
  const table = document.querySelector('[data-export-id="return-status-table"]');
  if (!table) {
    alert('Return Status table not found');
    return;
  }

  const headers = ['Location', 'Part Code', 'Part Name', 'Status', 'Request Date', 'Used Date', 'Return Request Date', 'Return Received Date'];
  const rows = [];

  table.querySelectorAll('tbody tr').forEach(tr => {
    // ← CRITICAL: Only export VISIBLE rows (respect applied filters)
    if (tr.style.display === 'none') return;

    const cells = tr.querySelectorAll('td');
    if (cells.length > 0) {
      const row = [];
      cells.forEach(td => {
        let text = td.textContent.trim();
        const badge = td.querySelector('.badge');
        if (badge) {
          text = badge.textContent.trim();
        }
        row.push(text);
      });
      rows.push(row);
    }
  });

  if (rows.length === 0) {
    alert('No data to export (may be filtered)');
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const activeFilter = _returnStatusFilterState.activeStatus;
  const filterSuffix = activeFilter ? `_${activeFilter}` : '';
  exportTableToExcel(headers, rows, 'Return Status', 'Spare_Parts_Return_Status_' + timestamp + filterSuffix);
}

// ── Render Spare Parts Page ────────────────────────────────────
async function renderParts() {
  const el = document.getElementById('page-parts');
  if (!el) return;

  el.innerHTML = `<div style="padding:60px;text-align:center;color:var(--gray-400)">
    <div class="spinner" style="margin:0 auto 16px;width:32px;height:32px;border-width:3px"></div>
    Loading spare parts data…</div>`;

  if (!PARTS_DB.loaded) await loadPartsData();
  if (!PARTS_DB.loaded) {
    el.innerHTML = `<div class="insight-card" style="background:#fee2e2;border-color:#dc2626">
      <div class="insight-icon" style="color:#dc2626;font-size:20px">⚠️</div>
      <div class="insight-text"><div class="insight-title" style="color:#dc2626">Cannot load Parts data</div>
      Ensure Google Sheet is shared publicly. ID: ${CONFIG.PARTS_SHEET_ID}</div></div>`;
    return;
  }

  populateBranchFilter();
  const tx       = getFilteredTx();
  const stockMap = calcStockMap(tx);
  const partsArr = classifyABC(Object.values(stockMap));

  // ── KPIs ──────────────────────────────────────────────────
  const totalSKUs    = partsArr.length;
  const totalStock   = partsArr.reduce((s,p) => s+p.wh+p.svc, 0);
  const svcStock     = partsArr.reduce((s,p) => s+p.svc, 0);
  const consumed     = partsArr.reduce((s,p) => s+p.consumed, 0);
  const returnedWH   = partsArr.reduce((s,p) => s+p.returnedWH, 0);
  const lowStock     = partsArr.filter(p => p.svc>0 && p.svc<=3).length;
  const zeroStock    = partsArr.filter(p => p.svc<=0 && p.consumed>0).length;
  const reorderAlert = partsArr.filter(p => { const f=calcForecast(p); return f&&f.monthsLeft<3&&p.svc>0; }).length;

  const aCount = partsArr.filter(p => p.abc==='A').length;
  const bCount = partsArr.filter(p => p.abc==='B').length;
  const cCount = partsArr.filter(p => p.abc==='C').length;

  // ── Monthly usage last 6 months ──────────────────────────
  const now  = new Date();
  const last6 = Array.from({length:6}, (_,i) => {
    const d  = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
    const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return { mk, label:fmtMo(mk), qty:tx.filter(r=>r._sort===8&&r._monthKey===mk).reduce((s,r)=>s+r._qty,0) };
  });

  // ── Top 10 consumed ──────────────────────────────────────
  const topParts = partsArr.filter(p => p.consumed>0).slice(0,10);

  // ── Branch summary ────────────────────────────────────────
  const brMap = {};
  partsArr.forEach(p => {
    const b = p.branch||'Unknown';
    if (!brMap[b]) brMap[b] = { branch:b, skus:0, balance:0, low:0, zero:0, usage:0 };
    brMap[b].skus++;
    brMap[b].balance += p.wh+p.svc;
    brMap[b].usage   += p.consumed;
    if (p.svc>0&&p.svc<=3) brMap[b].low++;
    if (p.svc<=0&&p.consumed>0) brMap[b].zero++;
  });
  const branchSummary = Object.values(brMap).sort((a,b) => b.balance-a.balance);

  // ── Reorder list ──────────────────────────────────────────
  const reorderList = partsArr
    .map(p => ({...p, forecast:calcForecast(p)}))
    .filter(p => p.forecast && p.forecast.monthsLeft<3 && p.svc>0)
    .sort((a,b) => a.forecast.monthsLeft-b.forecast.monthsLeft)
    .slice(0,25);

  // ── Parts Return Summary ──────────────────────────────────
  const partsReturnSummary  = buildPartsReturnSummary(tx);
  const partsWithRemaining  = partsReturnSummary.filter(p => p.remaining>0);
  const partsReturnTotals   = {
    consumed:    partsWithRemaining.reduce((s,p)=>s+(p.consumed||0),0),
    returned:    partsWithRemaining.reduce((s,p)=>s+(p.returned||0),0),
    outstanding: partsWithRemaining.reduce((s,p)=>s+(p.remaining||0),0),
  };

  // ── Part Return Status Tracking ───────────────────────────
  const returnStatusList = buildPartReturnStatus(tx).filter(p => p.status !== 'UNKNOWN');
  const statusCounts = {
    AVAILABLE:      returnStatusList.filter(p=>p.status==='AVAILABLE').length,
    PENDING_RETURN: returnStatusList.filter(p=>p.status==='PENDING_RETURN').length,
    IN_TRANSIT:     returnStatusList.filter(p=>p.status==='IN_TRANSIT').length,
    RETURNED:       returnStatusList.filter(p=>p.status==='RETURNED').length,
  };
  const totalReturn = Object.values(statusCounts).reduce((a,b)=>a+b,0);

  el.innerHTML = `
  <!-- HEADER -->
  <div class="insight-card" style="background:linear-gradient(135deg,#001A47,#003D8F);border:none;margin-bottom:18px">
    <div class="insight-icon" style="background:rgba(255,255,255,.15);color:white;font-size:20px">🔩</div>
    <div class="insight-text" style="color:white">
      <div class="insight-title" style="color:white;font-size:15px">Spare Parts Management</div>
      <span style="color:rgba(255,255,255,.75);font-size:12px">
        ${totalSKUs} SKUs · ${fmt(totalStock)} total stock · ${tx.length} transactions
      </span>
    </div>
    <button onclick="PARTS_DB.loaded=false;renderParts()"
      style="background:rgba(255,255,255,.15);color:white;border:1px solid rgba(255,255,255,.3);
             border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px">⟳ Refresh</button>
  </div>

  <!-- LIVE TRACKER -->
  <div class="section-header" style="cursor:pointer"
       onclick="document.getElementById('tracker-body').style.display=document.getElementById('tracker-body').style.display==='none'?'block':'none'">
    <div class="section-title">Shipment Live Tracking</div>
  </div>
  <div id="tracker-body" class="chart-card" style="margin-bottom:18px">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <input id="track-order" class="filter-input" type="text" placeholder="e.g. GD20260503308847"
        style="flex:1;min-width:160px;color:#000;font-family:var(--mono)" oninput="previewTracking(this.value)">
      <input id="track-awb" class="filter-input" type="text" placeholder="e.g. 215957Q173"
        style="flex:1;min-width:140px;color:#000;font-family:var(--mono)" oninput="previewTracking(this.value)">
      ${DB.isAdmin ? `<button onclick="saveAndTrack()" class="export-btn excel" style="padding:7px 16px;height:38px">💾 Save &amp; Track</button>` : ''}
      <button onclick="doTrackOnly()" class="export-btn pptx" style="padding:7px 16px;height:38px">🔍 Track</button>
    </div>
    <div id="tracking-result"
      style="margin-top:12px;padding:12px;background:var(--gray-50);border-radius:var(--r-md);font-size:12px;color:var(--gray-500);min-height:48px">
      Enter a tracking number above to see live shipment status.
    </div>
  </div>

  <!-- KPI CARDS -->
  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:18px">
    <div class="kpi-card accent">
      <div class="kpi-label">TOTAL SKUs</div>
      <div class="kpi-value">${fmt(totalSKUs)}</div>
      <div class="kpi-delta">Unique parts</div>
    </div>
    <div class="kpi-card blue">
      <div class="kpi-label">TOTAL STOCK</div>
      <div class="kpi-value">${fmt(totalStock)}</div>
      <div class="kpi-delta">All branches + WH</div>
    </div>
    <div id="kpi-lowStock" class="kpi-card ${lowStock>0?'amber':'green'}"
         style="cursor:pointer;transition:all 0.2s ease;user-select:none"
         onclick="filterByMetric('lowStock')"
         onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 16px rgba(0,0,0,0.15)'"
         onmouseout="this.style.transform='translateY(0)';this.style.boxShadow=''">
      <div class="kpi-label">LOW STOCK</div>
      <div class="kpi-value">${fmt(lowStock)}</div>
      <div class="kpi-delta">≤ 3 units SVC</div>
    </div>
    <div id="kpi-zeroStock" class="kpi-card ${zeroStock>0?'red':'green'}"
         style="cursor:pointer;transition:all 0.2s ease;user-select:none"
         onclick="filterByMetric('zeroStock')"
         onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 16px rgba(0,0,0,0.15)'"
         onmouseout="this.style.transform='translateY(0)';this.style.boxShadow=''">
      <div class="kpi-label">OUT OF STOCK</div>
      <div class="kpi-value">${fmt(zeroStock)}</div>
      <div class="kpi-delta">SVC balance = 0</div>
    </div>
    <div id="kpi-reorderAlert" class="kpi-card ${reorderAlert>0?'amber':'green'}"
         style="cursor:pointer;transition:all 0.2s ease;user-select:none"
         onclick="filterByMetric('reorderAlert')"
         onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 16px rgba(0,0,0,0.15)'"
         onmouseout="this.style.transform='translateY(0)';this.style.boxShadow=''">
      <div class="kpi-label">REORDER ALERT</div>
      <div class="kpi-value">${fmt(reorderAlert)}</div>
      <div class="kpi-delta">&lt; 3 months stock</div>
    </div>
  </div>

  <!-- ROW: Reorder Alert + Pending Status Board -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
    <div class="chart-card">
      <div class="chart-card-header">
        <div><div class="chart-card-title">Reorder alert — months of SVC stock</div></div>
      </div>
      <div id="reorder-bars" style="padding:4px 0">
        ${reorderList.slice(0,6).map(p => {
          const f=p.forecast, ml=f.monthsLeft;
          const col = ml<1?'#E24B4A':ml<3?'#EF9F27':'#1D9E75';
          const pct = Math.min(ml/8*100,100).toFixed(1);
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <div style="font-size:11px;color:var(--gray-600);width:100px;flex-shrink:0;text-align:right;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(truncate(p.name,14))}</div>
            <div style="flex:1;background:var(--gray-100);border-radius:2px;height:14px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${col};border-radius:2px"></div>
            </div>
            <div style="font-size:11px;font-family:var(--mono);width:40px;color:${col}">${fmt(ml,1)}mo</div>
          </div>`;
        }).join('')}
        ${reorderList.length===0 ? '<div style="font-size:12px;color:var(--gray-400);padding:1rem 0">✅ All parts have sufficient stock</div>' : ''}
        <div style="display:flex;gap:10px;margin-top:10px;font-size:10px">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:#E24B4A;border-radius:2px"></span>Critical &lt;1mo</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:#EF9F27;border-radius:2px"></span>Low 1–3mo</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:#1D9E75;border-radius:2px"></span>OK &gt;3mo</span>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header">
        <div><div class="chart-card-title">Pending part requests — status board</div></div>
      </div>
      <div id="parts-status-board">${buildPendingBoard()}</div>
    </div>
  </div>

  <!-- CHARTS ROW -->
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-card-header"><div>
        <div class="chart-card-title">Monthly Usage (last 6 months)</div>
        <div class="chart-card-sub">Sort 8 — Part Used by Tech</div>
      </div></div>
      <div class="chart-wrap"><canvas id="ch-pm" role="img" aria-label="Monthly parts consumption">Monthly consumption.</canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div>
        <div class="chart-card-title">ABC Classification</div>
        <div class="chart-card-sub">By Sort 8 consumption</div>
      </div></div>
      <div class="chart-wrap"><canvas id="ch-abc" role="img" aria-label="ABC donut">ABC donut.</canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Top 10 Consumed Parts</div></div></div>
      <div class="chart-wrap tall"><canvas id="ch-top" role="img" aria-label="Top consumed parts">Top parts.</canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Stock Balance by Branch</div></div></div>
      <div class="chart-wrap tall"><canvas id="ch-br" role="img" aria-label="Branch stock">Branch stock.</canvas></div>
    </div>
  </div>

  <!-- BRANCH STOCK SUMMARY -->
  <div class="section-header">
    <div class="section-title">Branch Stock Summary</div>
    <span class="section-badge" style="font-size:11px;font-weight:400">SVC = Service Center Stock</span>
    <button onclick="exportBranchStock()" class="export-btn excel" style="padding:7px 16px;height:36px;font-size:12px;margin-left:auto">📊 Export Excel</button>
  </div>
  <div class="table-card" style="margin-bottom:18px">
    <div class="table-scroll"><table class="data-table" data-export-id="branch-stock-table">
      <thead><tr>
        <th style="text-align:left">BRANCH / WAREHOUSE</th>
        <th>SKUs</th><th>SVC Stock</th><th>Low (≤3)</th>
        <th>Out of Stock</th><th>Consumed</th><th>HEALTH</th>
      </tr></thead>
      <tbody>${branchSummary.map(b => {
        const cls = b.zero>5?'badge-red':b.low>3?'badge-amber':'badge-green';
        const lbl = b.zero>5?'⚠️ Critical':b.low>3?'🟡 Watch':'✅ Good';
        return `<tr>
          <td class="fw-600" style="text-align:left">${esc(b.branch)}</td>
          <td class="text-mono">${b.skus}</td>
          <td class="text-mono fw-600">${fmt(b.balance)}</td>
          <td class="text-mono ${b.low>0?'color-warning':''}">${b.low}</td>
          <td class="text-mono ${b.zero>0?'color-danger':''}">${b.zero}</td>
          <td class="text-mono">${fmt(b.usage)}</td>
          <td><span class="badge ${cls}">${lbl}</span></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>

  <!-- RETURN STATUS KPIs - Interactive -->
  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:18px">
    <div class="kpi-card blue" onclick="filterReturnStatus('all')" style="cursor:pointer;transition:all 0.2s;border:2px solid transparent" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(0,61,143,0.2)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
      <div class="kpi-label">TOTAL TRACKED</div>
      <div class="kpi-value">${fmt(totalReturn)}</div>
      <div class="kpi-delta">Parts in return cycle</div>
    </div>
    <div class="kpi-card green" onclick="filterReturnStatus('available')" style="cursor:pointer;transition:all 0.2s;border:2px solid transparent" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(22,163,74,0.2)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
      <div class="kpi-label">AVAILABLE</div>
      <div class="kpi-value">${fmt(statusCounts.AVAILABLE)}</div>
      <div class="kpi-delta">Not yet consumed</div>
    </div>
    <div class="kpi-card amber" onclick="filterReturnStatus('pendingReturn')" style="cursor:pointer;transition:all 0.2s;border:2px solid transparent" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(217,119,6,0.2)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
      <div class="kpi-label">PENDING RETURN</div>
      <div class="kpi-value">${fmt(statusCounts.PENDING_RETURN)}</div>
      <div class="kpi-delta">Consumed, awaiting return</div>
    </div>
    <div class="kpi-card orange" onclick="filterReturnStatus('inTransit')" style="cursor:pointer;transition:all 0.2s;border:2px solid transparent" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(239,159,39,0.2)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
      <div class="kpi-label">IN TRANSIT</div>
      <div class="kpi-value">${fmt(statusCounts.IN_TRANSIT)}</div>
      <div class="kpi-delta">Return requested, pending receipt</div>
    </div>
    <div class="kpi-card teal" onclick="filterReturnStatus('returned')" style="cursor:pointer;transition:all 0.2s;border:2px solid transparent" onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 4px 12px rgba(8,145,178,0.2)'" onmouseout="this.style.transform='scale(1)';this.style.boxShadow='none'">
      <div class="kpi-label">RETURNED</div>
      <div class="kpi-value">${fmt(statusCounts.RETURNED)}</div>
      <div class="kpi-delta">Return cycle complete</div>
    </div>
  </div>

  <!-- PART RETURN STATUS TRACKING -->
  <div class="section-header">
    <div class="section-title">📦 Part Return Status Tracking</div>
    <span class="section-badge">SVC Centers Return Cycle</span>
    <button onclick="exportReturnStatus()" class="export-btn excel" style="padding:7px 16px;height:36px;font-size:12px;margin-left:auto">📊 Export Excel</button>
  </div>
  <div class="table-card" style="margin-bottom:18px">
    <div class="table-scroll"><table class="data-table" data-export-id="return-status-table">
      <thead><tr>
        <th>Location (Branch - ASC)</th>
        <th style="text-align:left">Part Code</th>
        <th style="text-align:left">Part Name</th>
        <th>Status</th>
        <th style="font-size:11px">Request Date</th>
        <th style="font-size:11px">Used Date</th>
        <th style="font-size:11px">Return Requested</th>
        <th style="font-size:11px">Return Received</th>
        <th style="font-size:11px">Return Ref</th>
      </tr></thead>
      <tbody>
        ${returnStatusList.length === 0
          ? '<tr><td colspan="9" class="table-empty">No parts in return tracking</td></tr>'
          : returnStatusList.map(p => {
              const fmtDate = d => {
                if (!d) return '—';
                if (typeof d === 'string') return d;
                try { return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
                catch(e) { return '—'; }
              };
              const loc = p.asc ? `${p.branch} - ${p.asc}` : p.branch;
              const sCol = p.status==='RETURNED'?'#1D9E75':p.status==='IN_TRANSIT'?'#EF9F27':p.status==='PENDING_RETURN'?'#E24B4A':'#0891B2';
              return `<tr>
                <td class="fw-600 text-mono">${esc(loc)}</td>
                <td class="text-mono" style="text-align:left">${esc(p.code)}</td>
                <td style="text-align:left">${esc(p.name)}</td>
                <td><span style="background:${sCol};color:white;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600">${p.status}</span></td>
                <td style="font-size:11px;color:var(--gray-600)">${fmtDate(p.dates.requestedDate)}</td>
                <td style="font-size:11px;color:var(--gray-600)">${fmtDate(p.dates.usedDate)}</td>
                <td style="font-size:11px;color:var(--gray-600)">${fmtDate(p.dates.returnRequestedDate)}</td>
                <td style="font-size:11px;color:var(--gray-600)">${fmtDate(p.dates.returnReceivedDate)}</td>
                <td style="font-size:11px;font-family:var(--mono);color:var(--aux-blue);font-weight:600">${p.displayRef||'—'}</td>
              </tr>`;
            }).join('')}
      </tbody>
    </table></div>
  </div>

  <!-- REORDER ALERT TABLE -->
  ${reorderList.length > 0 ? `
  <div class="section-header">
    <div class="section-title">🚨 Reorder Alert — Parts Needing Restock</div>
    <span class="section-badge">${reorderList.length} parts</span>
  </div>
  <div class="table-card" style="margin-bottom:18px">
    <div class="table-scroll"><table class="data-table">
      <thead><tr>
        <th>ABC</th><th>Code</th><th style="text-align:left">Part Name</th>
        <th>Branch</th><th>SVC Stock</th><th>Avg/Month</th>
        <th>Months Left</th><th>Reorder Qty</th><th>Priority</th><th></th>
      </tr></thead>
      <tbody>${reorderList.map(p => {
        const f=p.forecast, ml=f.monthsLeft;
        const urg = ml<1?'🔴 Urgent':ml<2?'🟠 High':'🟡 Medium';
        const cls = ml<1?'badge-red':ml<2?'badge-amber':'badge-blue';
        const ac  = p.abc==='A'?'badge-red':p.abc==='B'?'badge-amber':'badge-gray';
        return `<tr>
          <td><span class="badge ${ac}">${p.abc}</span></td>
          <td class="text-mono text-sm">${esc(p.code)}</td>
          <td class="fw-600" style="text-align:left">${esc(truncate(p.name,35))}</td>
          <td class="text-sm">${p.branch==='AUX Main WH Stock'?'AUX main warehouse stock':esc(p.branch)}</td>
          <td class="text-mono ${p.svc<=3?'color-danger':'fw-600'}">${p.svc}</td>
          <td class="text-mono">${fmt(f.avgMonthly,1)}</td>
          <td><span class="badge ${cls}">${fmt(ml,1)}mo</span></td>
          <td class="text-mono fw-600" style="color:var(--aux-blue)">${f.reorderQty}</td>
          <td>${urg}</td>
          <td><button class="req-btn" onclick="showPartsRequestModal({code:'${esc(p.code)}',name:'${esc(p.name)}'})">+ Request</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>` : ''}

  <!-- FULL INVENTORY — ABC Analysis -->
  <div class="section-header">
    <div class="section-title">Full Inventory — ABC Analysis</div>
    <span class="section-badge">${totalSKUs} SKUs</span>
    <button onclick="exportFullInventory()" class="export-btn excel" style="padding:7px 16px;height:36px;font-size:12px;margin-left:auto">📊 Export Excel</button>
  </div>

  <!-- Search controls -->
  <div style="margin-bottom:15px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div>
      <label style="display:block;font-size:11px;font-weight:600;color:var(--gray-500);margin-bottom:4px;
                    text-transform:uppercase;letter-spacing:.5px">
        Search by Customer Model
      </label>
      <div style="position:relative">
        <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none">🔍</span>
        <input type="text" id="search-model" class="filter-input"
               placeholder="Type model e.g. ATW24, ATW18, ATW24A2DI-CSA…"
               style="width:100%;padding:10px 12px 10px 34px;border:1px solid var(--gray-300);
                      border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box"
               oninput="filterInventory()">
      </div>
      <div style="font-size:10px;color:var(--gray-400);margin-top:3px">
        Results update as you type — partial match supported
      </div>
    </div>
    <div>
      <label style="display:block;font-size:11px;font-weight:600;color:var(--gray-500);margin-bottom:4px;
                    text-transform:uppercase;letter-spacing:.5px">
        Search by Part Number → per branch
      </label>
      <div style="position:relative">
        <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none">🔍</span>
        <input type="text" id="search-part-code" class="filter-input"
               placeholder="e.g. 11223003000465"
               style="width:100%;padding:10px 12px 10px 34px;border:1px solid var(--gray-300);
                      border-radius:6px;font-size:13px;font-family:inherit;box-sizing:border-box;
                      font-family:var(--mono)"
               oninput="filterInventory()">
      </div>
    </div>
  </div>

  <div class="table-card">
    <div class="table-scroll"><table class="data-table">
      <thead id="inventory-thead">
        <tr>
          <th></th><th>ABC</th><th>Code</th>
          <th style="text-align:left">Part Name</th><th>Branch</th>
          <th>WH Stock</th><th>SVC Stock</th>
          <th>Consumed</th><th>Returned</th><th>Avg/Mo</th><th>Months Left</th>
        </tr>
      </thead>
      <tbody id="inventory-table-body">
        ${buildInventoryTableRows(partsArr, tx)}
      </tbody>
    </table></div>
  </div>`;

  // ── Charts ──────────────────────────────────────────────
  barChart('ch-pm', last6.map(m=>m.label),
    [{label:'Qty Used', data:last6.map(m=>m.qty), backgroundColor:CONFIG.COLORS.BLUE}],
    {plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}});

  donutChart('ch-abc', ['Class A','Class B','Class C'], [aCount,bCount,cCount],
    {plugins:{legend:{position:'right'}}});

  hBarChart('ch-top',
    topParts.map(p => truncate(p.name||p.code,22)),
    topParts.map(p => p.consumed),
    topParts.map(p => p.abc==='A'?CONFIG.COLORS.RED:p.abc==='B'?CONFIG.COLORS.AMBER:CONFIG.COLORS.GRAY),
    {plugins:{legend:{display:false}}});

  hBarChart('ch-br',
    branchSummary.slice(0,12).map(b => truncate(b.branch,20)),
    branchSummary.slice(0,12).map(b => b.balance),
    CONFIG.COLORS.BLUE,
    {plugins:{legend:{display:false}}});
}

// ── Tracking ───────────────────────────────────────────────────
function previewTracking(v) {
  if (!v||v.length<5) return;
  const el = document.getElementById('tracking-result');
  if (el) el.innerHTML = `<span style="font-size:12px;color:var(--gray-500)">Press Track · </span>` +
    `<a href="${trackingUrl(v)}" target="_blank" style="color:var(--aux-blue);font-size:12px;font-weight:600">Open SMSA ↗</a>`;
}

function doTrackOnly() {
  const awb = (document.getElementById('track-awb')?.value || document.getElementById('track-order')?.value || '').trim();
  if (!awb) { alert('Enter a tracking number first.'); return; }
  showTrackingFrame(awb);
}

async function saveAndTrack() {
  const orderNo = (document.getElementById('track-order')?.value||'').trim();
  const awb     = (document.getElementById('track-awb')?.value||'').trim();
  if (!awb) { alert('Enter a tracking number (AWB) first.'); return; }
  if (!DB.isAdmin) { alert('Admin access required to save tracking numbers.'); return; }
  if (HEARTBEAT_URL) {
    try {
      await fetch(HEARTBEAT_URL, {
        method:'POST', mode:'no-cors',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          action:'parts_request', sheet:CONFIG.PARTS_SHEET,
          orderNumber:orderNo, awb, requestDate:new Date().toISOString().split('T')[0],
          finalStatus:'Shipped', requestedBy:_currentEmail||'—', asc:_currentASC||'—',
        })
      });
    } catch(e) { console.warn(e); }
  }
  showTrackingFrame(awb);
}

function showTrackingFrame(awb) {
  const url = trackingUrl(awb);
  const el  = document.getElementById('tracking-result');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <span class="text-mono fw-600" style="color:var(--aux-blue)">${esc(awb)}</span>
      <span class="badge badge-blue">● Live</span>
      <a href="${url}" target="_blank"
         style="margin-left:auto;background:var(--aux-blue);color:white;padding:5px 14px;
                border-radius:8px;font-size:12px;font-weight:600;text-decoration:none">
        Open SMSA Tracking ↗
      </a>
    </div>
    <iframe src="${url}" width="100%" height="420"
      style="border:none;border-radius:var(--r-md);display:block" loading="lazy"
      title="SMSA Tracking ${esc(awb)}">
    </iframe>`;
}

// ── partsStatusCell (Daily Operations) ────────────────────────
function partsStatusCell(r) {
  const C = CONFIG.COLS;
  const reason = (r[C.RESCHED_REASON]||r._rescheduleReason||'').toLowerCase();
  const supp   = (r[C.RESCHED_SUPP] ||r._rescheduleRemark ||'').toLowerCase();
  const needsPart = reason.includes('accessor')||reason.includes('spare')||
                    reason.includes('part')    ||reason.includes('قطعة')||
                    supp.includes('accessor')  ||supp.includes('spare')||supp.includes('part');
  if (!needsPart) return '<span style="color:var(--gray-200);font-size:11px">—</span>';

  const ticketNo = (r[C.TICKET_NUM]||'').trim();
  const branch   = r._branch||'';

  let trackingAWB = null;
  if (PARTS_REQUESTS.length) {
    const m = PARTS_REQUESTS.find(p => (p['Order Number']||'').trim() === ticketNo);
    if (m) trackingAWB = (m['AWB']||'').trim();
  }
  if (!trackingAWB && PARTS_DB.loaded) {
    const tx = PARTS_DB.transactions.find(p => p._sort===8 && (p[CONFIG.PARTS_COLS.ORDER_NO]||'').trim()===ticketNo);
    if (tx && tx._awb) trackingAWB = tx._awb;
  }

  if (trackingAWB) {
    return `<span class="badge badge-blue" style="cursor:pointer;font-size:10px"
      onclick="showTrackingFrame('${esc(trackingAWB)}')" title="AWB: ${esc(trackingAWB)}">
      📦 Track ${esc(trackingAWB.substring(0,10))}…</span>`;
  }

  const desc = truncate(r[C.MAINTENANCE]||supp||'Part required', 40);
  return `<button onclick="openPartsRequestFromTicket('${esc(ticketNo)}','${esc(branch)}','${esc(desc)}')"
    style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;
           padding:3px 8px;font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font)">
    🔩 Request Part</button>`;
}

// ── Open modal from ticket ─────────────────────────────────────
function openPartsRequestFromTicket(ticketNo, branch, partDesc) {
  showPartsRequestModal({code:'', name:partDesc||'Part required', prefilledOrderNo:ticketNo, prefilledBranch:branch});
}

// ── Full parts request modal ───────────────────────────────────
function showPartsRequestModal(opts) {
  opts = opts || {};
  document.getElementById('parts-modal-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'parts-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;border:.5px solid #e5e7eb;padding:1.5rem;width:520px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:.5px solid #f3f4f6">
        <div style="font-size:15px;font-weight:600;color:#111">🔩 Request Spare Part</div>
        <button onclick="document.getElementById('parts-modal-overlay').remove()"
          style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1">×</button>
      </div>
      <div style="display:grid;gap:12px">
        <div>
          <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">Part Name / Description</label>
          <input id="pm-part-name" value="${esc(opts.name||'')}" type="text" placeholder="Part name or description"
            style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000;font-family:sans-serif">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">Part Number (Accessory Code)</label>
            <input id="pm-part-code" value="${esc(opts.code||'')}" type="text" placeholder="e.g. 11220500000418"
              style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000;font-family:monospace">
          </div>
          <div>
            <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">Quantity</label>
            <input id="pm-qty" value="1" type="number" min="1"
              style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div style="position:relative">
            <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">
              Model Number <span style="color:#dc2626;font-weight:700">*</span>
            </label>
            <input id="pm-model" value="${esc(opts.model||'')}" type="text" placeholder="e.g. ATW24" autocomplete="off"
              style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000;font-family:monospace">
            <div id="pm-model-dropdown"
              style="position:absolute;top:100%;left:0;right:0;background:#fff;border:.5px solid #d1d5db;border-top:none;
                     border-radius:0 0 8px 8px;max-height:200px;overflow-y:auto;z-index:1000;display:none;
                     box-shadow:0 4px 6px rgba(0,0,0,.1)"></div>
          </div>
          <div>
            <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">Serial Number (optional)</label>
            <input id="pm-serial" value="" type="text" placeholder="Optional"
              style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000;font-family:monospace">
          </div>
        </div>
        <div>
          <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">
            Order Number <span style="color:#dc2626">*</span>
            ${opts.prefilledOrderNo ? '<span style="color:#16a34a;font-size:10px">(auto-filled from ticket)</span>' : ''}
          </label>
          <input id="pm-order-no" value="${esc(opts.prefilledOrderNo||'')}" type="text" placeholder="GD2026…"
            style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;
                   background:#fff;color:${opts.prefilledOrderNo?'#16a34a':'#000'};font-family:monospace">
        </div>
        <div>
          <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">Branch</label>
          <input id="pm-branch" value="${esc(opts.prefilledBranch||'')}" type="text" placeholder="e.g. Jizan - Classic"
            style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000">
        </div>
        <div>
          <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">Notes (optional)</label>
          <textarea id="pm-notes" rows="2" placeholder="Additional details for parts supervisor…"
            style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000;resize:vertical"></textarea>
        </div>
        <div style="background:#f0fdf4;border:.5px solid #bbf7d0;border-radius:8px;padding:10px 12px;font-size:11px;color:#166534">
          ✅ Request saved to <strong>Parts sheet</strong> + email sent to parts supervisor
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1.25rem;padding-top:1rem;border-top:.5px solid #f3f4f6">
        <button onclick="document.getElementById('parts-modal-overlay').remove()"
          style="background:#f9fafb;border:.5px solid #d1d5db;border-radius:8px;padding:8px 18px;font-size:12px;cursor:pointer;color:#374151">Cancel</button>
        <button onclick="submitPartsRequest()"
          style="background:#003D8F;color:white;border:none;border-radius:8px;padding:8px 20px;font-size:12px;font-weight:600;cursor:pointer">📤 Send Request</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setupModelAutocomplete();
}

// ── Model autocomplete (in request modal) ─────────────────────
function setupModelAutocomplete() {
  const modelInput = document.getElementById('pm-model');
  const dropdown   = document.getElementById('pm-model-dropdown');
  if (!modelInput || !dropdown) return;

  modelInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 2) { dropdown.style.display = 'none'; return; }

    try {
      const modelsUrl = `${HEARTBEAT_URL}?action=models&query=${encodeURIComponent(query)}`;
      const resp = await fetch(modelsUrl);
      const data = await resp.json();
      const models = data.models || [];
      if (models.length === 0) { dropdown.style.display = 'none'; return; }

      dropdown.innerHTML = models.map(m => `
        <div style="padding:12px;border-bottom:.5px solid #f0f0f0;cursor:pointer;font-size:12px;
                    color:#374151;font-family:monospace;background:#f9fafb;transition:.15s"
          onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background='#f9fafb'"
          onclick="loadPartsForModel('${esc(m.model)}')">
          <div style="font-weight:600;color:#003D8F">${esc(m.model)}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:3px">Click to view all parts for this model</div>
        </div>
      `).join('');
      dropdown.style.display = 'block';
    } catch(err) {
      dropdown.innerHTML = `<div style="padding:8px 12px;color:#dc2626;font-size:12px">❌ Error: ${err.message}</div>`;
      dropdown.style.display = 'block';
    }
  });

  document.addEventListener('click', e => {
    if (!modelInput.contains(e.target) && !dropdown.contains(e.target)) dropdown.style.display = 'none';
  });
}

// ── Load and display all parts for a model (request modal) ─────
async function loadPartsForModel(modelName) {
  const modelInput = document.getElementById('pm-model');
  const dropdown   = document.getElementById('pm-model-dropdown');
  modelInput.value = modelName.trim();

  try {
    const partsUrl = `${HEARTBEAT_URL}?action=parts_for_model&query=${encodeURIComponent(modelName)}`;
    const resp = await fetch(partsUrl);
    const data = await resp.json();
    const parts = data.parts || [];

    if (parts.length === 0) {
      dropdown.innerHTML = `<div style="padding:12px;color:#9ca3af;font-size:12px">No parts found for this model</div>`;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = `
      <div style="padding:8px 12px;background:#003D8F;color:white;font-size:11px;font-weight:600;border-bottom:1px solid #e5e7eb">
        ${parts.length} parts available for ${modelName}
      </div>` +
      parts.map(p => `
        <div style="padding:10px 12px;border-bottom:.5px solid #f0f0f0;cursor:pointer;font-size:12px;color:#374151;transition:.15s"
          onmouseover="this.style.background='#E6F1FB'" onmouseout="this.style.background='white'"
          onclick="selectPart('${esc(p.partNumber)}','${esc(p.partDescription)}')">
          <div style="font-weight:600;font-family:monospace;color:#003D8F">${esc(p.partNumber)}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">${esc(p.partDescription)}</div>
        </div>
      `).join('');
    dropdown.style.display = 'block';
  } catch(err) {
    dropdown.innerHTML = `<div style="padding:8px 12px;color:#dc2626;font-size:12px">❌ Error: ${err.message}</div>`;
    dropdown.style.display = 'block';
  }
}

// ── Select a part and auto-fill fields ─────────────────────────
function selectPart(partNumber, partDescription) {
  document.getElementById('pm-part-code').value = partNumber;
  document.getElementById('pm-part-name').value = partDescription;
  document.getElementById('pm-model-dropdown').style.display = 'none';
}

// ── Get TO and CC emails from Access sheet ─────────────────────
async function getBranchEmailList(branchName) {
  try {
    const url  = sheetUrl(CONFIG.ACCESS_SHEET);
    const resp = await fetch(url);
    if (!resp.ok) return { toEmails:[], ccEmails:[], ascName:null };
    const rows = parseCSV(await resp.text());

    const branchCol = 'If Branch has pending';
    const emailCol  = 'Email';
    const ascCol    = 'ASC';

    let toEmails = [], ccEmails = [], ascName = null;

    const normalizeRowBranch = raw => {
      if (!raw.includes(' - ')) return raw;
      const city    = normalizeCityName(raw.split(' - ')[0].trim());
      const company = raw.split(' - ').slice(1).join(' - ').trim();
      return `${city} - ${company}`;
    };

    for (const row of rows) {
      const rowBranch = normalizeRowBranch((row[branchCol]||'').trim());
      const email = (row[emailCol]||'').trim();
      if (rowBranch.toLowerCase() === branchName.toLowerCase()) {
        if (email) toEmails.push(email);
        if (!ascName) ascName = (row[ascCol]||'').trim();
      }
    }

    if (toEmails.length === 0) {
      for (const row of rows) {
        const rowBranch = (row[branchCol]||'').trim();
        const email = (row[emailCol]||'').trim();
        if (email && rowBranch.toLowerCase() === branchName.toLowerCase()) {
          toEmails.push(email);
          if (!ascName) ascName = (row[ascCol]||'').trim();
        }
      }
    }

    for (const row of rows) {
      const rowBranch = (row[branchCol]||'').trim();
      const email = (row[emailCol]||'').trim();
      if (email && !toEmails.includes(email)) {
        if (ascName && rowBranch.toLowerCase() === (ascName + ' CC').toLowerCase()) {
          ccEmails.push(email);
        } else if (rowBranch.toLowerCase() === 'always cc') {
          ccEmails.push(email);
        }
      }
    }

    return { toEmails, ccEmails, ascName };
  } catch(err) {
    console.error('getBranchEmailList error:', err);
    return { toEmails:[], ccEmails:[], ascName:null };
  }
}

// ── Submit request ─────────────────────────────────────────────
async function submitPartsRequest() {
  const orderNo    = (document.getElementById('pm-order-no')?.value  ||'').trim();
  const partName   = (document.getElementById('pm-part-name')?.value ||'').trim();
  const partCode   = (document.getElementById('pm-part-code')?.value ||'').trim();
  const qty        = (document.getElementById('pm-qty')?.value       ||'1').trim();
  const branch     = (document.getElementById('pm-branch')?.value    ||'').trim();
  const notes      = (document.getElementById('pm-notes')?.value     ||'').trim();
  const model      = (document.getElementById('pm-model')?.value     ||'').trim();
  const serialNum  = (document.getElementById('pm-serial')?.value    ||'').trim();

  if (!orderNo) { alert('Order Number is required (GD…)'); return; }
  if (!partName && !partCode) { alert('Please enter part name or part number.'); return; }
  if (!model) {
    const modelEl = document.getElementById('pm-model');
    if (modelEl) {
      modelEl.style.border = '2px solid #dc2626';
      modelEl.style.background = '#fff5f5';
      modelEl.focus();
      modelEl.addEventListener('input', () => {
        modelEl.style.border = '.5px solid #d1d5db';
        modelEl.style.background = '#fff';
      }, {once:true});
    }
    alert('⚠️ Model Number is required.\nPlease enter the customer model (e.g. ATW18A2DI-CSA).');
    return;
  }

  const requestDate = new Date().toISOString().split('T')[0];
  logActivity(`Parts Request — Order:${orderNo} Part:${partName||partCode} Branch:${branch}`);

  PENDING_BOARD.unshift({
    id:'REQ-'+Date.now().toString().slice(-4),
    orderNo, part:partName||partCode, code:partCode,
    branch, qty, status:'pending',
    time:new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), awb:'',
    model, serialNumber:serialNum,
  });

  const ascCode = (branch||'').split('-').pop().trim();

  if (HEARTBEAT_URL) {
    try {
      const payload = {
        action:'parts_request', sheet:CONFIG.PARTS_SHEET,
        orderNumber:orderNo, partNumber:partCode, partDesc:partName,
        model, serialNumber:serialNum, awb:'',
        requestDate, dispatchDate:'', receivingDate:'', finalStatus:'Pending',
        branch, qty, notes,
        requestedBy:_currentEmail||'—', asc:ascCode||'—',
      };
      await fetch(HEARTBEAT_URL, {
        method:'POST', mode:'no-cors',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
    } catch(e) {
      console.error('Parts sheet write error:', e.message);
      alert(`⚠️ Error sending to sheet: ${e.message}`);
    }
  }

  const emailData = await getBranchEmailList(branch);
  const uniqueTO  = [...new Set(emailData.toEmails)].filter(e=>e);
  const uniqueCC  = [...new Set(emailData.ccEmails)].filter(e=>e);
  const to  = uniqueTO.join(',') || 'arslan.s@auxair.com';
  const cc  = encodeURIComponent(uniqueCC.join(';'));
  const sub = encodeURIComponent(`Parts Request — ${orderNo} — ${branch}`);
  const body = encodeURIComponent(
    `Dear Parts Team,\n\nNew spare part request:\n\n` +
    `Order Number : ${orderNo}\nBranch       : ${branch}\nASC          : ${emailData.ascName||'—'}\n` +
    `Part Name    : ${partName}\nPart Number  : ${partCode}\nQuantity     : ${qty}\n` +
    `Model        : ${model||'—'}\nSerial Number: ${serialNum||'—'}\nNotes        : ${notes||'—'}\n` +
    `Requested By : ${_currentEmail||'AUX ASC Dashboard'}\nDate         : ${requestDate}\n\n` +
    `Please process and update AWB in the Parts sheet.\n\nAUX ASC Dashboard — Created by Moahed Younes`
  );
  window.open(`mailto:${to}?cc=${cc}&subject=${sub}&body=${body}`, '_blank');
  document.getElementById('parts-modal-overlay')?.remove();
  alert(`✅ Request submitted!\n\nOrder: ${orderNo}\nPart: ${partName||partCode}`);
}

// ── Reminder email ─────────────────────────────────────────────
async function sendPartsReminder(ticketNo, branch, partDesc) {
  const emailData = await getBranchEmailList(branch);
  const uniqueTO  = [...new Set(emailData.toEmails)].filter(e=>e);
  const uniqueCC  = [...new Set(emailData.ccEmails)].filter(e=>e);
  const to  = uniqueTO.join(',') || 'arslan.s@auxair.com';
  const cc  = encodeURIComponent(uniqueCC.join(';'));
  const sub = encodeURIComponent(`Parts Status Update Needed — ${ticketNo} — ${branch}`);
  const body = encodeURIComponent(
    `Dear Parts Team,\n\nFollow-up reminder for pending spare part request.\n\n` +
    `Order Number : ${ticketNo}\nBranch       : ${branch}\nASC          : ${emailData.ascName||'—'}\n` +
    `Part Required: ${partDesc}\nRequested By : ${_currentEmail||'AUX ASC Dashboard'}\n` +
    `Date         : ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}\n\n` +
    `Please provide a status update — has it been shipped? What is the AWB?\n\n` +
    `AUX ASC Dashboard — Created by Moahed Younes`
  );
  window.open(`mailto:${to}?cc=${cc}&subject=${sub}&body=${body}`, '_blank');
  logActivity(`Parts Reminder — ${ticketNo} · ${branch}`);
}

// ── EXPORT: Parts Return Summary to CSV ────────────────────────
async function doExcelExportPartsReturn() {
  if (!PARTS_DB.loaded) await loadPartsData();
  const tx      = getFilteredTx();
  const summary = buildPartsReturnSummary(tx);
  const filtered = summary.filter(p => p.remaining>0);
  const totals   = {
    consumed:    filtered.reduce((s,p)=>s+(p.consumed||0),0),
    returned:    filtered.reduce((s,p)=>s+(p.returned||0),0),
    outstanding: filtered.reduce((s,p)=>s+(p.remaining||0),0),
  };
  const asc     = DB.userASC || 'AUX';
  const dateStr = new Date().toISOString().split('T')[0];

  let csv = `"DEFECTIVE PARTS RETURN SUMMARY"\n`;
  csv += `"Service Center (ASC)","${asc}"\n`;
  csv += `"Report Date","${dateStr}"\n`;
  csv += `"Key Metrics"\n`;
  csv += `"Total Consumed",${totals.consumed}\n`;
  csv += `"Total Returned",${totals.returned}\n`;
  csv += `"Outstanding",${totals.outstanding}\n`;
  csv += `\n"Code (Branch)","Part Code","Part Name","Consumed","Returned","Remaining"\n`;
  filtered.forEach(p => {
    csv += `"${p.branch||'—'} - ${p.code||'—'}","${p.code||'—'}","${p.name||'—'}",${p.consumed},${p.returned},${p.remaining}\n`;
  });
  csv += `"","TOTAL","",${totals.consumed},${totals.returned},${totals.outstanding}\n`;

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `AUX_${asc}_Parts_Return_${dateStr}.csv`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  logActivity(`CSV Export — Parts Return Summary · ${asc}`);
}

// ── req-btn style ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const s = document.createElement('style');
  s.textContent = `
    .req-btn {
      background:var(--gray-50,#f9fafb);
      border:.5px solid var(--gray-200,#e5e7eb);
      border-radius:5px;
      padding:3px 9px;
      font-size:10px;
      font-weight:500;
      cursor:pointer;
      color:var(--gray-500,#6b7280);
      font-family:var(--font,sans-serif);
      white-space:nowrap;
      transition:.15s;
    }
    .req-btn:hover {
      background:#E6F1FB;
      border-color:#85B7EB;
      color:#0C447C;
    }
  `;
  document.head.appendChild(s);
});

// ── In-memory pending board ────────────────────────────────────
const PENDING_BOARD = []; // {id, part, code, branch, qty, status, time, orderNo}

function buildPendingBoard() {
  const all = [...PENDING_BOARD];
  if (PARTS_REQUESTS.length) {
    PARTS_REQUESTS.forEach(r => {
      const id = r['Order Number'] || '';
      if (id && !all.find(x => x.orderNo === id)) {
        const finalStatus = (r['Final Status']||'Pending').toLowerCase();
        let status = 'pending';
        if (finalStatus.includes('receiv'))                              status = 'received';
        else if (finalStatus.includes('dispatched'))                     status = 'dispatched';
        else if (finalStatus.includes('unavailable')||finalStatus.includes('not available')) status = 'unavailable';
        else if (finalStatus.includes('sent'))                           status = 'sent';
        all.push({
          id:     'REQ-'+id.slice(-4),
          orderNo:id,
          part:   r['Part Description']||r['Part Number']||'—',
          code:   r['Part Number']||'',
          branch: r['Branch']||'—',
          qty:    r['Qty']||'1',
          status,
          time:   r['Request Date']||'—',
          awb:    r['AWB']||'',
        });
      }
    });
  }

  let filtered = all;
  if (!DB.isAdmin && DB.userASC && DB.userASC !== 'All') {
    filtered = all.filter(item => {
      const ascFromBranch = (item.branch||'').split('-').pop().trim();
      return ascFromBranch === DB.userASC;
    });
  }

  if (!filtered.length) return '<div style="font-size:12px;color:var(--gray-400);padding:.5rem 0">No pending part requests</div>';

  const sMap = {
    pending:     { cls:'badge-gray',  lbl:'Under Process',          btnLabel:'Update Status', action:'pending'  },
    dispatched:  { cls:'badge-blue',  lbl:'Dispatched',             btnLabel:'Mark Received', action:'received' },
    sent:        { cls:'badge-blue',  lbl:'Dispatched',             btnLabel:'Mark Received', action:'received' },
    unavailable: { cls:'badge-red',   lbl:'Part Not Available',     btnLabel:null,            action:null       },
    received:    { cls:'badge-green', lbl:'Available in SVC Stock', btnLabel:null,            action:null       },
  };

  return filtered.slice(0,8).map((o,i) => {
    const sm      = sMap[o.status] || sMap.pending;
    const nextBtn = sm.action
      ? `<button onclick="showStatusModal('${o.id}','${o.orderNo}')"
           style="background:var(--gray-50);border:.5px solid var(--gray-200);border-radius:8px;
                  padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap">
           ${sm.btnLabel}</button>` : '';
    return `<div style="padding:10px 0;border-bottom:.5px solid var(--gray-100);display:flex;gap:10px;align-items:flex-start" id="board-row-${i}">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;line-height:1.3">
          ${esc(truncate(o.part,28))} · <span style="font-family:var(--mono);font-size:11px;color:var(--gray-400)">${esc(o.code)}</span>
        </div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:3px">${esc(o.branch)} · Qty: ${o.qty}</div>
        <div style="font-size:11px;color:var(--gray-600);font-family:monospace;margin-top:2px;font-weight:600">${esc(o.orderNo||o.id)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${sm.cls}" style="font-size:10px">${sm.lbl}</span>
          <span style="font-size:10px;color:var(--gray-400);font-family:var(--mono)">${esc(o.time)}</span>
        </div>
        ${nextBtn}
        ${o.awb ? `<button onclick="showTrackingFrame('${esc(o.awb)}')"
          style="background:#E6F1FB;border:.5px solid #85B7EB;border-radius:6px;
                 padding:4px 10px;font-size:10px;font-weight:600;cursor:pointer;color:#0C447C">
          📦 Track ${esc(o.awb.slice(0,10))}</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ── Show status update modal ───────────────────────────────────
function showStatusModal(orderId, orderNo) {
  let currentStatus = 'pending';
  let o = PENDING_BOARD.find(x => x.id === orderId);

  if (!o && PARTS_REQUESTS) {
    const r = PARTS_REQUESTS?.find(x => x['Order Number'] &&
      String(x['Order Number']).trim().slice(-4) === orderId.slice(-4));
    if (r) {
      const fs = (r['Final Status']||'').toLowerCase();
      currentStatus = fs.includes('receiv')?'received':fs.includes('dispatched')?'dispatched':fs.includes('unavailable')?'unavailable':'pending';
    }
  } else if (o) {
    currentStatus = o.status || 'pending';
  }

  const overlay = document.createElement('div');
  overlay.id = 'status-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9001;display:flex;align-items:center;justify-content:center;padding:20px';

  let buttonHTML = '';
  if (currentStatus === 'pending') {
    buttonHTML = `
      <button onclick="updateOrderStatus('${orderId}','dispatched')"
        style="background:#003D8F;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        📦 Dispatched<br><span style="font-size:11px;opacity:.9">Parts shipped to branch</span>
      </button>
      <button onclick="updateOrderStatus('${orderId}','received')"
        style="background:#16a34a;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ✅ Available in SVC Stock<br><span style="font-size:11px;opacity:.9">Parts already at branch</span>
      </button>
      <button onclick="updateOrderStatus('${orderId}','unavailable')"
        style="background:#dc2626;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ❌ Part Not Available<br><span style="font-size:11px;opacity:.9">Part is not available</span>
      </button>
      <button onclick="editOrderRequest('${orderId}')"
        style="background:#8B5CF6;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ✏️ Modify<br><span style="font-size:11px;opacity:.9">Edit request details</span>
      </button>`;
  } else if (currentStatus === 'dispatched') {
    buttonHTML = `
      <button onclick="updateOrderStatus('${orderId}','received')"
        style="background:#16a34a;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ✅ Available in SVC Stock<br><span style="font-size:11px;opacity:.9">Parts received at branch</span>
      </button>
      <button onclick="updateOrderStatus('${orderId}','unavailable')"
        style="background:#dc2626;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ❌ Part Not Available<br><span style="font-size:11px;opacity:.9">Part is not available</span>
      </button>
      <button onclick="editOrderRequest('${orderId}')"
        style="background:#8B5CF6;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ✏️ Modify<br><span style="font-size:11px;opacity:.9">Edit request details</span>
      </button>`;
  } else if (currentStatus === 'received') {
    buttonHTML = `
      <button onclick="editOrderRequest('${orderId}')"
        style="background:#8B5CF6;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ✏️ Modify<br><span style="font-size:11px;opacity:.9">Edit request details</span>
      </button>
      <div style="font-size:13px;color:#6b7280;padding:12px;background:#f3f4f6;border-radius:8px;margin-top:10px">
        Status: <strong>Available in SVC Stock</strong>
      </div>`;
  } else {
    buttonHTML = `<div style="font-size:13px;color:#6b7280;padding:12px;background:#f3f4f6;border-radius:8px">
      Status: <strong>Part Not Available</strong><br><span style="font-size:11px">Request has been closed.</span>
    </div>`;
  }

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;border:.5px solid #e5e7eb;padding:1.5rem;width:420px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="font-size:15px;font-weight:600;color:#111;margin-bottom:1rem">Update Part Request Status</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:1.5rem">Order: <span style="font-family:monospace;font-weight:600">${esc(orderNo)}</span></div>
      <div style="display:flex;flex-direction:column;gap:10px">${buttonHTML}</div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:.5px solid #f3f4f6">
        <button onclick="document.getElementById('status-modal-overlay').remove()"
          style="background:#f9fafb;border:.5px solid #d1d5db;border-radius:8px;padding:8px 18px;font-size:12px;cursor:pointer;color:#374151">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Update order status ────────────────────────────────────────
function updateOrderStatus(orderId, newStatus) {
  document.getElementById('status-modal-overlay')?.remove();

  let o = PENDING_BOARD.find(x => x.id === orderId);
  let isNewToMemory = false;

  if (!o) {
    const r = PARTS_REQUESTS?.find(x => x['Order Number'] &&
      String(x['Order Number']).trim().slice(-4) === orderId.slice(-4));
    if (!r) return;
    const fs = (r['Final Status']||'').toLowerCase();
    o = {
      id:orderId,
      orderNo:      String(r['Order Number']||'').trim(),
      part:         r['Part Description']||r['Part Number']||'—',
      code:         r['Part Number']||'',
      branch:       r['Branch']||'—',
      qty:          r['Qty']||'1',
      status:       fs.includes('receiv')?'received':fs.includes('dispatched')?'dispatched':fs.includes('unavailable')?'unavailable':'pending',
      time:         r['Request Date']||'—',
      awb:          r['AWB']||'',
      model:        r['Model']||'',
      serialNumber: r['Serial Number']||'',
      notes:        r['Notes']||'',
      asc:          r['ASC']||'—',
    };
    isNewToMemory = true;
  }

  if (newStatus === 'dispatched') {
    const awb = prompt('Enter tracking number (AWB):', o.awb||'');
    if (awb === null) return;
    const v = awb.trim();
    if (!v) { alert('Tracking number (AWB) is required.'); return; }
    o.awb = v;
  }

  o.status = newStatus;
  o.time   = 'Just now';
  if (isNewToMemory) PENDING_BOARD.unshift(o);

  const ascCode     = (o.branch||'').split('-').pop().trim();
  const statusText  = newStatus==='received'?'Received':newStatus==='dispatched'?'Dispatched':newStatus==='unavailable'?'Part Not Available':'Pending';
  const today       = new Date().toLocaleDateString('en-GB');
  const dispatchDate  = newStatus==='dispatched' ? today : '';
  const receivingDate = newStatus==='received'   ? today : '';

  // Send status update email
  (async () => {
    const emailData = await getBranchEmailList(o.branch);
    const uniqueTO  = [...new Set(emailData.toEmails)].filter(e=>e);
    const uniqueCC  = [...new Set(emailData.ccEmails)].filter(e=>e);
    const to  = uniqueTO.join(',') || 'arslan.s@auxair.com';
    const cc  = encodeURIComponent(uniqueCC.join(';'));
    const sub = encodeURIComponent(`Parts Status Update — ${o.orderNo} — ${statusText}`);
    const body = encodeURIComponent(
      `Dear Branch Team,\n\nParts request status update:\n\n` +
      `Order Number : ${o.orderNo}\nBranch       : ${o.branch}\nASC          : ${emailData.ascName||'—'}\n` +
      `Status       : ${statusText}\nPart Name    : ${o.part}\nPart Number  : ${o.code}\n` +
      `Quantity     : ${o.qty}\nAWB/Tracking : ${o.awb||'—'}\n` +
      (dispatchDate  ? `Dispatch Date : ${dispatchDate}\n` : '') +
      (receivingDate ? `Receiving Date: ${receivingDate}\n` : '') +
      `Updated By   : ${_currentEmail||'AUX ASC Dashboard'}\nDate         : ${new Date().toLocaleDateString('en-GB')}\n\n` +
      (statusText==='Dispatched' ? 'Parts have been dispatched. Please track using the AWB provided above.\n\n' : '') +
      (statusText==='Received'   ? 'Parts have been received at the branch.\n\n' : '') +
      (statusText==='Part Not Available' ? 'This part is not available. Please contact the parts supervisor.\n\n' : '') +
      `AUX ASC Dashboard — Created by Moahed Younes`
    );
    window.open(`mailto:${to}?cc=${cc}&subject=${sub}&body=${body}`, '_blank');
  })();

  if (HEARTBEAT_URL && o.orderNo) {
    fetch(HEARTBEAT_URL, {
      method:'POST', mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        action:'parts_request', sheet:CONFIG.PARTS_SHEET,
        orderNumber:o.orderNo, partNumber:o.code||'', partDesc:o.part||'',
        model:o.model||'', serialNumber:o.serialNumber||'', awb:o.awb||'',
        requestDate:o.time||'', dispatchDate, receivingDate,
        finalStatus:statusText, branch:o.branch||'—',
        qty:o.qty||'', notes:o.notes||'',
        requestedBy:_currentEmail||'—', asc:ascCode||'—',
      })
    }).catch(() => {});
  }

  const board = document.getElementById('parts-status-board');
  if (board) board.innerHTML = buildPendingBoard();
}

// ── Edit / Modify order request ────────────────────────────────
function editOrderRequest(orderId) {
  document.getElementById('status-modal-overlay')?.remove();

  let o = PENDING_BOARD.find(x => x.id === orderId);
  if (!o && PARTS_REQUESTS) {
    const r = PARTS_REQUESTS?.find(x => x['Order Number'] &&
      String(x['Order Number']).trim().slice(-4) === orderId.slice(-4));
    if (r) {
      const fs = (r['Final Status']||'').toLowerCase();
      o = {
        id:orderId,
        orderNo:      String(r['Order Number']||'').trim(),
        part:         r['Part Description']||r['Part Number']||'—',
        code:         r['Part Number']||'',
        branch:       r['Branch']||'—',
        qty:          r['Qty']||'1',
        status:       fs.includes('receiv')?'received':fs.includes('dispatched')?'dispatched':fs.includes('unavailable')?'unavailable':'pending',
        time:         r['Request Date']||'—',
        awb:          r['AWB']||'',
        model:        r['Model']||'',
        serialNumber: r['Serial Number']||'',
        notes:        r['Notes']||'',
        asc:          r['ASC']||'—',
      };
    }
  }
  if (!o) return;

  const overlay = document.createElement('div');
  overlay.id = 'edit-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9001;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;border:.5px solid #e5e7eb;padding:1.5rem;width:480px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="font-size:15px;font-weight:600;color:#111;margin-bottom:1.5rem">Modify Part Request</div>
      <div style="display:flex;flex-direction:column;gap:15px">
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Order Number</label>
          <input type="text" id="edit-orderNo" value="${esc(o.orderNo)}"
            style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-family:monospace;font-size:13px" disabled>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Part Number</label>
          <input type="text" id="edit-code" value="${esc(o.code)}"
            style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Part Description</label>
          <input type="text" id="edit-part" value="${esc(o.part)}"
            style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Model <span style="color:#dc2626">*</span></label>
          <input type="text" id="edit-model" value="${esc(o.model)}"
            style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px" placeholder="Required">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Serial Number</label>
          <input type="text" id="edit-serialNumber" value="${esc(o.serialNumber)}"
            style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Quantity</label>
            <input type="number" id="edit-qty" value="${esc(o.qty)}"
              style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px">
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Branch</label>
            <input type="text" id="edit-branch" value="${esc(o.branch)}"
              style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px" disabled>
          </div>
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">AWB / Tracking Number</label>
          <input type="text" id="edit-awb" value="${esc(o.awb)}"
            style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px"
            placeholder="Leave empty if not yet dispatched">
        </div>
        <div>
          <label style="display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:6px">Notes</label>
          <textarea id="edit-notes"
            style="width:100%;padding:8px;border:.5px solid #d1d5db;border-radius:6px;font-size:13px;min-height:60px;font-family:inherit"
            placeholder="Additional notes">${esc(o.notes)}</textarea>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:.5px solid #f3f4f6">
        <button onclick="document.getElementById('edit-modal-overlay').remove()"
          style="background:#f9fafb;border:.5px solid #d1d5db;border-radius:8px;padding:8px 18px;font-size:12px;cursor:pointer;color:#374151">Cancel</button>
        <button onclick="saveEditedOrder('${orderId}')"
          style="background:#003D8F;color:white;border:none;border-radius:8px;padding:8px 18px;font-size:12px;font-weight:600;cursor:pointer">Save Changes</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Save edited order ──────────────────────────────────────────
function saveEditedOrder(orderId) {
  const code         = document.getElementById('edit-code')?.value.trim()         || '';
  const part         = document.getElementById('edit-part')?.value.trim()         || '';
  const qty          = document.getElementById('edit-qty')?.value.trim()          || '';
  const awb          = document.getElementById('edit-awb')?.value.trim()          || '';
  const model        = document.getElementById('edit-model')?.value.trim()        || '';
  const serialNumber = document.getElementById('edit-serialNumber')?.value.trim() || '';
  const notes        = document.getElementById('edit-notes')?.value.trim()        || '';

  if (!model) {
    alert('⚠️ Model field is mandatory. Please enter the customer model before saving.');
    document.getElementById('edit-model').style.borderColor = '#dc2626';
    return;
  }
  document.getElementById('edit-model').style.borderColor = '#d1d5db';

  let o = PENDING_BOARD.find(x => x.id === orderId);
  if (!o) {
    const r = PARTS_REQUESTS?.find(x => x['Order Number'] &&
      String(x['Order Number']).trim().slice(-4) === orderId.slice(-4));
    if (r) {
      const fs = (r['Final Status']||'').toLowerCase();
      o = {
        id:orderId,
        orderNo:      String(r['Order Number']||'').trim(),
        part:         r['Part Description']||r['Part Number']||'—',
        code:         r['Part Number']||'',
        branch:       r['Branch']||'—',
        qty:          r['Qty']||'1',
        status:       fs.includes('receiv')?'received':fs.includes('dispatched')?'dispatched':fs.includes('unavailable')?'unavailable':'pending',
        time:         r['Request Date']||'—',
        awb:          r['AWB']||'',
        model:        r['Model']||'',
        serialNumber: r['Serial Number']||'',
        notes:        r['Notes']||'',
        asc:          r['ASC']||'—',
      };
      PENDING_BOARD.push(o);
    }
  }
  if (!o) return;

  const originalRequestDate = o.time && o.time !== 'Just now' ? o.time : '';

  o.code         = code         || o.code;
  o.part         = part         || o.part;
  o.qty          = qty          || o.qty;
  o.awb          = awb;
  o.model        = model;
  o.serialNumber = serialNumber;
  o.notes        = notes;
  o.time         = 'Just now';

  document.getElementById('edit-modal-overlay')?.remove();
  const board = document.getElementById('parts-status-board');
  if (board) board.innerHTML = buildPendingBoard();

  if (HEARTBEAT_URL) {
    const finalStatus = o.status==='received'?'Received':o.status==='dispatched'?'Dispatched':o.status==='unavailable'?'Part Not Available':'Pending';
    const payload = {
      action:'parts_request', sheet:CONFIG.PARTS_SHEET,
      orderNumber:o.orderNo, partNumber:o.code||'', partDesc:o.part||'',
      model:o.model||'', serialNumber:o.serialNumber||'', awb:o.awb||'',
      requestDate:originalRequestDate, dispatchDate:'', receivingDate:'',
      finalStatus, branch:o.branch||'—', qty:o.qty||'', notes:o.notes||'',
      requestedBy:_currentEmail||'—', asc:o.asc||'—',
    };
    fetch(HEARTBEAT_URL, {
      method:'POST', mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload),
    }).catch(e => console.error('Modify sheet write error:', e));
    console.log('Order modify sent to sheet:', payload);
    logActivity(`Parts Modified — Order:${o.orderNo} Part:${o.code} Model:${o.model} Qty:${o.qty} AWB:${o.awb||'—'}`);
  }
}

// ── Expose functions to global scope for onclick handlers ────────────
window.filterReturnStatus = filterReturnStatus;
window.updateReturnStatusCardStyles = updateReturnStatusCardStyles;
window.applyReturnStatusFilter = applyReturnStatusFilter;
window.setQuickDateFilter = setQuickDateFilter;
window.handleBranchFilterChange = handleBranchFilterChange;

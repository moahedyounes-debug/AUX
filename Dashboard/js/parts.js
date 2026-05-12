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

const PARTS_DB = { transactions:[], loaded:false, loading:false };
let   PARTS_REQUESTS = []; // loaded from Parts tab in main sheet

// ── Load ───────────────────────────────────────────────────────
async function loadPartsData() {
  if (PARTS_DB.loading) return;
  PARTS_DB.loading = true;
  try {
    const [txResp, reqResp] = await Promise.all([
      fetch(partsSheetUrl(CONFIG.PARTS_TRANSACTION)),
      fetch(sheetUrl(CONFIG.PARTS_SHEET)).catch(()=>null),
    ]);
    if (!txResp.ok) throw new Error('Cannot load Transaction sheet');
    PARTS_DB.transactions = parseCSV(await txResp.text()).map(enrichTransaction);
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

  // Detect if this is warehouse stock (has Warehouse Name field = central AUX warehouse)
  const warehouseName = (r[C.WAREHOUSE] || '').trim().toLowerCase();
  const isWarehouse = warehouseName && (warehouseName.includes('warehouse') || warehouseName.includes('riyadh'));

  r._branch  = isWarehouse ? 'AUX Main WH Stock' : ((r[C.BRANCH] || r[C.BRANCH2] || '').trim() || 'Unknown');
  // Warehouse transactions should not have ASC; clear it for warehouse
  r._asc     = isWarehouse ? '' : ((r[C.ASC] || r[C.ASC2] || '').trim());
  // Part name: prefer Part Name, fallback to Second Part Name
  r._partName = ((r[C.PART_NAME]||'').trim() || (r[C.PART_NAME2]||'').trim() || (r[C.ACC_NAME]||'').trim());
  r._partCode = ((r[C.ACC_CODE]||'').trim()  || (r[C.CODE]||'').trim() || (r[C.CODE2]||'').trim());
  r._key     = r._partCode || r._partName;
  r._awb     = (r[C.REF] || '').trim();
  r._monthKey = r._date
    ? `${r._date.getFullYear()}-${String(r._date.getMonth()+1).padStart(2,'0')}` : '';

  // ── Map explicit transaction type from Sort column ──
  // Enables part loaner tracking: Part Request → Used → Return
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
// Returns map: key → { code, name, branch, asc, wh, svc, consumed, returnedWH, awb, monthlyConsumption }
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
      case 5:  p.wh  += r._qty; break;                  // +WH
      case 6:  p.wh  -= r._qty; p.svc  += r._qty; break; // WH→SVC
      case 8:  p.svc -= r._qty; p.consumed += r._qty;    // consumed
               if (r._monthKey) {
                 p.monthlyConsumption[r._monthKey] = (p.monthlyConsumption[r._monthKey]||0)+r._qty;
               }
               if (!p.lastUsed||(r._date&&r._date>p.lastUsed)) p.lastUsed=r._date;
               break;
      case 10: p.wh  += r._qty; p.returnedWH += r._qty; break; // used return→WH
      case 12: p.wh  += r._qty; p.returnedWH += r._qty; break; // new return→WH
    }
    if (r._awb && !p.awb) p.awb = r._awb;
  });
  // Clamp negatives (data quality)
  Object.values(m).forEach(p => { p.wh=Math.max(0,p.wh); p.svc=Math.max(0,p.svc); });
  return m;
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
function calcForecast(p) {
  const months = Object.values(p.monthlyConsumption);
  if (!months.length||!months.some(v=>v>0)) return null;
  const avgMonthly = months.reduce((a,b)=>a+b,0)/months.length;
  if (!avgMonthly) return null;
  return { avgMonthly, monthsLeft:+(p.svc/avgMonthly).toFixed(1), reorderQty:Math.ceil(avgMonthly*3) };
}

// ── Month label ────────────────────────────────────────────────
function fmtMo(mk) {
  if (!mk) return '—';
  const [y,m]=mk.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m)-1]+' '+y;
}

// ── Build Parts Return Summary (Consumed vs Returned) ───────────
// Groups parts and tracks: consumed (Sort 8), returned (Sort 10,12), remaining
// NOTE: Only tracks consumption at service centers (not AUX Main WH Stock - warehouse doesn't consume)
function buildPartsReturnSummary(transactions) {
  const partsMap = {};

  // First pass: collect consumption data (Sort 8) from service centers only
  transactions.forEach(tx => {
    if (tx._sort !== 8) return; // Only process consumed transactions
    if (tx._branch === 'AUX Main WH Stock') return; // Skip warehouse

    const key = tx._partCode || tx._partName;
    if (!key) return;

    if (!partsMap[key]) {
      partsMap[key] = {
        code: tx._partCode,
        name: tx._partName,
        branch: tx._branch,
        asc: tx._asc,
        consumed: 0,
        returned: 0,
      };
    }

    const p = partsMap[key];
    p.consumed += tx._qty;
    // Update branch/asc from this consumption transaction
    p.branch = tx._branch;
    p.asc = tx._asc;
  });

  // Second pass: collect return data (Sort 10, 12) from service centers only
  // and update branch/asc if part wasn't in first pass
  transactions.forEach(tx => {
    if (tx._sort !== 10 && tx._sort !== 12) return; // Only process return transactions
    if (tx._branch === 'AUX Main WH Stock') return; // Skip warehouse

    const key = tx._partCode || tx._partName;
    if (!key) return;

    if (!partsMap[key]) {
      partsMap[key] = {
        code: tx._partCode,
        name: tx._partName,
        branch: tx._branch,
        asc: tx._asc,
        consumed: 0,
        returned: 0,
      };
    }

    const p = partsMap[key];
    p.returned += tx._qty;
  });

  // Convert to array and calculate remaining
  // Only return parts that have consumption (from service centers only)
  return Object.values(partsMap)
    .map(p => ({
      ...p,
      remaining: Math.max(0, p.consumed - p.returned)
    }));
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY & PART TRACKING DASHBOARD (Phase 1: Core Infrastructure)
// ═══════════════════════════════════════════════════════════════

// ── Inventory Dashboard State ────────────────────────────────────
let _inventoryState = {
  searchModel: '',           // Filter by Model
  searchPartName: '',        // Filter by Part Name
  selectedPartTracking: null, // Selected part for lifecycle view
  editingRequestId: null,    // Supervisor edit mode for Pending Requests
  activeView: 'overview'     // 'overview', 'consumption', 'returns', 'tracking'
};

function updateInventoryFilter(field, value) {
  _inventoryState[field] = value;
  renderParts(); // Re-render with new filters
}

// ── Check if transaction is warehouse-related ────────────────────
// Reuses logic from enrichTransaction
function isWarehouseTransaction(transaction) {
  return transaction._branch === 'AUX Main WH Stock';
}

// ── Get only service center transactions (exclude warehouse) ──────
function getServiceCenterTransactions(transactions) {
  return transactions.filter(t => !isWarehouseTransaction(t));
}

// ── Build Main Branch Stock (aggregated warehouse inventory) ──────
// Combines Sort 5 (inbound) + Sort 6 (distributed) for overall picture
function buildMainBranchStock(transactions) {
  const stockMap = {};

  // Process all inbound and distributed transactions
  transactions.forEach(tx => {
    // Only process warehouse/inbound transactions (Sort 5, 6)
    if (tx._sort !== 5 && tx._sort !== 6) return;
    if (!isWarehouseTransaction(tx)) return; // Only warehouse

    const code = tx._partCode;
    const name = tx._partName;
    const key = code || name;

    if (!key) return;

    if (!stockMap[key]) {
      stockMap[key] = {
        code: code,
        name: name,
        balance: 0,
        consumed: 0,
        lastReceived: null,
        createdDate: null
      };
    }

    const record = stockMap[key];

    // Sort 5: inbound to warehouse
    if (tx._sort === 5) {
      record.balance += tx._qty;
      record.lastReceived = tx._date;
    }
    // Sort 6: distributed from warehouse (decreases balance)
    else if (tx._sort === 6) {
      record.balance -= tx._qty;
    }

    // Track consumption from all service center usage
    if (tx._sort === 8) {
      record.consumed += tx._qty;
    }

    if (!record.createdDate && tx._date) {
      record.createdDate = tx._date;
    }
  });

  // Ensure non-negative balances
  Object.values(stockMap).forEach(record => {
    record.balance = Math.max(0, record.balance);
  });

  return Object.values(stockMap);
}

// ── Build SVC Center Distribution Stock (by Branch) ────────────────
// Shows Sort 6 stock distributed to each branch/ASC
function buildSvcCenterStock(transactions) {
  const svcMap = {};

  transactions.forEach(tx => {
    // Only service center transactions (Sort 6 = distributed to SVC)
    if (tx._sort !== 6) return;
    if (isWarehouseTransaction(tx)) return;

    const branch = tx._branch || 'Unknown';
    const asc = tx._asc || 'N/A';
    const locationKey = `${branch}|${asc}`;
    const partKey = tx._partCode || tx._partName;

    if (!partKey) return;

    if (!svcMap[locationKey]) {
      svcMap[locationKey] = {
        branch: branch,
        asc: asc,
        location: asc ? `${branch} - ${asc}` : branch,
        skus: new Set(),
        balance: 0,
        consumed: 0,
        consumptionRate: 0,
        lastUpdated: null
      };
    }

    const location = svcMap[locationKey];
    location.skus.add(partKey);
    location.balance += tx._qty;
    if (tx._date && (!location.lastUpdated || tx._date > location.lastUpdated)) {
      location.lastUpdated = tx._date;
    }
  });

  // Calculate consumption rate (consumed in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  transactions.forEach(tx => {
    // Sort 8 = consumption at SVC
    if (tx._sort !== 8) return;
    if (isWarehouseTransaction(tx)) return;

    const branch = tx._branch || 'Unknown';
    const asc = tx._asc || 'N/A';
    const locationKey = `${branch}|${asc}`;

    if (svcMap[locationKey] && tx._date && tx._date >= thirtyDaysAgo) {
      svcMap[locationKey].consumptionRate += tx._qty;
    }
  });

  return Object.values(svcMap).map(loc => ({
    ...loc,
    skus: loc.skus.size, // Convert Set to count
    lowStock: loc.balance <= 3
  }));
}

// ── Build Consumption Tracker (Sort 8 only from service centers) ────
function buildConsumptionByBranch(transactions) {
  const consumptionMap = {};

  transactions.forEach(tx => {
    // Only Sort 8 (consumption) from service centers
    if (tx._sort !== 8) return;
    if (isWarehouseTransaction(tx)) return;

    const code = tx._partCode;
    const name = tx._partName;
    const key = code || name;
    const branch = tx._branch || 'Unknown';
    const locationKey = `${key}|${branch}`;

    if (!key) return;

    if (!consumptionMap[locationKey]) {
      consumptionMap[locationKey] = {
        code: code,
        name: name,
        branch: branch,
        consumed: 0,
        lastUsed: null,
        usageCount: 0
      };
    }

    const record = consumptionMap[locationKey];
    record.consumed += tx._qty;
    record.usageCount += 1;
    if (tx._date && (!record.lastUsed || tx._date > record.lastUsed)) {
      record.lastUsed = tx._date;
    }
  });

  return Object.values(consumptionMap).sort((a, b) => b.consumed - a.consumed);
}

// ── Build Return Summary by Type (Defective vs New Parts) ──────────
// Separates Sort 9-10 (defective) from Sort 11-12 (new/unused)
function buildReturnSummaryByType(transactions) {
  const defectiveMap = {};
  const newPartMap = {};

  // Process return request transactions (Sort 9 = defective request, Sort 11 = new request)
  transactions.forEach(tx => {
    if (tx._sort !== 9 && tx._sort !== 11) return;
    if (isWarehouseTransaction(tx)) return;

    const code = tx._partCode;
    const name = tx._partName;
    const key = code || name;
    const branch = tx._branch || 'Unknown';
    const asc = tx._asc || '';
    const locationKey = `${key}|${branch}|${asc}`;

    if (!key) return;

    // Defective returns (Sort 9)
    if (tx._sort === 9) {
      if (!defectiveMap[locationKey]) {
        defectiveMap[locationKey] = {
          type: 'defective',
          code: code,
          name: name,
          branch: branch,
          asc: asc,
          requested: 0,
          received: 0,
          status: 'Pending',
          requestDate: null,
          receivedDate: null
        };
      }
      defectiveMap[locationKey].requested += tx._qty;
      if (tx._date && !defectiveMap[locationKey].requestDate) {
        defectiveMap[locationKey].requestDate = tx._date;
      }
    }

    // New/unused returns (Sort 11)
    if (tx._sort === 11) {
      if (!newPartMap[locationKey]) {
        newPartMap[locationKey] = {
          type: 'new',
          code: code,
          name: name,
          branch: branch,
          asc: asc,
          requested: 0,
          received: 0,
          status: 'Pending',
          requestDate: null,
          receivedDate: null
        };
      }
      newPartMap[locationKey].requested += tx._qty;
      if (tx._date && !newPartMap[locationKey].requestDate) {
        newPartMap[locationKey].requestDate = tx._date;
      }
    }
  });

  // Process return received transactions (Sort 10 = defective received, Sort 12 = new received)
  transactions.forEach(tx => {
    if (tx._sort !== 10 && tx._sort !== 12) return;
    if (isWarehouseTransaction(tx)) return;

    const code = tx._partCode;
    const name = tx._partName;
    const key = code || name;
    const branch = tx._branch || 'Unknown';
    const asc = tx._asc || '';
    const locationKey = `${key}|${branch}|${asc}`;

    if (!key) return;

    // Defective received (Sort 10)
    if (tx._sort === 10) {
      if (!defectiveMap[locationKey]) {
        defectiveMap[locationKey] = {
          type: 'defective',
          code: code,
          name: name,
          branch: branch,
          asc: asc,
          requested: 0,
          received: 0,
          status: 'Completed',
          requestDate: null,
          receivedDate: null
        };
      }
      defectiveMap[locationKey].received += tx._qty;
      defectiveMap[locationKey].status = 'Completed';
      if (tx._date && !defectiveMap[locationKey].receivedDate) {
        defectiveMap[locationKey].receivedDate = tx._date;
      }
    }

    // New received (Sort 12)
    if (tx._sort === 12) {
      if (!newPartMap[locationKey]) {
        newPartMap[locationKey] = {
          type: 'new',
          code: code,
          name: name,
          branch: branch,
          asc: asc,
          requested: 0,
          received: 0,
          status: 'Completed',
          requestDate: null,
          receivedDate: null
        };
      }
      newPartMap[locationKey].received += tx._qty;
      newPartMap[locationKey].status = 'Completed';
      if (tx._date && !newPartMap[locationKey].receivedDate) {
        newPartMap[locationKey].receivedDate = tx._date;
      }
    }
  });

  return {
    defective: Object.values(defectiveMap),
    newParts: Object.values(newPartMap)
  };
}

// ── Get Part Lifecycle (13 Sort stages) ──────────────────────────
// Returns all transactions for a specific part code, showing progression
function getPartLifecycle(partCode, allTransactions) {
  if (!partCode) return [];

  const partTransactions = allTransactions.filter(tx =>
    tx._partCode === partCode || tx._partName === partCode
  );

  // Define all 13 sort stages
  const stages = [
    { sort: 1, label: 'PO Created', description: 'Purchase order initiated' },
    { sort: 2, label: 'PO Received', description: 'Payment received' },
    { sort: 3, label: 'In Transit', description: 'Shipment in transit' },
    { sort: 4, label: 'Customs Cleared', description: 'Cleared customs' },
    { sort: 5, label: 'Inbound WH', description: 'Received at main warehouse' },
    { sort: 6, label: 'Distributed', description: 'Distributed to service centers' },
    { sort: 7, label: 'Ready', description: 'Ready for issue' },
    { sort: 8, label: 'Consumed', description: 'Used by technician' },
    { sort: 9, label: 'Return Requested', description: 'Defective return requested' },
    { sort: 10, label: 'Return Received', description: 'Defective return received at WH' },
    { sort: 11, label: 'New Return Req', description: 'New/unused return requested' },
    { sort: 12, label: 'New Received', description: 'New/unused return received at WH' },
    { sort: 13, label: 'Damage Report', description: 'Damage/loss reported' }
  ];

  return stages.map(stage => {
    const stageTx = partTransactions.find(tx => tx._sort === stage.sort);
    return {
      ...stage,
      status: stageTx ? 'completed' : 'pending',
      date: stageTx ? stageTx._date : null,
      quantity: stageTx ? stageTx._qty : 0,
      branch: stageTx ? stageTx._branch : null
    };
  });
}

// ── Filter Lifecycle by Search Criteria ──────────────────────────
function filterInventoryBySearch(items, searchModel, searchPartName) {
  return items.filter(item => {
    const modelMatch = !searchModel ||
      (item.model && item.model.toLowerCase().includes(searchModel.toLowerCase()));

    const nameMatch = !searchPartName ||
      (item.name && item.name.toLowerCase().includes(searchPartName.toLowerCase())) ||
      (item.code && item.code.toLowerCase().includes(searchPartName.toLowerCase()));

    return modelMatch && nameMatch;
  });
}

// ── Filter transactions ────────────────────────────────────────
function getFilteredTx() {
  let tx = PARTS_DB.transactions;
  if (!DB.isAdmin && DB.userASC && DB.userASC!=='All')
    tx = tx.filter(r=>r._asc===DB.userASC);
  const co  = document.getElementById('filter-company')?.value;
  const br  = document.getElementById('filter-branch')?.value;
  if (DB.isAdmin && co) tx = tx.filter(r=>r._asc===co);
  if (br) tx = tx.filter(r=>r._branch===br);
  return tx;
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
    el.innerHTML=`<div class="insight-card" style="background:#fee2e2;border-color:#dc2626">
      <div class="insight-icon" style="color:#dc2626;font-size:20px">⚠️</div>
      <div class="insight-text"><div class="insight-title" style="color:#dc2626">Cannot load Parts data</div>
      Ensure Google Sheet is shared publicly. ID: ${CONFIG.PARTS_SHEET_ID}</div></div>`;
    return;
  }

  const tx = getFilteredTx();
  const stockMap   = calcStockMap(tx);
  const partsArr   = classifyABC(Object.values(stockMap));

  // ── KPIs ──────────────────────────────────────────────────
  const totalSKUs    = partsArr.length;
  const totalStock   = partsArr.reduce((s,p)=>s+p.wh+p.svc, 0);
  const whStock      = partsArr.reduce((s,p)=>s+p.wh, 0);
  const svcStock     = partsArr.reduce((s,p)=>s+p.svc, 0);
  const consumed     = partsArr.reduce((s,p)=>s+p.consumed, 0);
  const returnedWH   = partsArr.reduce((s,p)=>s+p.returnedWH, 0);
  const netConsumed  = consumed - returnedWH;
  const lowStock     = partsArr.filter(p=>p.svc>0&&p.svc<=3).length;
  const zeroStock    = partsArr.filter(p=>p.svc<=0&&p.consumed>0).length;
  const reorderAlert = partsArr.filter(p=>{ const f=calcForecast(p); return f&&f.monthsLeft<3&&p.svc>0; }).length;

  const aCount = partsArr.filter(p=>p.abc==='A').length;
  const bCount = partsArr.filter(p=>p.abc==='B').length;
  const cCount = partsArr.filter(p=>p.abc==='C').length;

  // ── Monthly usage last 6 months (Sort 8 only) ────────────
  const now = new Date();
  const last6 = Array.from({length:6},(_,i)=>{
    const d=new Date(now.getFullYear(),now.getMonth()-5+i,1);
    const mk=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    return{mk, label:fmtMo(mk),
      qty:tx.filter(r=>r._sort===8&&r._monthKey===mk).reduce((s,r)=>s+r._qty,0)};
  });

  // ── Top 10 consumed ───────────────────────────────────────
  const topParts = partsArr.filter(p=>p.consumed>0).slice(0,10);

  // ── Branch summary ────────────────────────────────────────
  const brMap = {};
  partsArr.forEach(p=>{
    const b=p.branch||'Unknown';
    if(!brMap[b])brMap[b]={branch:b,skus:0,balance:0,low:0,zero:0,usage:0};
    brMap[b].skus++;
    brMap[b].balance += p.wh+p.svc;
    brMap[b].usage   += p.consumed;
    if(p.svc>0&&p.svc<=3) brMap[b].low++;
    if(p.svc<=0&&p.consumed>0) brMap[b].zero++;
  });
  const branchSummary=Object.values(brMap).sort((a,b)=>b.balance-a.balance);

  // ── Reorder list ──────────────────────────────────────────
  const reorderList=partsArr.map(p=>({...p,forecast:calcForecast(p)}))
    .filter(p=>p.forecast&&p.forecast.monthsLeft<3&&p.svc>0)
    .sort((a,b)=>a.forecast.monthsLeft-b.forecast.monthsLeft).slice(0,25);

  // ── Parts Return Summary (Loaner Model) ─────────────────
  // Track: Consumed (used by tech) vs Returned (by service provider)
  const partsReturnSummary = buildPartsReturnSummary(tx);
  // Calculate totals ONLY for parts with remaining > 0 (matches table display)
  const partsWithRemaining = partsReturnSummary.filter(p => p.remaining > 0);
  const partsReturnTotals = {
    consumed: partsWithRemaining.reduce((s,p)=>s+(p.consumed||0), 0),
    returned: partsWithRemaining.reduce((s,p)=>s+(p.returned||0), 0),
    outstanding: partsWithRemaining.reduce((s,p)=>s+(p.remaining||0), 0),
  };
  const returnRate = partsReturnTotals.consumed > 0
    ? (partsReturnTotals.returned / partsReturnTotals.consumed * 100)
    : 0;

  el.innerHTML=`
  <!-- HEADER -->
  <div class="insight-card" style="background:linear-gradient(135deg,#001A47,#003D8F);border:none;margin-bottom:18px">
    <div class="insight-icon" style="background:rgba(255,255,255,.15);color:white;font-size:20px">🔩</div>
    <div class="insight-text" style="color:white">
      <div class="insight-title" style="color:white;font-size:15px">Spare Parts Management</div>
      <span style="color:rgba(255,255,255,.75);font-size:12px">
        ${totalSKUs} SKUs · ${fmt(totalStock)} total stock · ${tx.length} transactions
      </span>
    </div>
    <button onclick="PARTS_DB.loaded=false;renderParts()" style="background:rgba(255,255,255,.15);color:white;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px">⟳ Refresh</button>
  </div>

  <!-- LIVE TRACKER -->
  <div class="section-header" style="cursor:pointer" onclick="document.getElementById('tracker-body').style.display=document.getElementById('tracker-body').style.display==='none'?'block':'none'">
    <div class="section-title">Shipment Live Tracking</div>
  </div>
  <div id="tracker-body" class="chart-card" style="margin-bottom:18px">
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <input id="track-order" class="filter-input" type="text" placeholder="e.g. GD20260503308847"
        style="flex:1;min-width:160px;color:#000;font-family:var(--mono)" oninput="previewTracking(this.value)">
      <input id="track-awb" class="filter-input" type="text" placeholder="e.g. 215957Q173"
        style="flex:1;min-width:140px;color:#000;font-family:var(--mono)" oninput="previewTracking(this.value)">
      ${DB.isAdmin?`<button onclick="saveAndTrack()" class="export-btn excel" style="padding:7px 16px;height:38px">💾 Save &amp; Track</button>`:''}
      <button onclick="doTrackOnly()" class="export-btn pptx" style="padding:7px 16px;height:38px">🔍 Track</button>
    </div>
    <div id="tracking-result" style="margin-top:12px;padding:12px;background:var(--gray-50);border-radius:var(--r-md);font-size:12px;color:var(--gray-500);min-height:48px">
      Enter a tracking number above to see live shipment status.
    </div>
  </div>

  <!-- KPI CARDS → match Power BI layout -->
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
    <div class="kpi-card ${lowStock>0?'amber':'green'}">
      <div class="kpi-label">LOW STOCK</div>
      <div class="kpi-value">${fmt(lowStock)}</div>
      <div class="kpi-delta">≤ 3 units SVC</div>
    </div>
    <div class="kpi-card ${zeroStock>0?'red':'green'}">
      <div class="kpi-label">OUT OF STOCK</div>
      <div class="kpi-value">${fmt(zeroStock)}</div>
      <div class="kpi-delta">SVC balance = 0</div>
    </div>
    <div class="kpi-card ${reorderAlert>0?'amber':'green'}">
      <div class="kpi-label">REORDER ALERT</div>
      <div class="kpi-value">${fmt(reorderAlert)}</div>
      <div class="kpi-delta">&lt; 3 months stock</div>
    </div>
  </div>

  <!-- ROW: Reorder Alert + Pending Status Board (like Image 1) -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Reorder alert — months of SVC stock</div></div></div>
      <div id="reorder-bars" style="padding:4px 0">
        ${reorderList.slice(0,6).map(p=>{
          const f=p.forecast,ml=f.monthsLeft;
          const col=ml<1?'#E24B4A':ml<3?'#EF9F27':'#1D9E75';
          const pct=Math.min(ml/8*100,100).toFixed(1);
          const vCls=ml<1?'color-danger':ml<3?'color-warning':'';
          return`<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            <div style="font-size:11px;color:var(--gray-600);width:100px;flex-shrink:0;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(truncate(p.name,14))}</div>
            <div style="flex:1;background:var(--gray-100);border-radius:2px;height:14px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${col};border-radius:2px"></div>
            </div>
            <div style="font-size:11px;font-family:var(--mono);width:40px;color:${col}">${fmt(ml,1)}mo</div>
          </div>`;
        }).join('')}
        ${reorderList.length===0?'<div style="font-size:12px;color:var(--gray-400);padding:1rem 0">✅ All parts have sufficient stock</div>':''}
        <div style="display:flex;gap:10px;margin-top:10px;font-size:10px">
          <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:#E24B4A;border-radius:2px"></span>Critical &lt;1mo</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:#EF9F27;border-radius:2px"></span>Low 1–3mo</span>
          <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;background:#1D9E75;border-radius:2px"></span>OK &gt;3mo</span>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Pending part requests — status board</div></div></div>
      <div id="parts-status-board">
        ${buildPendingBoard()}
      </div>
    </div>
  </div>

  <!-- CHARTS ROW 2 -->
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Monthly Usage (last 6 months)</div><div class="chart-card-sub">Sort 8 — Part Used by Tech</div></div></div>
      <div class="chart-wrap"><canvas id="ch-pm" role="img" aria-label="Monthly parts consumption">Monthly consumption.</canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">ABC Classification</div><div class="chart-card-sub">By Sort 8 consumption</div></div></div>
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

  <!-- BRANCH STOCK SUMMARY (SVC = Service Center stock, WH = Warehouse stock) -->
  <div class="section-header"><div class="section-title">Branch Stock Summary</div><span class="section-badge" style="font-size:11px;font-weight:400">SVC = Service Center Stock</span></div>
  <div class="table-card" style="margin-bottom:18px">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th style="text-align:left">BRANCH / WAREHOUSE</th><th>SKUs</th><th>SVC Stock</th><th>Low (≤3)</th><th>Out of Stock</th><th>Consumed</th><th>HEALTH</th></tr></thead>
      <tbody>${branchSummary.map(b=>{
        const cls=b.zero>5?'badge-red':b.low>3?'badge-amber':'badge-green';
        const lbl=b.zero>5?'⚠️ Critical':b.low>3?'🟡 Watch':'✅ Good';
        return`<tr>
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

  <!-- DEFECTIVE PARTS RETURN SUMMARY -->
  <div class="section-header"><div class="section-title">Defective Parts Return Summary</div><span class="section-badge">${partsWithRemaining.length} outstanding</span></div>
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
    <div class="kpi-card blue">
      <div class="kpi-label">Total Consumed</div>
      <div class="kpi-value">${fmt(partsReturnTotals.consumed)}</div>
      <div class="kpi-delta">Used by technicians</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">Total Returned</div>
      <div class="kpi-value">${fmt(partsReturnTotals.returned)}</div>
      <div class="kpi-delta">Received from SVC</div>
    </div>
    <div class="kpi-card ${partsReturnTotals.outstanding>0?'red':'green'}">
      <div class="kpi-label">Outstanding</div>
      <div class="kpi-value">${fmt(partsReturnTotals.outstanding)}</div>
      <div class="kpi-delta">Not yet returned</div>
    </div>
    <div class="kpi-card accent">
      <div class="kpi-label">Return Rate</div>
      <div class="kpi-value">${fmtPct(returnRate)}</div>
      <div class="kpi-delta">Returned ÷ Consumed</div>
    </div>
  </div>
  <div class="table-card" style="margin-bottom:18px">
    <div class="table-header">
      <div class="table-title">Return Summary</div>
      <div class="table-count">${partsWithRemaining.length} outstanding</div>
      <button class="export-btn excel" style="padding:4px 12px;font-size:11px" onclick="doExcelExportPartsReturn()">📥 Export CSV</button>
    </div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Location (Branch - ASC)</th><th style="text-align:left">Part Code</th><th style="text-align:left">Part Name</th><th class="text-mono">Consumed</th><th class="text-mono">Returned</th><th class="text-mono">Remaining</th></tr></thead>
      <tbody>${partsWithRemaining.length === 0 ? '<tr><td colspan="6" class="table-empty">No outstanding parts</td></tr>' :
        partsWithRemaining.map(p=>{
          // Location display logic:
          // - Warehouse transactions: show "AUX Main WH Stock" only (no ASC)
          // - Service center transactions: show "Branch - ASC" if both exist, else just "Branch"
          let locationDisplay = '—';
          if (p.branch === 'AUX Main WH Stock') {
            locationDisplay = p.branch;  // Warehouse: no ASC suffix
          } else if (p.branch) {
            locationDisplay = p.asc ? `${p.branch} - ${p.asc}` : p.branch;
          }
          return `<tr>
            <td class="fw-600 text-mono">${esc(locationDisplay)}</td>
            <td class="text-mono" style="text-align:left">${esc(p.code || '—')}</td>
            <td style="text-align:left">${esc(p.name || '—')}</td>
            <td class="text-mono">${fmt(p.consumed)}</td>
            <td class="text-mono">${fmt(p.returned)}</td>
            <td class="text-mono color-danger fw-600">${fmt(p.remaining)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table></div>
  </div>

  <!-- REORDER ALERT TABLE -->
  ${reorderList.length>0?`
  <div class="section-header"><div class="section-title">🚨 Reorder Alert — Parts Needing Restock</div><span class="section-badge">${reorderList.length} parts</span></div>
  <div class="table-card" style="margin-bottom:18px">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>ABC</th><th>Code</th><th style="text-align:left">Part Name</th><th>SVC Stock</th><th>Avg/Month</th><th>Months Left</th><th>Reorder Qty</th><th>Priority</th><th></th></tr></thead>
      <tbody>${reorderList.map(p=>{
        const f=p.forecast; const ml=f.monthsLeft;
        const urg=ml<1?'🔴 Urgent':ml<2?'🟠 High':'🟡 Medium';
        const cls=ml<1?'badge-red':ml<2?'badge-amber':'badge-blue';
        const ac=p.abc==='A'?'badge-red':p.abc==='B'?'badge-amber':'badge-gray';
        return`<tr>
          <td><span class="badge ${ac}">${p.abc}</span></td>
          <td class="text-mono text-sm">${esc(p.code)}</td>
          <td class="fw-600" style="text-align:left">${esc(truncate(p.name,35))}</td>
          <td class="text-mono ${p.svc<=3?'color-danger':'fw-600'}">${p.svc}</td>
          <td class="text-mono">${fmt(f.avgMonthly,1)}</td>
          <td><span class="badge ${cls}">${fmt(ml,1)}mo</span></td>
          <td class="text-mono fw-600" style="color:var(--aux-blue)">${f.reorderQty}</td>
          <td>${urg}</td>
          <td><button class="req-btn" onclick="showPartsRequestModal({code:'${esc(p.code)}',name:'${esc(p.name)}'})">+ Request</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>`:''}

  <!-- FULL INVENTORY -->
  <div class="section-header"><div class="section-title">Full Inventory — ABC Analysis</div><span class="section-badge">${totalSKUs} SKUs</span></div>
  <div class="table-card">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th></th><th>ABC</th><th>Code</th><th style="text-align:left">Part Name</th><th>Branch</th><th>WH Stock</th><th>SVC Stock</th><th>Consumed</th><th>Returned</th><th>Avg/Mo</th><th>Months Left</th></tr></thead>
      <tbody>${partsArr.slice(0,120).map(p=>{
        const f=calcForecast(p);
        const ac=p.abc==='A'?'badge-red':p.abc==='B'?'badge-amber':'badge-gray';
        const wc=p.wh<5?'color-danger':p.wh<20?'color-warning':'';
        const sc=p.svc<=0?'color-danger':p.svc<3?'color-warning':'';
        return`<tr>
          <td><button class="req-btn" onclick="showPartsRequestModal({code:'${esc(p.code)}',name:'${esc(p.name)}'})">+ Request</button></td>
          <td><span class="badge ${ac}">${p.abc}</span></td>
          <td class="text-mono text-sm">${esc(p.code)}</td>
          <td class="fw-600" style="text-align:left">${esc(truncate(p.name,32))}</td>
          <td class="text-sm">${esc(p.branch)}</td>
          <td class="text-mono ${wc}">${fmt(p.wh)}</td>
          <td class="text-mono ${sc}">${fmt(p.svc)}</td>
          <td class="text-mono">${fmt(p.consumed)}</td>
          <td class="text-mono">${fmt(p.returnedWH)}</td>
          <td class="text-mono">${f?fmt(f.avgMonthly,1):'—'}</td>
          <td>${f?`<span class="badge ${f.monthsLeft<1?'badge-red':f.monthsLeft<3?'badge-amber':'badge-green'}">${fmt(f.monthsLeft,1)}mo</span>`:'—'}</td>
        </tr>`;
      }).join('')}
      ${partsArr.length>120?`<tr><td colspan="11" style="text-align:center;color:var(--gray-400);font-size:12px;padding:10px">Showing 120 of ${partsArr.length}</td></tr>`:''}
      </tbody>
    </table></div>
  </div>`;

  // ── Charts ──────────────────────────────────────────────
  barChart('ch-pm',last6.map(m=>m.label),
    [{label:'Qty Used',data:last6.map(m=>m.qty),backgroundColor:CONFIG.COLORS.BLUE}],
    {plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}});

  donutChart('ch-abc',['Class A','Class B','Class C'],[aCount,bCount,cCount],
    {plugins:{legend:{position:'right'}}});

  hBarChart('ch-top',
    topParts.map(p=>truncate(p.name||p.code,22)),
    topParts.map(p=>p.consumed),
    topParts.map(p=>p.abc==='A'?CONFIG.COLORS.RED:p.abc==='B'?CONFIG.COLORS.AMBER:CONFIG.COLORS.GRAY),
    {plugins:{legend:{display:false}}});

  hBarChart('ch-br',
    branchSummary.slice(0,12).map(b=>truncate(b.branch,20)),
    branchSummary.slice(0,12).map(b=>b.balance),
    CONFIG.COLORS.BLUE,
    {plugins:{legend:{display:false}}});
}

// ── Tracking ───────────────────────────────────────────────────
function previewTracking(v) {
  if (!v||v.length<5) return;
  const el=document.getElementById('tracking-result');
  if(el) el.innerHTML=`<span style="font-size:12px;color:var(--gray-500)">Press Track · </span>`+
    `<a href="${trackingUrl(v)}" target="_blank" style="color:var(--aux-blue);font-size:12px;font-weight:600">Open SMSA ↗</a>`;
}

function doTrackOnly() {
  const awb=(document.getElementById('track-awb')?.value||document.getElementById('track-order')?.value||'').trim();
  if(!awb){alert('Enter a tracking number first.');return;}
  showTrackingFrame(awb);
}

async function saveAndTrack() {
  const orderNo=(document.getElementById('track-order')?.value||'').trim();
  const awb    =(document.getElementById('track-awb')?.value||'').trim();
  if(!awb){alert('Enter a tracking number (AWB) first.');return;}
  if(!DB.isAdmin){alert('Admin access required to save tracking numbers.');return;}
  if(HEARTBEAT_URL){
    try{
      await fetch(HEARTBEAT_URL,{method:'POST',mode:'no-cors',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          action:'parts_request',sheet:CONFIG.PARTS_SHEET,
          orderNumber:orderNo,awb,requestDate:new Date().toISOString().split('T')[0],
          finalStatus:'Shipped',requestedBy:_currentEmail||'—',asc:_currentASC||'—',
        })
      });
    }catch(e){console.warn(e);}
  }
  showTrackingFrame(awb);
}

function showTrackingFrame(awb) {
  // CONFIG.TRACKING_URL = 'https://www.smsaexpress.com/en/gb/track-shipment?track='
  // → To change carrier: edit CONFIG.TRACKING_URL in config.js
  const url = trackingUrl(awb);
  const el  = document.getElementById('tracking-result');
  if(!el) return;
  el.innerHTML=`
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
  const C=CONFIG.COLS;
  const reason=(r[C.RESCHED_REASON]||r._rescheduleReason||'').toLowerCase();
  const supp  =(r[C.RESCHED_SUPP] ||r._rescheduleRemark ||'').toLowerCase();
  const needsPart=reason.includes('accessor')||reason.includes('spare')||
                  reason.includes('part')    ||reason.includes('قطعة')||
                  supp.includes('accessor')  ||supp.includes('spare')||supp.includes('part');
  if(!needsPart) return'<span style="color:var(--gray-200);font-size:11px">—</span>';

  const ticketNo=(r[C.TICKET_NUM]||'').trim();
  const branch=r._branch||'';

  // Check Parts requests sheet for AWB
  let trackingAWB=null;
  if(PARTS_REQUESTS.length){
    const m=PARTS_REQUESTS.find(p=>(p['Order Number']||'').trim()===ticketNo);
    if(m) trackingAWB=(m['AWB']||'').trim();
  }
  if(!trackingAWB&&PARTS_DB.loaded){
    const tx=PARTS_DB.transactions.find(p=>p._sort===8&&(p[CONFIG.PARTS_COLS.ORDER_NO]||'').trim()===ticketNo);
    if(tx&&tx._awb) trackingAWB=tx._awb;
  }

  if(trackingAWB){
    return`<span class="badge badge-blue" style="cursor:pointer;font-size:10px"
      onclick="showTrackingFrame('${esc(trackingAWB)}')" title="AWB: ${esc(trackingAWB)}">
      📦 Track ${esc(trackingAWB.substring(0,10))}…</span>`;
  }

  const desc=truncate(r[C.MAINTENANCE]||supp||'Part required',40);
  return`<button onclick="openPartsRequestFromTicket('${esc(ticketNo)}','${esc(branch)}','${esc(desc)}')"
    style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;
           padding:3px 8px;font-size:10px;font-weight:600;cursor:pointer;font-family:var(--font)">
    🔩 Request Part</button>`;
}

// ── Open modal from ticket ─────────────────────────────────────
function openPartsRequestFromTicket(ticketNo, branch, partDesc) {
  showPartsRequestModal({code:'',name:partDesc||'Part required',prefilledOrderNo:ticketNo,prefilledBranch:branch});
}

// ── Full parts request modal ───────────────────────────────────
function showPartsRequestModal(opts) {
  opts=opts||{};
  document.getElementById('parts-modal-overlay')?.remove();
  const overlay=document.createElement('div');
  overlay.id='parts-modal-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML=`
    <div style="background:#fff;border-radius:12px;border:.5px solid #e5e7eb;padding:1.5rem;width:520px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:.5px solid #f3f4f6">
        <div style="font-size:15px;font-weight:600;color:#111">🔩 Request Spare Part</div>
        <button onclick="document.getElementById('parts-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#9ca3af;line-height:1">×</button>
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
            <label style="font-size:11px;color:#6b7280;display:block;margin-bottom:4px">Model Number</label>
            <input id="pm-model" value="${esc(opts.model||'')}" type="text" placeholder="e.g. ATW24" autocomplete="off"
              style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:#000;font-family:monospace">
            <div id="pm-model-dropdown" style="position:absolute;top:100%;left:0;right:0;background:#fff;border:.5px solid #d1d5db;border-top:none;border-radius:0 0 8px 8px;max-height:200px;overflow-y:auto;z-index:1000;display:none;box-shadow:0 4px 6px rgba(0,0,0,.1)"></div>
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
            ${opts.prefilledOrderNo?'<span style="color:#16a34a;font-size:10px">(auto-filled from ticket)</span>':''}
          </label>
          <input id="pm-order-no" value="${esc(opts.prefilledOrderNo||'')}" type="text" placeholder="GD2026…"
            style="width:100%;font-size:13px;padding:8px 10px;border:.5px solid #d1d5db;border-radius:8px;background:#fff;color:${opts.prefilledOrderNo?'#16a34a':'#000'};font-family:monospace">
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

  // Setup model autocomplete
  setupModelAutocomplete();
}

// ── Model autocomplete functionality ────────────────────────
function setupModelAutocomplete() {
  const modelInput = document.getElementById('pm-model');
  const dropdown = document.getElementById('pm-model-dropdown');

  if (!modelInput || !dropdown) {
    console.error('setupModelAutocomplete: Missing elements', { modelInput: !!modelInput, dropdown: !!dropdown });
    return;
  }

  console.log('setupModelAutocomplete: Attaching event listener to model input');

  modelInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    console.log('Model input changed:', query);

    if (query.length < 2) {
      dropdown.style.display = 'none';
      return;
    }

    try {
      // First fetch matching models
      const modelsUrl = `${HEARTBEAT_URL}?action=models&query=${encodeURIComponent(query)}`;
      console.log('Fetching models from:', modelsUrl);

      const resp = await fetch(modelsUrl);
      const data = await resp.json();
      const models = data.models || [];

      if (models.length === 0) {
        console.log('No models found for query:', query);
        dropdown.style.display = 'none';
        return;
      }

      console.log('Rendering', models.length, 'matching models');

      // Show models as clickable options that will load parts
      dropdown.innerHTML = models.map((m) => `
        <div style="padding:12px;border-bottom:.5px solid #f0f0f0;cursor:pointer;font-size:12px;color:#374151;font-family:monospace;background:#f9fafb;transition:.15s"
          onmouseover="this.style.background='#f0fdf4'"
          onmouseout="this.style.background='#f9fafb'"
          onclick="loadPartsForModel('${esc(m.model)}')">
          <div style="font-weight:600;color:#003D8F">${esc(m.model)}</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:3px">Click to view all parts for this model</div>
        </div>
      `).join('');

      dropdown.style.display = 'block';
    } catch (err) {
      console.error('Model lookup error:', err);
      dropdown.innerHTML = `<div style="padding:8px 12px;color:#dc2626;font-size:12px">❌ Error loading models: ${err.message}</div>`;
      dropdown.style.display = 'block';
    }
  });

  document.addEventListener('click', (e) => {
    if (!modelInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}

// ── Load and display all parts for a model ──────────────────
async function loadPartsForModel(modelName) {
  const modelInput = document.getElementById('pm-model');
  const dropdown = document.getElementById('pm-model-dropdown');

  // Clear and set exact model value from suggestion
  modelInput.value = modelName.trim();
  console.log('Loading parts for model:', modelName, 'Trimmed:', modelInput.value);

  try {
    const partsUrl = `${HEARTBEAT_URL}?action=parts_for_model&query=${encodeURIComponent(modelName)}`;
    console.log('Fetching parts from:', partsUrl);

    const resp = await fetch(partsUrl);
    const data = await resp.json();
    const parts = data.parts || [];

    console.log(`Found ${parts.length} parts for model ${modelName}`);

    if (parts.length === 0) {
      dropdown.innerHTML = `<div style="padding:12px;color:#9ca3af;font-size:12px">No parts found for this model</div>`;
      dropdown.style.display = 'block';
      return;
    }

    // Show all parts for selection
    dropdown.innerHTML = `
      <div style="padding:8px 12px;background:#003D8F;color:white;font-size:11px;font-weight:600;border-bottom:1px solid #e5e7eb">
        ${parts.length} parts available for ${modelName}
      </div>
    ` + parts.map((p) => `
      <div style="padding:10px 12px;border-bottom:.5px solid #f0f0f0;cursor:pointer;font-size:12px;color:#374151;transition:.15s"
        onmouseover="this.style.background='#E6F1FB'"
        onmouseout="this.style.background='white'"
        onclick="selectPart('${esc(p.partNumber)}','${esc(p.partDescription)}')">
        <div style="font-weight:600;font-family:monospace;color:#003D8F">${esc(p.partNumber)}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">${esc(p.partDescription)}</div>
      </div>
    `).join('');

    dropdown.style.display = 'block';
  } catch (err) {
    console.error('Parts lookup error:', err);
    dropdown.innerHTML = `<div style="padding:8px 12px;color:#dc2626;font-size:12px">❌ Error loading parts: ${err.message}</div>`;
    dropdown.style.display = 'block';
  }
}

// ── Select a part and auto-fill fields ──────────────────────
function selectPart(partNumber, partDescription) {
  document.getElementById('pm-part-code').value = partNumber;
  document.getElementById('pm-part-name').value = partDescription;
  document.getElementById('pm-model-dropdown').style.display = 'none';
  console.log('Selected part:', { partNumber, partDescription });
}

// ── Get TO and CC emails from Access sheet ──────────────────
// TO: All people for the specific branch
// CC: ASC CC team + Always CC team
async function getBranchEmailList(branchName) {
  try {
    const url = sheetUrl(CONFIG.ACCESS_SHEET);
    const resp = await fetch(url);
    if (!resp.ok) return { toEmails: [], ccEmails: [], ascName: null };
    const csv = await resp.text();
    const rows = parseCSV(csv);

    const branchCol = 'If Branch has pending';
    const emailCol = 'Email';
    const ascCol = 'ASC';

    let toEmails = [];
    let ccEmails = [];
    let ascName = null;

    // First pass: find TO emails and ASC name
    for (const row of rows) {
      const rowBranch = (row[branchCol] || '').trim();
      const email = (row[emailCol] || '').trim();

      if (rowBranch.toLowerCase() === branchName.toLowerCase()) {
        if (email) toEmails.push(email);
        if (!ascName) ascName = (row[ascCol] || '').trim();
      }
    }

    // Second pass: get CC emails
    // 1. All people where "If Branch has pending" = "{ASC} CC" (e.g., "ZAM CC")
    // 2. All people where "If Branch has pending" = "Always CC"
    for (const row of rows) {
      const rowBranch = (row[branchCol] || '').trim();
      const email = (row[emailCol] || '').trim();

      if (email && !toEmails.includes(email)) {
        // Check for ASC CC entries (e.g., "ZAM CC")
        if (ascName && rowBranch.toLowerCase() === (ascName + ' CC').toLowerCase()) {
          ccEmails.push(email);
        }
        // Check for Always CC entries
        else if (rowBranch.toLowerCase() === 'always cc') {
          ccEmails.push(email);
        }
      }
    }

    return {
      toEmails: toEmails,
      ccEmails: ccEmails,
      ascName: ascName
    };
  } catch (err) {
    console.error('getBranchEmailList error:', err);
    return { toEmails: [], ccEmails: [], ascName: null };
  }
}

// ── Submit request ─────────────────────────────────────────────
async function submitPartsRequest() {
  const orderNo   =(document.getElementById('pm-order-no')?.value ||'').trim();
  const partName  =(document.getElementById('pm-part-name')?.value||'').trim();
  const partCode  =(document.getElementById('pm-part-code')?.value||'').trim();
  const qty       =(document.getElementById('pm-qty')?.value      ||'1').trim();
  const branch    =(document.getElementById('pm-branch')?.value   ||'').trim();
  const notes     =(document.getElementById('pm-notes')?.value    ||'').trim();
  const model     =(document.getElementById('pm-model')?.value    ||'').trim();
  const serialNum =(document.getElementById('pm-serial')?.value   ||'').trim();

  if(!orderNo){alert('Order Number is required (GD…)');return;}
  if(!partName&&!partCode){alert('Please enter part name or part number.');return;}

  const requestDate=new Date().toISOString().split('T')[0];
  logActivity(`Parts Request — Order:${orderNo} Part:${partName||partCode} Branch:${branch}`);

  console.log('submitPartsRequest: Collected form data', {
    orderNo, partName, partCode, qty, branch, notes, model, serialNum
  });

  // Add to in-memory status board immediately
  PENDING_BOARD.unshift({
    id:      'REQ-'+Date.now().toString().slice(-4),
    orderNo, part:partName||partCode, code:partCode,
    branch, qty, status:'pending',
    time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}), awb:'',
    model, serialNumber:serialNum,
  });

  // Extract ASC code from branch name (e.g., "Dammam - ZAM" → "ZAM")
  const ascCode = (branch || '').split('-').pop().trim();

  if(HEARTBEAT_URL){
    try{
      const payload = {
        action:'parts_request',sheet:CONFIG.PARTS_SHEET,
        orderNumber:orderNo,partNumber:partCode,partDesc:partName,
        awb:'',requestDate,finalStatus:'Pending',branch,qty,notes,
        model:model,serialNumber:serialNum,
        requestedBy:_currentEmail||'—',asc:ascCode||'—',
      };
      console.log('Sending parts request to:', HEARTBEAT_URL, payload);

      const resp = await fetch(HEARTBEAT_URL,{method:'POST',mode:'no-cors',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });

      console.log('Parts request fetch response status:', resp.status, resp.type);
      console.log('✅ Parts request sent to Google Apps Script');
    }catch(e){
      console.error('❌ Parts sheet write error:', e.message);
      alert(`⚠️ Error sending to sheet: ${e.message}`);
    }
  } else {
    console.error('❌ HEARTBEAT_URL not configured');
    alert('⚠️ HEARTBEAT_URL not configured - cannot save to sheet');
  }

  // Email routing for spare parts request
  // Logic: Open mailto with TO: SVC Center email, CC: ASC + Always CC
  const emailData = await getBranchEmailList(branch);

  let to = emailData.svcEmail || 'arslan.s@auxair.com'; // Fallback to Arslan if SVC email not found
  const uniqueCC = [...new Set(emailData.ccEmails)].filter(e => e);
  const cc = encodeURIComponent(uniqueCC.join(';'));

  const sub = encodeURIComponent(`Parts Request — ${orderNo} — ${branch}`);
  const body = encodeURIComponent(
    `Dear Parts Team,\n\nNew spare part request:\n\n`+
    `Order Number : ${orderNo}\nBranch       : ${branch}\nASC          : ${emailData.ascName||'—'}\n`+
    `Part Name    : ${partName}\nPart Number  : ${partCode}\nQuantity     : ${qty}\n`+
    `Model        : ${model||'—'}\nSerial Number: ${serialNum||'—'}\nNotes        : ${notes||'—'}\n`+
    `Requested By : ${_currentEmail||'AUX ASC Dashboard'}\nDate         : ${requestDate}\n\n`+
    `Please process and update AWB in the Parts sheet.\n\nAUX ASC Dashboard — Created by Moahed Younes`
  );

  console.log('Parts request email:', {to, cc: uniqueCC, subject: `Parts Request — ${orderNo} — ${branch}`});
  window.open(`mailto:${to}?cc=${cc}&subject=${sub}&body=${body}`,'_blank');
  document.getElementById('parts-modal-overlay')?.remove();
  alert(`✅ Request submitted!\n\nOrder: ${orderNo}\nPart: ${partName||partCode}`);
}

// ── Reminder email (after request sent) ───────────────────────
async function sendPartsReminder(ticketNo, branch, partDesc) {
  const emailData = await getBranchEmailList(branch);

  const to = emailData.svcEmail || 'arslan.s@auxair.com';
  const uniqueCC = [...new Set(emailData.ccEmails)].filter(e => e);
  const cc = encodeURIComponent(uniqueCC.join(';'));

  const sub=encodeURIComponent(`Parts Status Update Needed — ${ticketNo} — ${branch}`);
  const body=encodeURIComponent(
    `Dear Parts Team,\n\nFollow-up reminder for pending spare part request.\n\n`+
    `Order Number : ${ticketNo}\nBranch       : ${branch}\nASC          : ${emailData.ascName||'—'}\n`+
    `Part Required: ${partDesc}\nRequested By : ${_currentEmail||'AUX ASC Dashboard'}\n`+
    `Date         : ${new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}\n\n`+
    `Please provide a status update — has it been shipped? What is the AWB?\n\n`+
    `AUX ASC Dashboard — Created by Moahed Younes`
  );
  window.open(`mailto:${to}?cc=${cc}&subject=${sub}&body=${body}`,'_blank');
  logActivity(`Parts Reminder — ${ticketNo} · ${branch}`);
}

// ── EXPORT: Parts Return Summary to CSV ────────────────
async function doExcelExportPartsReturn(){
  // Ensure data is loaded
  if(!PARTS_DB.loaded) await loadPartsData();
  const tx = getFilteredTx();
  const summary = buildPartsReturnSummary(tx);

  // Export only parts with remaining > 0
  const filteredSummary = summary.filter(p=>p.remaining>0);
  const filteredTotals = {
    consumed: filteredSummary.reduce((s,p)=>s+(p.consumed||0), 0),
    returned: filteredSummary.reduce((s,p)=>s+(p.returned||0), 0),
    outstanding: filteredSummary.reduce((s,p)=>s+(p.remaining||0), 0),
  };

  const asc = DB.userASC || 'AUX';
  const dateStr = new Date().toISOString().split('T')[0];

  // Build CSV with summary header
  let csv = `"DEFECTIVE PARTS RETURN SUMMARY"\n`;
  csv += `"Service Center (ASC)","${asc}"\n`;
  csv += `"Report Date","${dateStr}"\n`;
  csv += `"Key Metrics"\n`;
  csv += `"Total Consumed",${filteredTotals.consumed}\n`;
  csv += `"Total Returned",${filteredTotals.returned}\n`;
  csv += `"Outstanding",${filteredTotals.outstanding}\n`;
  csv += `\n"Code (Branch)","Part Code","Part Name","Consumed","Returned","Remaining"\n`;

  // Data rows
  filteredSummary.forEach(p=>{
    const branch = p.branch || '—';
    const code = p.code || '—';
    const name = p.name || '—';
    csv += `"${branch} - ${code}","${code}","${name}",${p.consumed},${p.returned},${p.remaining}\n`;
  });

  // Totals row
  csv += `"","TOTAL","",${filteredTotals.consumed},${filteredTotals.returned},${filteredTotals.outstanding}\n`;

  // Download CSV
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AUX_${asc}_Parts_Return_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  logActivity(`CSV Export — Parts Return Summary · ${asc}`);
}

// ── req-btn style ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  const s=document.createElement('style');
  s.textContent=`.req-btn{background:var(--gray-50,#f9fafb);border:.5px solid var(--gray-200,#e5e7eb);border-radius:5px;padding:3px 9px;font-size:10px;font-weight:500;cursor:pointer;color:var(--gray-500,#6b7280);font-family:var(--font,sans-serif);white-space:nowrap;transition:.15s}.req-btn:hover{background:#E6F1FB;border-color:#85B7EB;color:#0C447C}`;
  document.head.appendChild(s);
});

// ── In-memory pending board (supplemented by Parts sheet) ─────
const PENDING_BOARD = []; // {id, part, code, branch, qty, status, time, orderNo}

function buildPendingBoard() {
  // Merge PENDING_BOARD with PARTS_REQUESTS from sheet
  const all = [...PENDING_BOARD];
  if (PARTS_REQUESTS.length) {
    PARTS_REQUESTS.forEach(r => {
      const id = r['Order Number'] || '';
      if (id && !all.find(x => x.orderNo === id)) {
        // Map Final Status to status category
        const finalStatus = (r['Final Status']||'Pending').toLowerCase();
        let status = 'pending';
        if (finalStatus.includes('receiv')) status = 'received';
        else if (finalStatus.includes('dispatched')) status = 'dispatched';
        else if (finalStatus.includes('unavailable') || finalStatus.includes('not available')) status = 'unavailable';
        else if (finalStatus.includes('sent')) status = 'sent';

        all.push({
          id:      'REQ-'+id.slice(-4),
          orderNo: id,
          part:    r['Part Description'] || r['Part Number'] || '—',
          code:    r['Part Number'] || '',
          branch:  r['Branch'] || '—',
          qty:     r['Qty'] || '1',
          status:  status,
          time:    r['Request Date'] || '—',
          awb:     r['AWB'] || '',
        });
      }
    });
  }
  if (!all.length) return '<div style="font-size:12px;color:var(--gray-400);padding:.5rem 0">No pending part requests</div>';

  const sMap = {
    pending:    {cls:'badge-amber', lbl:'Pending',            btnLabel:'Update Status', action:'pending'},
    dispatched: {cls:'badge-blue',  lbl:'Dispatched',        btnLabel:'Mark Received', action:'received'},
    unavailable:{cls:'badge-red',   lbl:'Part Not Available', btnLabel:null,           action:null},
    received:   {cls:'badge-green', lbl:'Received',          btnLabel:null,           action:null},
  };

  return all.slice(0,8).map((o,i)=>{
    const sm = sMap[o.status]||sMap.pending;
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
        <div style="font-size:11px;color:var(--gray-500);margin-top:3px">
          ${esc(o.branch)} · Qty: ${o.qty}
        </div>
        <div style="font-size:11px;color:var(--gray-600);font-family:monospace;margin-top:2px;font-weight:600">
          ${esc(o.orderNo || o.id)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge ${sm.cls}" style="font-size:10px">${sm.lbl}</span>
          <span style="font-size:10px;color:var(--gray-400);font-family:var(--mono)">${esc(o.time)}</span>
        </div>
        ${nextBtn}
        ${o.awb?`<button onclick="showTrackingFrame('${esc(o.awb)}')" style="background:#E6F1FB;border:.5px solid #85B7EB;border-radius:6px;padding:4px 10px;font-size:10px;font-weight:600;cursor:pointer;color:#0C447C">📦 Track ${esc(o.awb.slice(0,10))}</button>`:''}
      </div>
    </div>`;
  }).join('');
}

// ── Show status update modal with options ────────────────────
function showStatusModal(orderId, orderNo) {
  // Find the current status of the order
  let currentStatus = 'pending';
  let o = PENDING_BOARD.find(x => x.id === orderId);

  if (!o && PARTS_REQUESTS) {
    const r = PARTS_REQUESTS?.find(x => x['Order Number'] &&
      String(x['Order Number']).trim().slice(-4) === orderId.slice(-4));
    if (r) {
      currentStatus = (r['Final Status']||'Pending').toLowerCase().includes('receiv')?'received':
                     (r['Final Status']||'').toLowerCase().includes('dispatched')?'dispatched':
                     (r['Final Status']||'').toLowerCase().includes('unavailable')?'unavailable':'pending';
    }
  } else if (o) {
    currentStatus = o.status || 'pending';
  }

  const overlay = document.createElement('div');
  overlay.id = 'status-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9001;display:flex;align-items:center;justify-content:center;padding:20px';

  let buttonHTML = '';

  // Show different buttons based on current status
  if (currentStatus === 'pending') {
    buttonHTML = `
      <button onclick="updateOrderStatus('${orderId}','dispatched')"
        style="background:#003D8F;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        📦 Dispatched<br><span style="font-size:11px;opacity:0.9">Parts shipped to branch</span>
      </button>

      <button onclick="updateOrderStatus('${orderId}','unavailable')"
        style="background:#dc2626;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ❌ Part Not Available<br><span style="font-size:11px;opacity:0.9">Close request - part unavailable</span>
      </button>
    `;
  } else if (currentStatus === 'dispatched') {
    buttonHTML = `
      <button onclick="updateOrderStatus('${orderId}','received')"
        style="background:#16a34a;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ✅ Received<br><span style="font-size:11px;opacity:0.9">Parts received at branch</span>
      </button>

      <button onclick="updateOrderStatus('${orderId}','unavailable')"
        style="background:#dc2626;color:white;border:none;border-radius:8px;padding:12px 16px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">
        ❌ Part Not Available<br><span style="font-size:11px;opacity:0.9">Close request - part unavailable</span>
      </button>
    `;
  } else {
    // For unavailable or received status, just show cancel option
    buttonHTML = `
      <div style="font-size:13px;color:#6b7280;padding:12px;background:#f3f4f6;border-radius:8px">
        Current status: <strong>${currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}</strong><br>
        <span style="font-size:11px">No further updates available for this status.</span>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:12px;border:.5px solid #e5e7eb;padding:1.5rem;width:420px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2)">
      <div style="font-size:15px;font-weight:600;color:#111;margin-bottom:1rem">Update Part Request Status</div>
      <div style="font-size:13px;color:#6b7280;margin-bottom:1.5rem">Order: <span style="font-family:monospace;font-weight:600">${esc(orderNo)}</span></div>

      <div style="display:flex;flex-direction:column;gap:10px">
        ${buttonHTML}
      </div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:1.5rem;padding-top:1rem;border-top:.5px solid #f3f4f6">
        <button onclick="document.getElementById('status-modal-overlay').remove()"
          style="background:#f9fafb;border:.5px solid #d1d5db;border-radius:8px;padding:8px 18px;font-size:12px;cursor:pointer;color:#374151">Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function updateOrderStatus(orderId, newStatus) {
  // Close the modal
  document.getElementById('status-modal-overlay')?.remove();

  // Find order by ID in merged board (could be from PENDING_BOARD or PARTS_REQUESTS)
  let o = PENDING_BOARD.find(x => x.id === orderId);
  let isNewToMemory = false;

  if (!o) {
    // Not in in-memory board, look up by matching Order Number last-4 digits
    const r = PARTS_REQUESTS?.find(x => x['Order Number'] &&
      String(x['Order Number']).trim().slice(-4) === orderId.slice(-4));
    if (!r) return;
    o = {
      id:      orderId,
      orderNo: String(r['Order Number'] || '').trim(),
      part:    r['Part Description'] || r['Part Number'] || '—',
      code:    r['Part Number'] || '',
      branch:  r['Branch'] || '—',
      qty:     r['Qty'] || '1',
      status:  (r['Final Status']||'Pending').toLowerCase().includes('receiv')?'received':
               (r['Final Status']||'').toLowerCase().includes('dispatched')?'dispatched':
               (r['Final Status']||'').toLowerCase().includes('unavailable')?'unavailable':'pending',
      time:    r['Request Date'] || '—',
      awb:     r['AWB'] || '',
    };
    isNewToMemory = true;
  }

  // When moving to "dispatched" → ask for AWB (tracking number)
  if (newStatus === 'dispatched') {
    const current = o.awb || '';
    const awb = prompt('Enter tracking number (AWB):', current);
    if (awb === null) return;             // user cancelled
    const v = awb.trim();
    if (!v) { alert('Tracking number (AWB) is required.'); return; }
    o.awb = v;
  }

  o.status = newStatus;
  o.time   = 'Just now';

  // Add to in-memory board if newly created from sheet (so it takes priority in buildPendingBoard merge)
  if (isNewToMemory) {
    PENDING_BOARD.unshift(o);
  }

  // Extract ASC code from branch name (e.g., "Dammam - ZAM" → "ZAM")
  const ascCode = (o.branch || '').split('-').pop().trim();

  // Determine status text and dates
  const statusText = newStatus==='received'?'Received':newStatus==='dispatched'?'Dispatched':newStatus==='unavailable'?'Part Not Available':'Pending';
  const today = new Date().toLocaleDateString('en-GB');
  let dispatchDate = '';
  let receivingDate = '';

  if (newStatus === 'dispatched') {
    dispatchDate = today;
  } else if (newStatus === 'received') {
    receivingDate = today;
  }

  // Send status update email
  (async () => {
    const emailData = await getBranchEmailList(o.branch);
    const uniqueCC = [...new Set(emailData.ccEmails)].filter(e => e);
    const cc = encodeURIComponent(uniqueCC.join(';'));

    const to = emailData.svcEmail || 'arslan.s@auxair.com'; // TO: SVC Center
    const sub = encodeURIComponent(`Parts Status Update — ${o.orderNo} — ${statusText}`);
    const body = encodeURIComponent(
      `Dear Branch Team,\n\nParts request status update:\n\n`+
      `Order Number : ${o.orderNo}\nBranch       : ${o.branch}\nASC          : ${emailData.ascName||'—'}\n`+
      `Status       : ${statusText}\nPart Name    : ${o.part}\nPart Number  : ${o.code}\n`+
      `Quantity     : ${o.qty}\nAWB/Tracking : ${o.awb||'—'}\n`+
      (dispatchDate ? `Dispatch Date: ${dispatchDate}\n` : '')+
      (receivingDate ? `Receiving Date: ${receivingDate}\n` : '')+
      `Updated By   : ${_currentEmail||'AUX ASC Dashboard'}\nDate         : ${new Date().toLocaleDateString('en-GB')}\n\n`+
      (statusText === 'Dispatched' ? 'Parts have been dispatched. Please track using the AWB provided above.\n\n' : '')+
      (statusText === 'Received' ? 'Parts have been received at the branch.\n\n' : '')+
      (statusText === 'Part Not Available' ? 'This part is not available. Please contact the parts supervisor for alternatives.\n\n' : '')+
      `AUX ASC Dashboard — Created by Moahed Younes`
    );

    console.log('Status update email:', {to, cc: uniqueCC});
    window.open(`mailto:${to}?cc=${cc}&subject=${sub}&body=${body}`,'_blank');
  })();

  if (HEARTBEAT_URL && o.orderNo) {
    fetch(HEARTBEAT_URL,{method:'POST',mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        action:'parts_request',sheet:CONFIG.PARTS_SHEET,
        orderNumber:o.orderNo, awb:o.awb||'',
        finalStatus:statusText,
        dispatchDate:dispatchDate,
        receivingDate:receivingDate,
        requestedBy:_currentEmail||'—',
        asc:ascCode||'—',
        branch:o.branch||'—'
      })
    }).catch(()=>{});
  }
  const board=document.getElementById('parts-status-board');
  if(board) board.innerHTML=buildPendingBoard();
}

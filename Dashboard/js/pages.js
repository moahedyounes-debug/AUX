// ═══════════════════════════════
//  AUX ASC DASHBOARD · PAGES
// ═══════════════════════════════

// ── Interactive filter state ──────────────────────────
let _chartFilter = null; // {type:'reason',value:'...'} or null
function setChartFilter(type, value) {
  if (_chartFilter && _chartFilter.type===type && _chartFilter.value===value) {
    _chartFilter = null; // toggle off
  } else {
    _chartFilter = {type, value};
  }
  renderCurrentPage();
}
function clearChartFilter() { _chartFilter = null; renderCurrentPage(); }
function getFilteredRows() {
  let rows = DB.filtered;
  if (!_chartFilter) return rows;
  const f = _chartFilter;
  if (f.type==='reason')      return rows.filter(r=>r._isPending && (r._rescheduleReason||'(No reason)')===f.value);
  if (f.type==='noReason')    return rows.filter(r=>r._isPending && !r._hasRescheduleReason);
  if (f.type==='pending')     return rows.filter(r=>r._isPending);
  if (f.type==='dispatched')  return rows.filter(r=>r._isDispatchedWork);
  if (f.type==='noWorker')    return rows.filter(r=>r._isPending && !r._hasWorker);
  if (f.type==='branch')      return rows.filter(r=>r._branch===f.value);
  if (f.type==='agingCat')    return rows.filter(r=>r._isPending && r._agingCat===f.value);
  if (f.type==='category')    return rows.filter(r=>r._isPending && (r._reasonCategory||'Unspecified')===f.value);
  return rows;
}
function filterTagHtml() {
  if (!_chartFilter) return '';
  return '<div class="filter-tag">🔍 Filter: '+esc(_chartFilter.type)+' = '+esc(_chartFilter.value)+' <span class="filter-tag-x" onclick="clearChartFilter()">✕</span></div>';
}

// ── Table Sorting State ───────────────────────────────────────
let _tableSort = {};  // {pageId: {column: 'ColName', direction: 'asc|desc'}}

function setSortColumn(pageId, columnName) {
  // Initialize if not exists
  if (!_tableSort[pageId]) {
    _tableSort[pageId] = {column: columnName, direction: 'asc'};
  }
  // Toggle direction if clicking same column
  else if (_tableSort[pageId].column === columnName) {
    _tableSort[pageId].direction = _tableSort[pageId].direction === 'asc' ? 'desc' : 'asc';
  }
  // New column: reset to ascending
  else {
    _tableSort[pageId] = {column: columnName, direction: 'asc'};
  }
  renderCurrentPage();
}

function getSortIndicator(pageId, columnName) {
  if (!_tableSort[pageId]) return '';
  if (_tableSort[pageId].column !== columnName) return '';
  return _tableSort[pageId].direction === 'asc' ? ' ▲' : ' ▼';
}

function sortData(rows, columnName, direction) {
  if (!columnName || !rows || rows.length === 0) return rows;

  return [...rows].sort((a, b) => {
    let aVal = a[columnName];
    let bVal = b[columnName];

    // Handle nulls/undefined
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return direction === 'asc' ? 1 : -1;
    if (bVal == null) return direction === 'asc' ? -1 : 1;

    // Auto-detect and sort by type
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    } else if (aVal instanceof Date && bVal instanceof Date) {
      return direction === 'asc' ? aVal - bVal : bVal - aVal;
    } else {
      // String comparison
      const result = String(aVal).localeCompare(String(bVal));
      return direction === 'asc' ? result : -result;
    }
  });
}

// ── PAGE 1: KPI OVERVIEW ─────────────────────────────────────
function renderOverview(){
  const rows=DB.filtered, T=CONFIG.TARGETS;
  const total=rows.length, pend=KPI.pending(rows).length, comp=KPI.completed(rows).length;
  const pRate=KPI.pendingRate(rows), r48=KPI.rate48h(rows), r72=KPI.rate72h(rows);
  const pendNoReason=KPI.pendingNoReason(rows).length;
  const noWorker=rows.filter(r=>r._isPending&&!r._hasWorker).length;
  const monthly=KPI.byMonth(rows), mLabels=monthly.map(m=>m.label);
  const col=(v,t,hi=true)=>v===null?'gray':hi?(v>=t?'green':v>=t*.9?'amber':'red'):(v<=t?'green':v<=t*1.1?'amber':'red');

  document.getElementById('page-overview').innerHTML=`
  ${filterTagHtml()}
  <div class="insight-card"><div class="insight-icon">ℹ</div><div class="insight-text">
    <div class="insight-title">AUX ASC Overview — ${esc(DB.userASC)}</div>
    ${fmt(total)} total · ${fmt(pend)} pending (${fmtPct(pRate)}) · ${fmt(comp)} completed
  </div></div>
  <div class="kpi-grid">
    <div class="kpi-card accent"><div class="kpi-label">Total Tickets</div><div class="kpi-value">${fmt(total)}</div><div class="kpi-delta">All statuses</div></div>
    <div class="kpi-card ${col(pRate,T.PENDING_RATE,false)}" onclick="setChartFilter('pending','all')" style="cursor:pointer"><div class="kpi-label">Pending Rate</div><div class="kpi-value">${fmtPct(pRate)}</div><div class="kpi-target">Target ≤ ${T.PENDING_RATE}%</div></div>
    <div class="kpi-card ${col(r48,T.RATE_48H)}"><div class="kpi-label">48h Repair Rate</div><div class="kpi-value">${fmtPct(r48)}</div><div class="kpi-target">Target ≥ ${T.RATE_48H}%</div></div>
    <div class="kpi-card ${col(r72,T.RATE_72H)}"><div class="kpi-label">72h Repair Rate</div><div class="kpi-value">${fmtPct(r72)}</div><div class="kpi-target">Target ≥ ${T.RATE_72H}%</div></div>
    <div class="kpi-card blue"><div class="kpi-label">Completed</div><div class="kpi-value">${fmt(comp)}</div><div class="kpi-delta">of ${fmt(total)} total</div></div>
    <div class="kpi-card amber" onclick="setChartFilter('pending','all')" style="cursor:pointer"><div class="kpi-label">Pending</div><div class="kpi-value">${fmt(pend)}</div><div class="kpi-delta">Completion Result blank</div></div>
    <div class="kpi-card ${pendNoReason>0?'red':'green'}" onclick="setChartFilter('noReason','yes')" style="cursor:pointer"><div class="kpi-label">Pending No Reason</div><div class="kpi-value">${fmt(pendNoReason)}</div><div class="kpi-delta">No Reason For Rescheduling</div></div>
    <div class="kpi-card ${noWorker>0?'red':'green'}" onclick="setChartFilter('noWorker','yes')" style="cursor:pointer"><div class="kpi-label">No Worker Assigned</div><div class="kpi-value">${fmt(noWorker)}</div><div class="kpi-delta">Worker Name = blank</div></div>
  </div>
  <div class="chart-grid">
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">48h Rate — Monthly</div></div><span class="section-badge">Target ${T.RATE_48H}%</span></div><div class="chart-wrap"><canvas id="ch-ov-48h"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">72h Rate — Monthly</div></div><span class="section-badge">Target ${T.RATE_72H}%</span></div><div class="chart-wrap"><canvas id="ch-ov-72h"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">Rescheduled Tickets — Monthly</div></div></div><div class="chart-wrap"><canvas id="ch-ov-resched"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">Pending by Reschedule Reason</div></div></div><div class="chart-wrap"><canvas id="ch-ov-reason"></canvas></div></div>
  </div>
  <div class="chart-grid">
    <div class="chart-card"><div class="chart-card-title" style="margin-bottom:10px">KPI Formulas</div>
    <div class="formula-box">
<span class="formula-key">Pending</span> = <span class="formula-val">Affiliated SC ≠ blank AND Completion Result = blank</span>
<span class="formula-key">48h Rate</span> = <span class="formula-val">Completed(≤48h) ÷ Total Completed × 100</span>
<span class="formula-key">No Reason</span> = <span class="formula-val">Pending AND Reason For Rescheduling = blank</span>
<span class="formula-key">No Worker</span> = <span class="formula-val">Pending AND Worker Name = blank</span></div></div>
    <div class="chart-card"><div class="chart-card-title" style="margin-bottom:10px">Aging Formula</div>
    <div class="formula-box">
<span class="formula-key">Pending Aging</span> = <span class="formula-val">TODAY − Dispatch Point Time</span>
<span class="formula-key">Completed Aging</span> = <span class="formula-val">Completion Time − Dispatch Point Time</span></div></div>
  </div>`;

  lineChart('ch-ov-48h',mLabels,[{label:'48h %',data:monthly.map(m=>m.rate48h?+m.rate48h.toFixed(1):null),borderColor:CONFIG.COLORS.BLUE}],{scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}},plugins:{legend:{display:false}}});
  lineChart('ch-ov-72h',mLabels,[{label:'72h %',data:monthly.map(m=>m.rate72h?+m.rate72h.toFixed(1):null),borderColor:CONFIG.COLORS.BLUE3}],{scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}},plugins:{legend:{display:false}}});
  barChart('ch-ov-resched',mLabels,[{label:'With Reason',data:monthly.map(m=>m.withReason),backgroundColor:CONFIG.COLORS.AMBER}],{plugins:{legend:{display:false}}});
  // RED bars for pending reasons
  const reasons=KPI.pendingByReason(rows).slice(0,8);
  const reasonChart=hBarChart('ch-ov-reason',reasons.map(r=>truncate(r.reason,28)),reasons.map(r=>r.count),'#dc2626',{plugins:{legend:{display:false}}});
  // Click handler on reason chart
  if(reasonChart){reasonChart.options.onClick=function(e,els){if(els.length){const idx=els[0].index;setChartFilter('reason',reasons[idx].reason);}};reasonChart.update();}
}

// ── PAGE 2: MONTHLY TRENDS ────────────────────────────────────
function renderTrends(){
  const rows=DB.filtered, monthly=KPI.byMonth(rows), mLabels=monthly.map(m=>m.label), T=CONFIG.TARGETS;
  const valid=monthly.filter(m=>m.rate48h!==null);
  const best=valid.reduce((a,b)=>b.rate48h>(a?.rate48h??-1)?b:a,null);
  const worst=valid.reduce((a,b)=>b.rate48h<(a?.rate48h??999)?b:a,null);
  document.getElementById('page-trends').innerHTML=`
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
    <div class="kpi-card blue"><div class="kpi-label">Best Month (48h)</div><div class="kpi-value" style="font-size:20px">${best?best.label:'—'}</div><div class="kpi-delta">${best?fmtPct(best.rate48h):'—'}</div></div>
    <div class="kpi-card red"><div class="kpi-label">Worst Month (48h)</div><div class="kpi-value" style="font-size:20px">${worst?worst.label:'—'}</div><div class="kpi-delta">${worst?fmtPct(worst.rate48h):'—'}</div></div>
    <div class="kpi-card gray"><div class="kpi-label">Avg 48h Rate</div><div class="kpi-value">${fmtPct(avg(monthly,m=>m.rate48h))}</div><div class="kpi-target">Target ≥ ${T.RATE_48H}%</div></div>
    <div class="kpi-card gray"><div class="kpi-label">Avg 72h Rate</div><div class="kpi-value">${fmtPct(avg(monthly,m=>m.rate72h))}</div><div class="kpi-target">Target ≥ ${T.RATE_72H}%</div></div>
  </div>
  <div class="chart-grid">
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">48h &amp; 72h Rate Trend</div></div></div><div class="chart-wrap tall"><canvas id="ch-tr-rates"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">Ticket Volume</div></div></div><div class="chart-wrap tall"><canvas id="ch-tr-vol"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">Pending Trend (Duration)</div></div></div><div class="chart-wrap"><canvas id="ch-tr-pend"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div><div class="chart-card-title">Rescheduled Tickets — Monthly</div></div></div><div class="chart-wrap"><canvas id="ch-tr-resched"></canvas></div></div>
  </div>
  <div class="chart-grid single">
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Monthly Comparison</div></div><div class="chart-wrap tall"><canvas id="ch-tr-compare"></canvas></div></div>
  </div>`;
  lineChart('ch-tr-rates',mLabels,[{label:'48h %',data:monthly.map(m=>m.rate48h?+m.rate48h.toFixed(1):null),borderColor:CONFIG.COLORS.BLUE},{label:'72h %',data:monthly.map(m=>m.rate72h?+m.rate72h.toFixed(1):null),borderColor:CONFIG.COLORS.BLUE3,borderDash:[5,3]}],{scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}}});
  barChart('ch-tr-vol',mLabels,[{label:'Total',data:monthly.map(m=>m.total),backgroundColor:CONFIG.COLORS.BLUE4},{label:'Completed',data:monthly.map(m=>m.completed),backgroundColor:CONFIG.COLORS.BLUE2},{label:'Pending',data:monthly.map(m=>m.pending),backgroundColor:CONFIG.COLORS.AMBER}]);
  lineChart('ch-tr-pend',mLabels,[{label:'Pending Snapshot',data:monthly.map(m=>m.pendingDuration),borderColor:CONFIG.COLORS.RED,fill:true,backgroundColor:'rgba(220,38,38,.07)'}],{scales:{y:{beginAtZero:true}},plugins:{legend:{display:false}}});
  barChart('ch-tr-resched',mLabels,[{label:'Rescheduled',data:monthly.map(m=>m.withReason),backgroundColor:CONFIG.COLORS.AMBER}],{plugins:{legend:{display:false}}});
  barChart('ch-tr-compare',mLabels,[{label:'48h %',data:monthly.map(m=>m.rate48h?+m.rate48h.toFixed(1):null),backgroundColor:CONFIG.COLORS.BLUE},{label:'72h %',data:monthly.map(m=>m.rate72h?+m.rate72h.toFixed(1):null),backgroundColor:CONFIG.COLORS.BLUE3}],{scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}}}});
}

// ── Parts Status Cell ─────────────────────────────────────────
// For tickets with "Apply for accessory" reason → check Parts DB for tracking
function partsStatusCell(r) {
  const C = CONFIG.COLS;
  const reason = (r[C.RESCHED_REASON] || r._rescheduleReason || '').toLowerCase();
  const supp   = (r[C.RESCHED_SUPP]  || r._rescheduleRemark  || '').toLowerCase();
  const maint  = (r[C.MAINTENANCE]   || '').toLowerCase();

  // Check if this ticket needs a spare part
  const needsPart = reason.includes('accessor') || reason.includes('spare') ||
                    reason.includes('part') || reason.includes('قطعة') ||
                    supp.includes('accessor') || supp.includes('spare') ||
                    maint.includes('accessor') || maint.includes('spare part');

  if (!needsPart) return '<span style="color:var(--gray-300);font-size:11px">—</span>';

  const ticketNo = r[C.TICKET_NUM] || '';
  const branch   = r._branch || '';

  // Look up in Parts DB (Requested Spare Part sheet or Transaction sheet)
  // Match by Associated Order Number = ticketNo
  let trackingInfo = null;
  if (PARTS_DB.loaded && PARTS_DB.transactions.length) {
    const P = CONFIG.PARTS_COLS;
    const match = PARTS_DB.transactions.find(p =>
      (p[P.ORDER_NO] || '').trim() === ticketNo.trim()
    );
    if (match) {
      // Found a parts transaction for this ticket
      const awb = match._awb || match[P.REF] || '';
      if (awb) {
        trackingInfo = {
          awb,
          partName: match._partName || match[P.PART_NAME] || '',
          partCode: match._partCode || match[P.CODE] || '',
          status:   match._trackStatus || 'In Transit',
        };
      }
    }
  }

  if (trackingInfo) {
    // Has tracking → show last status with mini tracker link
    return `<div style="display:flex;flex-direction:column;gap:3px;min-width:120px">
      <span class="badge badge-blue" style="font-size:9px;cursor:pointer"
        onclick="showPartsTrackingPopup('${esc(ticketNo)}','${esc(trackingInfo.awb)}','${esc(trackingInfo.partName)}')"
        title="AWB: ${esc(trackingInfo.awb)}">
        📦 ${esc(trackingInfo.status)}
      </span>
      <span style="font-size:9px;color:var(--gray-400);font-family:var(--mono)">${esc(trackingInfo.awb.substring(0,12))}…</span>
    </div>`;
  } else {
    // No tracking → show reminder button
    const partDesc = (r[C.MAINTENANCE] || supp || 'Part required').substring(0, 40);
    return `<button onclick="handlePartsReminder('${esc(ticketNo)}','${esc(branch)}','${esc(partDesc)}')"
      style="background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;
             padding:4px 8px;font-size:10px;font-weight:600;cursor:pointer;white-space:nowrap;
             font-family:var(--font);transition:.15s"
      onmouseover="this.style.background='#fca5a5'" onmouseout="this.style.background='#fee2e2'">
      🔩 Request Part
    </button>`;
  }
}

// ── Show parts tracking popup ─────────────────────────────────
function showPartsTrackingPopup(ticketNo, awb, partName) {
  const url = `https://www.4tracking.net/tjax/track?nums=${encodeURIComponent(awb)}`;
  // Open in a small popup window
  const w = Math.min(window.innerWidth - 40, 900);
  const h = Math.min(window.innerHeight - 60, 600);
  const left = (window.innerWidth - w) / 2;
  const top  = (window.innerHeight - h) / 2;
  const popup = window.open(url, 'partstrack',
    `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`);
  if (!popup) {
    // Fallback: open in new tab
    window.open(url, '_blank');
  }
}

// ── Handle Parts Reminder (wrapper for async function) ────────
async function handlePartsReminder(ticketNo, branch, partDesc) {
  try {
    await sendPartsReminder(ticketNo, branch, partDesc);
  } catch (err) {
    console.error('Error sending parts reminder:', err);
    alert('Error sending parts reminder: ' + err.message);
  }
}

// ── PAGE 3: DAILY OPERATIONS ──────────────────────────────────
function renderDaily(){
  const allRows=DB.filtered, C=CONFIG.COLS;
  const rows=_chartFilter?getFilteredRows():allRows;
  const today=KPI.todaySchedule(allRows), pending=KPI.pending(allRows);
  const farDistance=allRows.filter(r=>r._farDistance);  // Tickets with Mileage > 60 KM
  const cityLoad=KPI.byCity(allRows);  // Q'ty by City
  const aging=KPI.agingDistribution(pending);
  const reasons=KPI.pendingByReason(allRows);
  const dispatchedWork=pending.filter(r=>r._isDispatchedWork).length;
  const noWorker=pending.filter(r=>!r._hasWorker).length;
  const activeWorkers=[...new Set(today.map(r=>r[C.WORKER]).filter(Boolean))];
  const pivot=buildPendingPivot(allRows);
  const brAlerts=branchesWithPending(allRows);
  const displayPending=_chartFilter?rows.filter(r=>r._isPending):pending;

  document.getElementById('page-daily').innerHTML=`
  ${filterTagHtml()}
  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:20px">
    <div class="kpi-card accent"><div class="kpi-label">Today's Visits</div><div class="kpi-value">${fmt(today.length)}</div><div class="kpi-delta">Rescheduled to today</div></div>
    <div class="kpi-card amber" onclick="setChartFilter('pending','all')" style="cursor:pointer"><div class="kpi-label">Total Pending</div><div class="kpi-value">${fmt(pending.length)}</div><div class="kpi-delta">Completion Result blank</div></div>
    <div class="kpi-card blue"><div class="kpi-label">Active Workers</div><div class="kpi-value">${fmt(activeWorkers.length)}</div><div class="kpi-delta">On today's schedule</div></div>
    <div class="kpi-card ${dispatchedWork>0?'red':'green'}" onclick="setChartFilter('dispatched','yes')" style="cursor:pointer"><div class="kpi-label">Dispatched (Not Accepted)</div><div class="kpi-value">${fmt(dispatchedWork)}</div><div class="kpi-delta">Status = Dispatched Work</div></div>
    <div class="kpi-card ${noWorker>0?'red':'green'}" onclick="setChartFilter('noWorker','yes')" style="cursor:pointer"><div class="kpi-label">No Worker Assigned</div><div class="kpi-value">${fmt(noWorker)}</div><div class="kpi-delta">Worker Name = blank</div></div>
  </div>
  <div class="chart-grid two-thirds">
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Aging Distribution (Pending)</div></div><div id="aging-daily" style="padding-top:8px"></div></div>
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Reschedule Reasons</div></div><div class="chart-wrap"><canvas id="ch-daily-rsn"></canvas></div></div>
  </div>
  <div class="table-card">
    <div class="table-header"><div class="table-title">Today's Visits (from Rescheduling date)</div><div class="table-count">${today.length} tickets</div></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Ticket #</th><th>Branch</th><th>Worker</th><th>Ticket Status</th><th>Aging</th><th>Reason</th><th>Date</th><th>Remark</th><th>Parts</th></tr></thead>
      <tbody>${today.length===0?'<tr><td colspan="9" class="table-empty">No visits scheduled for today</td></tr>':
        today.map(r=>'<tr>'+
          '<td class="ticket-id">'+esc(r[C.TICKET_NUM])+'</td><td>'+esc(r._branch)+'</td>'+
          '<td>'+(r._hasWorker?esc(r[C.WORKER]):'<span class="badge badge-red">Unassigned</span>')+'</td>'+
          '<td>'+ticketStatusBadge(r)+'</td><td>'+agingBadge(r._agingHours)+'</td>'+
          '<td>'+esc(r._rescheduleReason||'—')+'</td>'+
          '<td class="text-mono">'+fmtDate(r._rescheduled)+'</td>'+
          '<td>'+esc(r._rescheduleRemark||'—')+'</td>'+
          '<td>'+partsStatusCell(r)+'</td></tr>').join('')}
      </tbody></table></div>
  </div>
  <div class="table-card">
    <div class="table-header"><div class="table-title">${_chartFilter?'Filtered Pending Tickets':'All Pending Tickets'}</div><div class="table-count">${displayPending.length} tickets</div></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Ticket #</th><th>Branch</th><th>Worker</th><th>Ticket Status</th><th>Aging</th><th>Reason</th><th>Date</th><th>Remark</th><th>Parts</th></tr></thead>
      <tbody>${displayPending.slice(0,80).map(r=>'<tr>'+
        '<td class="ticket-id">'+esc(r[C.TICKET_NUM])+'</td><td>'+esc(r._branch)+'</td>'+
        '<td>'+(r._hasWorker?esc(r[C.WORKER]):'<span class="badge badge-red">Unassigned</span>')+'</td>'+
        '<td>'+ticketStatusBadge(r)+'</td><td>'+agingBadge(r._agingHours)+'</td>'+
        '<td>'+esc(r._rescheduleReason||'—')+'</td>'+
        '<td class="text-mono">'+esc(r._rescheduleDate?r._rescheduleDate.substring(0,10):'—')+'</td>'+
        '<td>'+esc(r._rescheduleRemark||'—')+'</td>'+
        '<td>'+partsStatusCell(r)+'</td></tr>').join('')}
      ${displayPending.length>80?'<tr><td colspan="9" class="text-center text-sm" style="color:var(--gray-400);padding:12px">Showing 80 of '+displayPending.length+'</td></tr>':''}
      </tbody></table></div>
  </div>
  <div class="section-header"><div class="section-title">Pending Summary — Pivot (Branch × Aging)</div></div>
  <div class="table-card">
    <div class="table-header"><div class="table-title">Pending by Service Center &amp; Aging</div><div class="table-count">${pivot.totalPending} pending</div></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Service Center</th>${pivot.cols.map(c=>'<th>'+c+'</th>').join('')}<th class="fw-600">Total</th></tr></thead>
      <tbody>${pivot.rows.map(r=>'<tr style="cursor:pointer" onclick="setChartFilter(\'branch\',\''+esc(r.branch)+'\')">'+
        '<td class="fw-600">'+esc(r.branch)+'</td>'+
        pivot.cols.map(c=>'<td class="text-mono">'+(r[c]||'')+'</td>').join('')+
        '<td class="fw-600 text-mono">'+r.total+'</td></tr>').join('')}
      ${pivot.rows.length===0?'<tr><td colspan="'+(pivot.cols.length+2)+'" class="table-empty">No pending tickets</td></tr>':''}
      </tbody></table></div>
  </div>
  <div class="section-header"><div class="section-title">Load by City</div></div>
  <div class="table-card">
    <div class="table-header"><div class="table-title">Registration Q'ty &amp; Closed Q'ty by City</div><div class="table-count">${cityLoad.length} cities</div></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>City</th><th class="text-mono">Registration</th><th class="text-mono">Closed</th><th class="text-mono">Pending</th><th class="text-mono">Pending %</th><th class="text-mono">48h Rate</th><th class="text-mono">72h Rate</th></tr></thead>
      <tbody>${cityLoad.length===0?'<tr><td colspan="7" class="table-empty">No data available</td></tr>':
        cityLoad.map(c=>'<tr>'+
          '<td class="fw-600">'+esc(c.city)+'</td>'+
          '<td class="text-mono text-center">'+c.registration+'</td>'+
          '<td class="text-mono text-center">'+c.closed+'</td>'+
          '<td class="text-mono text-center">'+c.pending+'</td>'+
          '<td class="text-mono text-center">'+fmtPct(c.pendingRate)+'</td>'+
          '<td class="text-mono text-center">'+fmtPct(c.rate48h)+'</td>'+
          '<td class="text-mono text-center">'+fmtPct(c.rate72h)+'</td></tr>').join('')}
      </tbody></table></div>
  </div>
  ${DB.isAdmin&&brAlerts.length>0?`
  <div class="section-header"><div class="section-title">Branch Alerts — Pending Notification</div><span class="section-badge">Admin Only</span></div>
  <div class="table-card">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Branch</th><th>Pending</th><th>No Reason</th><th>Visit Today</th><th>Action</th></tr></thead>
      <tbody>${brAlerts.map(b=>'<tr>'+
        '<td class="fw-600">'+esc(b.branch)+'</td>'+
        '<td class="text-mono">'+b.count+'</td>'+
        '<td class="text-mono'+(b.noReason>0?' color-danger fw-600':'')+'">'+b.noReason+'</td>'+
        '<td>'+(b.todayVisit?'<span class="badge badge-green">Yes</span>':'<span class="badge badge-gray">No</span>')+'</td>'+
        '<td><button class="export-btn excel" style="padding:4px 12px;font-size:11px" onclick="sendBranchAlert(\''+esc(b.branch)+'\')">📧 Send Alert</button></td></tr>').join('')}</tbody>
    </table></div>
  </div>`:''}`;
  renderAgingBars('aging-daily',aging,pending.length);
  const topReasons=reasons.slice(0,8);
  const rsnColors=topReasons.map(r=>r.reason==='(No reason)'?'#dc2626':'#003D8F');
  const rsnChart=barChart('ch-daily-rsn',topReasons.map(r=>truncate(r.reason,20)),[{label:'Count',data:topReasons.map(r=>r.count),backgroundColor:rsnColors}],{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}});
  if(rsnChart){rsnChart.options.onClick=function(e,els){if(els.length){const idx=els[0].index;setChartFilter('reason',topReasons[idx].reason);}};rsnChart.update();}
}

// ── PAGE 4: PENDING ANALYSIS ──────────────────────────────────
function renderPending(){
  const rows=DB.filtered, C=CONFIG.COLS;
  const pending=KPI.pending(rows), byBranch=KPI.pendingByBranch(rows);
  const byWorker=KPI.pendingByWorker(rows), byProduct=KPI.pendingByProduct(rows);
  const byReason=KPI.pendingByReason(rows), aging=KPI.agingDistribution(pending);
  const causes=KPI.analyzeDelayReasons(rows);
  const farCount=pending.filter(r=>r._farDistance).length;
  const pendNoReason=KPI.pendingNoReason(rows).length;
  // Category from Pending Reason sheet
  const catMap={};
  pending.forEach(r=>{const c=r._reasonCategory||'Unspecified';catMap[c]=(catMap[c]||0)+1;});
  const categories=Object.entries(catMap).sort(([,a],[,b])=>b-a).map(([cat,count])=>({cat,count}));

  document.getElementById('page-pending').innerHTML=`
  ${filterTagHtml()}
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
    <div class="kpi-card accent"><div class="kpi-label">Total Pending</div><div class="kpi-value">${fmt(pending.length)}</div></div>
    <div class="kpi-card amber"><div class="kpi-label">Pending Rate</div><div class="kpi-value">${fmtPct(KPI.pendingRate(rows))}</div><div class="kpi-target">Target ≤ ${CONFIG.TARGETS.PENDING_RATE}%</div></div>
    <div class="kpi-card ${farCount>0?'red':'green'}"><div class="kpi-label">Far Distance (>60km)</div><div class="kpi-value">${fmt(farCount)}</div></div>
    <div class="kpi-card ${pendNoReason>0?'red':'green'}" onclick="setChartFilter('noReason','yes')" style="cursor:pointer"><div class="kpi-label">Pending No Reason</div><div class="kpi-value">${fmt(pendNoReason)}</div></div>
  </div>
  ${categories.length>0?`
  <div class="section-header"><div class="section-title">Delay Categories (from Pending Reason sheet)</div><span class="section-badge">Auto-Mapped</span></div>
  <div class="chart-grid two-thirds">
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">By Category</div></div><div class="chart-wrap"><canvas id="ch-pend-cat"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Category Summary</div></div>
      <div class="table-scroll"><table class="data-table"><thead><tr><th>Category</th><th>Count</th><th>%</th></tr></thead>
      <tbody>${categories.map(c=>'<tr style="cursor:pointer" onclick="setChartFilter(\'category\',\''+esc(c.cat)+'\')"><td class="fw-600">'+esc(c.cat)+'</td><td class="text-mono">'+c.count+'</td><td class="text-mono">'+fmtPct(pending.length?c.count/pending.length*100:null)+'</td></tr>').join('')}</tbody></table></div>
    </div>
  </div>`:''}
  <div class="section-header"><div class="section-title">Delay Reason Analysis</div></div>
  <div class="table-card mb-20">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Reason</th><th>Count</th><th>%</th><th>Avg Aging</th></tr></thead>
      <tbody>${causes.map(c=>'<tr><td><span class="badge" style="background:'+c.badgeBg+';color:'+c.badge+'">'+esc(c.label)+'</span></td><td class="fw-600 text-mono">'+fmt(c.count)+'</td><td class="text-mono">'+fmtPct(pending.length?c.count/pending.length*100:null)+'</td><td class="text-mono">'+(c.avgAging!==null?fmt(c.avgAging,1)+'h':'—')+'</td></tr>').join('')}</tbody>
    </table></div>
  </div>
  <div style="margin-bottom:22px">
  ${causes.map(cat=>{
    var pct=pending.length?Math.round(cat.count/pending.length*100):0;
    var topBr=cat.branches.slice(0,4).map(b=>'<span class="badge badge-blue" style="margin:2px">'+esc(b.branch)+' · '+b.count+'</span>').join('');
    var topTe=cat.technicians.slice(0,4).map(t=>'<span class="badge badge-gray" style="margin:2px">'+esc(truncate(t.tech,22))+' · '+t.count+'</span>').join('');
    return '<div class="analysis-card '+cat.color+'"><div class="flex-between" style="margin-bottom:8px"><span class="analysis-badge" style="background:'+cat.badgeBg+';color:'+cat.badge+'">'+esc(cat.label)+' · '+cat.count+' ('+pct+'%)</span><span style="font-size:11px;color:var(--gray-400);font-family:var(--mono)">Avg: '+(cat.avgAging!==null?fmt(cat.avgAging,1)+'h':'—')+'</span></div>'+(topBr?'<div style="margin-top:6px"><div style="font-size:9px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Branches</div>'+topBr+'</div>':'')+(topTe?'<div style="margin-top:8px"><div style="font-size:9px;font-weight:600;color:var(--gray-500);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Technicians</div>'+topTe+'</div>':'')+'</div>';}).join('')}
  </div>
  <div class="chart-grid">
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">By Reason</div></div><div class="chart-wrap tall"><canvas id="ch-pend-rsn"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Aging</div></div><div class="chart-wrap short"><canvas id="ch-pend-aging"></canvas></div><div id="aging-pend" style="margin-top:10px"></div></div>
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">By Branch</div></div><div class="chart-wrap tall"><canvas id="ch-pend-br"></canvas></div></div>
    <div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">By Worker</div></div><div class="chart-wrap tall"><canvas id="ch-pend-wk"></canvas></div></div>
  </div>`;
  if(categories.length)barChart('ch-pend-cat',categories.map(c=>truncate(c.cat,20)),[{label:'Count',data:categories.map(c=>c.count),backgroundColor:PAL}],{plugins:{legend:{display:false}}});
  hBarChart('ch-pend-rsn',byReason.map(r=>truncate(r.reason,28)),byReason.map(r=>r.count),'#dc2626');
  donutChart('ch-pend-aging',aging.map(a=>a.label),aging.map(a=>a.count),{cutout:'60%'});
  renderAgingBars('aging-pend',aging,pending.length);
  hBarChart('ch-pend-br',byBranch.map(b=>truncate(b.branch,22)),byBranch.map(b=>b.count),CONFIG.COLORS.BLUE3);
  hBarChart('ch-pend-wk',byWorker.slice(0,10).map(w=>truncate(w.worker,22)),byWorker.slice(0,10).map(w=>w.count),CONFIG.COLORS.TEAL);
}

// ── PAGE 5: BRANCH COMPARISON ─────────────────────────────────
function renderBranches(){
  var rows=DB.filtered, branches=KPI.byBranch(rows), T=CONFIG.TARGETS;
  document.getElementById('page-branches').innerHTML=
  '<div class="insight-card"><div class="insight-icon">📊</div><div class="insight-text"><div class="insight-title">Branch Ranking — '+esc(DB.userASC)+'</div>'+branches.length+' branches · Score = 40% 48h + 35% 72h + 25% Resolution</div></div>'+
  '<div class="chart-grid"><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">48h Rate</div><span class="section-badge">Target '+T.RATE_48H+'%</span></div><div class="chart-wrap tall"><canvas id="ch-br-48"></canvas></div></div><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">72h Rate</div><span class="section-badge">Target '+T.RATE_72H+'%</span></div><div class="chart-wrap tall"><canvas id="ch-br-72"></canvas></div></div><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Pending Rate</div></div><div class="chart-wrap"><canvas id="ch-br-pend"></canvas></div></div><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Rescheduled</div></div><div class="chart-wrap"><canvas id="ch-br-rsch"></canvas></div></div></div>'+
  '<div class="table-card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Rank</th><th>Branch</th><th>Total</th><th>Pending</th><th>Pending Rate</th><th>48h Rate</th><th>72h Rate</th><th>Score</th></tr></thead><tbody>'+
  branches.map(function(b,i){return '<tr onclick="setChartFilter(\'branch\',\''+esc(b.branch)+'\')" style="cursor:pointer"><td><div class="rank-num '+(i===0?'gold':i===1?'silver':i===2?'bronze':'other')+'" style="display:inline-flex">'+(i+1)+'</div></td><td class="fw-600">'+esc(b.branch)+'</td><td class="text-mono">'+fmt(b.total)+'</td><td class="text-mono">'+fmt(b.pending)+'</td><td>'+targetBadge(b.pendingRate,T.PENDING_RATE,false)+'</td><td>'+targetBadge(b.rate48h,T.RATE_48H)+'</td><td>'+targetBadge(b.rate72h,T.RATE_72H)+'</td><td><span class="badge '+(b.score>=80?'badge-green':b.score>=60?'badge-blue':'badge-amber')+'">'+fmt(b.score,1)+'</span></td></tr>';}).join('')+
  '</tbody></table></div></div>';
  var bl=branches.map(function(b){return truncate(b.branch,20);});
  hBarChart('ch-br-48',bl,branches.map(function(b){return b.rate48h?+b.rate48h.toFixed(1):null;}),CONFIG.COLORS.BLUE,{scales:{x:{max:100}}});
  hBarChart('ch-br-72',bl,branches.map(function(b){return b.rate72h?+b.rate72h.toFixed(1):null;}),CONFIG.COLORS.BLUE3,{scales:{x:{max:100}}});
  hBarChart('ch-br-pend',bl,branches.map(function(b){return b.pendingRate?+b.pendingRate.toFixed(1):null;}),CONFIG.COLORS.AMBER);
  hBarChart('ch-br-rsch',bl,branches.map(function(b){var bRows=DB.filtered.filter(function(r){return r._branch===b.branch;});return bRows.filter(function(r){return r._hasRescheduleReason;}).length;}),CONFIG.COLORS.TEAL);
}

// ── PAGE 6: REJECTED / RETURNED / OBM ────────────────────────
function renderRejected(){
  var rows=DB.filtered, C=CONFIG.COLS;
  var rej=KPI.rejectedOnly(rows), ret=KPI.returnedOnly(rows), obm=KPI.obmOnly(rows);
  var all=KPI.rejectedAll(rows);
  var aging=KPI.agingDistribution(all);
  var byBr=KPI.rejectedByBranch(rows), byWk=KPI.rejectedByWorker(rows);
  document.getElementById('page-rejected').innerHTML=
  '<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">'+
    '<div class="kpi-card red"><div class="kpi-label">Rejected</div><div class="kpi-value">'+fmt(rej.length)+'</div><div class="kpi-delta">Refusal (worker)</div></div>'+
    '<div class="kpi-card amber"><div class="kpi-label">Returned</div><div class="kpi-value">'+fmt(ret.length)+'</div><div class="kpi-delta">Rejected upon review</div></div>'+
    '<div class="kpi-card blue"><div class="kpi-label">OBM Statement</div><div class="kpi-value">'+fmt(obm.length)+'</div><div class="kpi-delta">Cancel + OBM</div></div>'+
    '<div class="kpi-card gray"><div class="kpi-label">Combined</div><div class="kpi-value">'+fmt(all.length)+'</div><div class="kpi-delta">'+(rows.length?fmtPct(all.length/rows.length*100):'—')+' of total</div></div></div>'+
  '<div class="chart-grid"><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Type Breakdown</div></div><div class="chart-wrap"><canvas id="ch-rj-type"></canvas></div></div><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">Aging</div></div><div id="aging-rj" style="padding-top:8px"></div></div><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">By Branch</div></div><div class="chart-wrap"><canvas id="ch-rj-br"></canvas></div></div><div class="chart-card"><div class="chart-card-header"><div class="chart-card-title">By Technician</div></div><div class="chart-wrap"><canvas id="ch-rj-wk"></canvas></div></div></div>'+
  '<div class="table-card"><div class="table-header"><div class="table-title">Rejected / Returned / OBM</div><div class="table-count">'+all.length+' records</div></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Ticket #</th><th>Branch</th><th>Worker</th><th>Type</th><th>Phase</th><th>Result</th><th>Service Info</th><th>Aging</th></tr></thead><tbody>'+
  (all.length===0?'<tr><td colspan="8" class="table-empty">No records found</td></tr>':
  all.slice(0,60).map(function(r){return '<tr><td class="ticket-id">'+esc(r[C.TICKET_NUM])+'</td><td>'+esc(r._branch)+'</td><td>'+esc(r[C.WORKER]||'—')+'</td><td>'+statusBadge(r)+'</td><td>'+esc(r[C.PHASE]||'—')+'</td><td>'+esc(r[C.COMPLETION_RESULT]||'—')+'</td><td>'+esc(truncate(r[C.SERVICE_INFO]||r[C.SERVICE_TYPE]||'—',30))+'</td><td>'+agingBadge(r._agingHours)+'</td></tr>';}).join(''))+
  '</tbody></table></div></div>';
  donutChart('ch-rj-type',['Rejected','Returned','OBM Statement'],[rej.length,ret.length,obm.length],{plugins:{legend:{position:'right'}}});
  renderAgingBars('aging-rj',aging,all.length);
  hBarChart('ch-rj-br',byBr.map(function(b){return truncate(b.branch,22);}),byBr.map(function(b){return b.count;}),CONFIG.COLORS.RED);
  hBarChart('ch-rj-wk',byWk.slice(0,10).map(function(w){return truncate(w.worker,22);}),byWk.slice(0,10).map(function(w){return w.count;}),CONFIG.COLORS.GRAY);
}

// ── PAGE 7: EXPORT CENTER ─────────────────────────────────────
function renderExport(){
  var rows=DB.filtered, pending=KPI.pending(rows), comp=KPI.completed(rows);
  var r48=KPI.rate48h(rows), r72=KPI.rate72h(rows), monthly=KPI.byMonth(rows);
  document.getElementById('page-export').innerHTML=
  '<div class="insight-card"><div class="insight-icon">📤</div><div class="insight-text"><div class="insight-title">Export Center — '+esc(DB.userASC)+'</div>'+fmt(rows.length)+' tickets in view.'+(DB.isAdmin?' <span class="badge badge-blue">Admin</span>':'')+'</div></div>'+
  '<div class="export-section"><h3>📊 Raw Data — Excel (.xlsx)</h3><p>15 columns per AUX spec. Opens in Microsoft Excel.</p>'+
  '<div class="export-options"><div class="export-option selected" onclick="selectExportOpt(this,\'all\')" id="opt-all"><div class="export-opt-icon">📋</div><div class="export-opt-title">All</div><div class="export-opt-desc">'+fmt(rows.length)+' rows</div></div><div class="export-option" onclick="selectExportOpt(this,\'pending\')" id="opt-pending"><div class="export-opt-icon">⏳</div><div class="export-opt-title">Pending</div><div class="export-opt-desc">'+fmt(pending.length)+' rows</div></div><div class="export-option" onclick="selectExportOpt(this,\'completed\')" id="opt-completed"><div class="export-opt-icon">✅</div><div class="export-opt-title">Completed</div><div class="export-opt-desc">'+fmt(comp.length)+' rows</div></div></div>'+
  '<button class="export-btn excel" onclick="doExcelExport()">📥 Download Excel</button><div class="export-progress" id="prog-excel"><div class="spinner" style="border-top-color:#1D6F42"></div><span>Generating…</span></div></div>'+
  '<div class="export-section"><h3>📑 KPI Report — PowerPoint (.pptx)</h3><p>AUX-branded presentation with KPI summary, trends, branch comparison, and strategic recommendations.</p>'+
  '<button class="export-btn pptx" onclick="doPptxExport()">📥 Download PowerPoint</button><div class="export-progress" id="prog-pptx"><div class="spinner" style="border-top-color:#C43E1C"></div><span>Generating…</span></div></div>';
}

// ── Export handlers ───────────────────────────────────────────
var _exportOpt='all';
function selectExportOpt(el,v){document.querySelectorAll('#opt-all,#opt-pending,#opt-completed').forEach(function(e){e.classList.remove('selected');});el.classList.add('selected');_exportOpt=v;}

function doExcelExport(){
  var prog=document.getElementById('prog-excel');prog.style.display='flex';
  setTimeout(function(){
    var rows=DB.filtered, C=CONFIG.COLS, data;
    if(_exportOpt==='pending')data=rows.filter(function(r){return r._isPending;});
    else if(_exportOpt==='completed')data=rows.filter(function(r){return !r._isPending;});
    else data=rows;
    var headers=['Ticket Number','Service Provider Name','Worker Name','Service Information','Ticket Status','Dispatch Point Time','Rejection Of Documents','Completion Result','Service hours (H)','Appointed Date','Rescheduling','Reason For Rescheduling','The Reasons For The Modification Are Supplemented','Maintenance Instructions','Mileage'];
    function xesc(v){return String(v||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function cell(v,ci,ri){return '<c r="'+String.fromCharCode(65+ci)+(ri+1)+'" t="inlineStr"><is><t>'+xesc(v)+'</t></is></c>';}
    var allRows=[headers].concat(data.map(function(r){return [r[C.TICKET_NUM]||'',r[C.PROVIDER_NAME]||'',r[C.WORKER]||'',r[C.SERVICE_INFO]||r[C.SERVICE_TYPE]||'',r[C.STATUS]||r[C.PHASE]||'',r._dispatch?fmtDateTime(r._dispatch):'',r[C.REJECT_DOCS]||'',r[C.COMPLETION_RESULT]||'',r._serviceHours!==null?r._serviceHours.toFixed(1):'',r._appointed?fmtDate(r._appointed):'',r[C.RESCHEDULING]||'',r[C.RESCHED_REASON]||'',r[C.RESCHED_SUPP]||'',r[C.MAINTENANCE]||'',r._mileage!==null?String(r._mileage):''];}));
    var sx='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+allRows.map(function(row,ri){return '<row r="'+(ri+1)+'">'+row.map(function(v,ci){return cell(v,ci,ri);}).join('')+'</row>';}).join('')+'</sheetData></worksheet>';
    var files={'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>','_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>','xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data" sheetId="1" r:id="rId1"/></sheets></workbook>','xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>','xl/worksheets/sheet1.xml':sx};
    var blob=buildZipStore(files,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='AUX_'+DB.userASC+'_'+_exportOpt+'_'+new Date().toISOString().slice(0,10)+'.xlsx';document.body.appendChild(a);a.click();document.body.removeChild(a);
    prog.style.display='none';
  },300);
}

function doPptxExport(){
  var prog=document.getElementById('prog-pptx');prog.style.display='flex';
  setTimeout(function(){
    var rows=DB.filtered, T=CONFIG.TARGETS;
    var r48=KPI.rate48h(rows),r72=KPI.rate72h(rows),pRate=KPI.pendingRate(rows);
    var pending=KPI.pending(rows),monthly=KPI.byMonth(rows);
    var branches=KPI.byBranch(rows).slice(0,8);
    var causes=KPI.analyzeDelayReasons(rows).slice(0,5);
    var today=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    var rejAll=KPI.rejectedAll(rows);
    var W=12192000,H=6858000;
    var slides=[];
    // S1: Title
    slides.push(buildSlide(rect(0,0,W,H,'001A47')+rect(0,0,W,16000,'5BA4F5')+txb(600000,400000,4000000,800000,'AUX','FFFFFF',6000,true)+txb(600000,1200000,6000000,400000,'AIR CONDITIONER','5BA4F5',1400,false)+txb(600000,2000000,10000000,600000,'ASC Performance Dashboard','FFFFFF',3600,true)+txb(600000,2800000,10000000,400000,DB.userASC+' · '+today,'93C4FB',1800,false)+txb(600000,3800000,2500000,300000,'Total: '+rows.length,'D0E8FF',1400,true)+txb(3200000,3800000,2500000,300000,'Pending: '+fmtPct(pRate),'D0E8FF',1400,true)+txb(5800000,3800000,2500000,300000,'48h: '+fmtPct(r48),'D0E8FF',1400,true)+txb(8400000,3800000,2500000,300000,'72h: '+fmtPct(r72),'D0E8FF',1400,true)+txb(600000,H-500000,10000000,300000,'Created by Moahed Younes · AUX Air Conditioner','5BA4F5',1000,false),'001A47'));
    // S2: KPIs
    slides.push(buildSlide(txb(400000,200000,W-800000,450000,'KPI Summary — '+DB.userASC,'111318',2800,true)+txb(400000,700000,2800000,300000,'Total Tickets','003D8F',1200,true)+txb(400000,1000000,2800000,600000,String(rows.length),'111318',4000,true)+txb(3400000,700000,2800000,300000,'Pending Rate','D97706',1200,true)+txb(3400000,1000000,2800000,600000,fmtPct(pRate),'111318',4000,true)+txb(6400000,700000,2800000,300000,'48h Rate','003D8F',1200,true)+txb(6400000,1000000,2800000,600000,fmtPct(r48),r48>=T.RATE_48H?'16A34A':'DC2626',4000,true)+txb(9400000,700000,2800000,300000,'72h Rate','003D8F',1200,true)+txb(9400000,1000000,2800000,600000,fmtPct(r72),r72>=T.RATE_72H?'16A34A':'DC2626',4000,true)+txb(400000,1800000,W-800000,300000,'Rejected: '+rejAll.length+' · No Reason: '+KPI.pendingNoReason(rows).length+' · No Worker: '+rows.filter(function(r){return r._isPending&&!r._hasWorker;}).length,'5a607a',1100,false)+txb(400000,2400000,W-800000,300000,'Monthly Trend (Last 6)','111318',1600,true)+monthly.slice(-6).map(function(m,i){var x=400000+i*1900000;return txb(x,2800000,1800000,300000,m.label,'5a607a',1000,true)+txb(x,3100000,1800000,300000,'48h: '+(m.rate48h?fmtPct(m.rate48h):'—'),m.rate48h&&m.rate48h>=T.RATE_48H?'16A34A':'DC2626',1000,false)+txb(x,3400000,1800000,300000,'72h: '+(m.rate72h?fmtPct(m.rate72h):'—'),'5a607a',1000,false)+txb(x,3700000,1800000,300000,'Pend: '+m.pending,'D97706',1000,false);}).join('')+txb(400000,H-500000,W-800000,200000,'Created by Moahed Younes · AUX','888888',900,false),'F3F5F9'));
    // S3: Branches
    slides.push(buildSlide(txb(400000,200000,W-800000,450000,'Branch Performance','111318',2800,true)+branches.map(function(b,i){var y=800000+i*650000;var bw=Math.round((b.rate48h||0)/100*5000000);return txb(400000,y,2800000,500000,(i+1)+'. '+truncate(b.branch,28),'111318',1000,true)+rect(3400000,y+100000,bw,300000,(b.rate48h||0)>=T.RATE_48H?'003D8F':'DC2626')+txb(8600000,y,900000,500000,fmtPct(b.rate48h),(b.rate48h||0)>=T.RATE_48H?'16A34A':'DC2626',1100,true)+txb(9600000,y,1500000,500000,'Score: '+fmt(b.score,1),'5a607a',1000,false);}).join('')+txb(400000,H-500000,W-800000,200000,'Created by Moahed Younes · AUX','888888',900,false),'FFFFFF'));
    // S4: Delay Analysis
    slides.push(buildSlide(txb(400000,200000,W-800000,450000,'Delay Reason Analysis','111318',2800,true)+txb(400000,650000,W-800000,300000,pending.length+' pending in '+causes.length+' categories','5a607a',1100,false)+causes.map(function(c,i){var y=1100000+i*900000;var pct=pending.length?Math.round(c.count/pending.length*100):0;return rect(400000,y,W-800000,750000,'F3F5F9','E4E7F0')+txb(500000,y+80000,5000000,300000,c.label+' — '+c.count+' ('+pct+'%)','111318',1200,true)+txb(500000,y+400000,W-1000000,300000,'Avg Aging: '+(c.avgAging?fmt(c.avgAging,1)+'h':'—')+' · Top: '+c.branches.slice(0,3).map(function(b){return b.branch;}).join(', '),'5a607a',900,false);}).join('')+txb(400000,H-500000,W-800000,200000,'Created by Moahed Younes · AUX','888888',900,false),'FFFFFF'));
    // S5: Strategic
    slides.push(buildSlide(rect(0,0,W,H,'001A47')+rect(0,0,W,16000,'5BA4F5')+txb(600000,300000,W-1200000,500000,'Strategic Recommendations','FFFFFF',3200,true)+txb(600000,900000,W-1200000,400000,'Based on current performance analysis','93C4FB',1400,false)+txb(600000,1600000,W-1200000,400000,'✅ Strengths','5BF5A4',1600,true)+txb(600000,2000000,W-1200000,500000,(r48>=T.RATE_48H?'48h rate exceeds target at '+fmtPct(r48):'48h needs improvement')+' · '+(r72>=T.RATE_72H?'72h strong at '+fmtPct(r72):'72h below target'),'D0E8FF',1100,false)+txb(600000,2700000,W-1200000,400000,'⚠️ Areas for Improvement','FF6B6B',1600,true)+txb(600000,3100000,W-1200000,600000,(pRate>T.PENDING_RATE?'Pending '+fmtPct(pRate)+' exceeds '+T.PENDING_RATE+'% target':'Pending rate OK')+(KPI.pendingNoReason(rows).length>0?' · '+KPI.pendingNoReason(rows).length+' tickets have NO reason — enforce logging':''),'D0E8FF',1000,false)+txb(600000,3900000,W-1200000,400000,'📋 Action Items','FFFFFF',1600,true)+txb(600000,4300000,W-1200000,800000,'1. Enforce Reason For Rescheduling on all pending\n2. Review bottom 3 branches for coaching\n3. Monitor OBM statement patterns\n4. Weekly aging review for tickets > 48h\n5. Ensure all dispatched tickets are accepted within 2h','D0E8FF',1000,false)+txb(600000,H-500000,W-1200000,300000,'Created by Moahed Younes · AUX Air Conditioner','5BA4F5',1000,false),'001A47'));
    var pptx=buildPPTX(slides);
    var a=document.createElement('a');a.href=URL.createObjectURL(pptx);a.download='AUX_'+DB.userASC+'_KPI_'+new Date().toISOString().slice(0,10)+'.pptx';document.body.appendChild(a);a.click();document.body.removeChild(a);
    prog.style.display='none';
  },500);
}

// ── Shared ZIP STORE builder ──────────────────────────────────
function buildZipStore(files, mimeType){
  var enc=new TextEncoder();
  function u16(n){return new Uint8Array([n&0xff,(n>>8)&0xff]);}
  function u32(n){return new Uint8Array([n&0xff,(n>>8)&0xff,(n>>16)&0xff,(n>>24)&0xff]);}
  function cat(arrs){var t=arrs.reduce(function(s,a){return s+a.length;},0);var o=new Uint8Array(t);var off=0;for(var i=0;i<arrs.length;i++){o.set(arrs[i],off);off+=arrs[i].length;}return o;}
  function crc32(buf){var c=0xFFFFFFFF;var t=new Uint32Array(256);for(var i=0;i<256;i++){var v=i;for(var j=0;j<8;j++)v=v&1?0xEDB88320^(v>>>1):v>>>1;t[i]=v;}for(var k=0;k<buf.length;k++)c=t[(c^buf[k])&0xff]^(c>>>8);return(c^0xFFFFFFFF)>>>0;}
  var lh=[],lc=[];var offset=0;
  var keys=Object.keys(files);
  for(var fi=0;fi<keys.length;fi++){var name=keys[fi];var content=files[name];var data=enc.encode(content);var nb=enc.encode(name);var crc=crc32(data);var sz=data.length;var l=cat([new Uint8Array([0x50,0x4B,0x03,0x04]),u16(20),u16(0),u16(0),u16(0),u16(0),u32(crc),u32(sz),u32(sz),u16(nb.length),u16(0),nb,data]);lh.push({nb:nb,crc:crc,sz:sz,offset:offset});lc.push(l);offset+=l.length;}
  var central=lh.map(function(h){return cat([new Uint8Array([0x50,0x4B,0x01,0x02]),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(h.crc),u32(h.sz),u32(h.sz),u16(h.nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(h.offset),h.nb]);});
  var cdSz=central.reduce(function(s,a){return s+a.length;},0);
  var eocdr=cat([new Uint8Array([0x50,0x4B,0x05,0x06,0x00,0x00,0x00,0x00]),u16(central.length),u16(central.length),u32(cdSz),u32(offset),u16(0)]);
  var allParts=lc.concat(central).concat([eocdr]);
  return new Blob(allParts,{type:mimeType||'application/octet-stream'});
}

function txb(x,y,cx,cy,text,color,sz,bold){return '<p:sp><p:nvSpPr><p:cNvPr id="'+Math.floor(Math.random()*9000+1000)+'" name="t"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="'+x+'" y="'+y+'"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square"><a:normAutofit/></a:bodyPr><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="'+sz+'" b="'+(bold?1:0)+'" dirty="0"><a:solidFill><a:srgbClr val="'+color.replace('#','')+'"/></a:solidFill></a:rPr><a:t>'+escXml(String(text))+'</a:t></a:r></a:p></p:txBody></p:sp>';}
function rect(x,y,cx,cy,fill,border){return '<p:sp><p:nvSpPr><p:cNvPr id="'+Math.floor(Math.random()*9000+1000)+'" name="r"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="'+x+'" y="'+y+'"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="'+fill.replace('#','')+'"/></a:solidFill>'+(border?'<a:ln><a:solidFill><a:srgbClr val="'+border.replace('#','')+'"/></a:solidFill></a:ln>':'')+'</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody></p:sp>';}
function escXml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
function buildSlide(content,bg){return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="'+(bg||'FFFFFF')+'"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'+content+'</p:spTree></p:cSld><p:clrMapOvr><a:masterClr/></p:clrMapOvr></p:sld>';}
function buildPPTX(slides){
  var stypes=slides.map(function(_,i){return '<Override PartName="/ppt/slides/slide'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>';}).join('');
  var sids=slides.map(function(_,i){return '<p:sldId id="'+(256+i)+'" r:id="rId'+(i+2)+'"/>';}).join('');
  var srels=slides.map(function(_,i){return '<Relationship Id="rId'+(i+2)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide'+(i+1)+'.xml"/>';}).join('');
  var sm='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>';
  var sl='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClr/></p:clrMapOvr></p:sldLayout>';
  var th='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="AUX"><a:themeElements><a:clrScheme name="AUX"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="001A47"/></a:dk2><a:lt2><a:srgbClr val="F3F5F9"/></a:lt2><a:accent1><a:srgbClr val="003D8F"/></a:accent1><a:accent2><a:srgbClr val="5BA4F5"/></a:accent2><a:accent3><a:srgbClr val="16A34A"/></a:accent3><a:accent4><a:srgbClr val="D97706"/></a:accent4><a:accent5><a:srgbClr val="DC2626"/></a:accent5><a:accent6><a:srgbClr val="7C3AED"/></a:accent6><a:hlink><a:srgbClr val="003D8F"/></a:hlink><a:folHlink><a:srgbClr val="5BA4F5"/></a:folHlink></a:clrScheme><a:fontScheme name="AUX"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="AUX"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>';
  var files={'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>'+stypes+'</Types>','_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>','ppt/presentation.xml':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/><p:sldIdLst>'+sids+'</p:sldIdLst></p:presentation>','ppt/_rels/presentation.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'+srels+'</Relationships>','ppt/slideMasters/slideMaster1.xml':sm,'ppt/slideMasters/_rels/slideMaster1.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>','ppt/slideLayouts/slideLayout1.xml':sl,'ppt/slideLayouts/_rels/slideLayout1.xml.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>','ppt/theme/theme1.xml':th};
  slides.forEach(function(xml,i){files['ppt/slides/slide'+(i+1)+'.xml']=xml;files['ppt/slides/_rels/slide'+(i+1)+'.xml.rels']='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';});
  return buildZipStore(files,'application/vnd.openxmlformats-officedocument.presentationml.presentation');
}

// ═══════════════════════════════════════════════════════════════
// PAGE 8: DEEP INSIGHTS — Closed Tickets Analysis (>48h)
// ═══════════════════════════════════════════════════════════════
function renderInsights(){
  const rows = DB.filtered;
  const C = CONFIG.COLS;

  // ── Segment: closed tickets that took > 48 hours ──────────
  const closed48 = rows.filter(r =>
    !r._isPending &&
    r._serviceHours !== null &&
    r._serviceHours > 48
  );

  // ── Segment: Tickets with Mileage > 60 KM ─────────────────
  const farDistance = rows.filter(r => r._farDistance);

  // ── Segment: ALL closed ────────────────────────────────────
  const allClosed = rows.filter(r => !r._isPending);
  const rate48 = allClosed.length ? (allClosed.filter(r=>r._serviceHours<=48).length/allClosed.length*100) : null;

  // ── Classify completion type ───────────────────────────────
  // Troubleshooting = device fault, possible part replacement
  // Value Added     = additional service (freon, cleaning, etc)
  function classifyCompletion(r){
    const cr = (r[C.COMPLETION_RESULT]||'').toLowerCase();
    if(cr.includes('troubleshoot')) return 'troubleshooting';
    if(cr.includes('value')&&cr.includes('add')) return 'value-added';
    if(cr.includes('cancel')&&(r[C.SERVICE_INFO]||'').toUpperCase().includes('OBM')) return 'obm';
    return 'other';
  }

  const ts48 = closed48.filter(r=>classifyCompletion(r)==='troubleshooting');
  const va48 = closed48.filter(r=>classifyCompletion(r)==='value-added');

  // ── Delay reason analysis for >48h closed ─────────────────
  // Sources: Service Information, Maintenance Instructions, Reschedule reasons
  function analyzeDelay(r){
    const txt = [
      r[C.SERVICE_INFO]||'', r[C.MAINTENANCE]||'',
      r[C.RESCHED_SUPP]||'', r[C.RESCHED_REASON]||''
    ].join(' ').toLowerCase();

    if(r._mileage > 60) return 'distance';
    if(/part|spare|replacement|قطع|component|freon|فريون/.test(txt)) return 'parts';
    if(/customer|postponed|no answer|عميل|تأجيل|لم يرد|not available/.test(txt)) return 'customer';
    if(/technician|no tech|فني|schedule|routing/.test(txt)) return 'dispatch';
    return 'unspecified';
  }

  const delayCats = {
    distance:    {label:'Distance >60km',    color:'#dc2626', bg:'#fee2e2', rows:[]},
    parts:       {label:'Parts / Freon',     color:'#7c3aed', bg:'#f3f0ff', rows:[]},
    customer:    {label:'Customer Delay',    color:'#d97706', bg:'#fef3c7', rows:[]},
    dispatch:    {label:'Dispatch / Routing',color:'#003D8F', bg:'#eaf3ff', rows:[]},
    unspecified: {label:'Unspecified',       color:'#5a607a', bg:'#f3f5f9', rows:[]},
  };
  closed48.forEach(r=>{ const k=analyzeDelay(r); delayCats[k].rows.push(r); });

  // ── Appointment vs Rescheduling analysis ──────────────────
  // If Appointed Date ≠ Rescheduling → customer or center requested change
  const withReschedule = closed48.filter(r=>r._rescheduleDate&&r._rescheduleReason);
  const customerPostponed = closed48.filter(r=>{
    const txt=(r[C.RESCHED_REASON]||'').toLowerCase();
    return txt.includes('customer')||txt.includes('postpone')||txt.includes('no answer')||txt.includes('عميل');
  });

  // ── Maintenance Instructions analysis ─────────────────────
  // Format: Problem: ... / Cause: ... / Solution: ...
  function parseMaintenance(r){
    const txt = (r[C.MAINTENANCE]||'').trim();
    if(!txt || txt.length < 5) return null;
    return txt;
  }

  // ── Branch performance on >48h ────────────────────────────
  const branchMap48 = {};
  closed48.forEach(r=>{
    const b=r._branch||'Unknown';
    if(!branchMap48[b]) branchMap48[b]={branch:b,count:0,totalHours:0,parts:0,customer:0};
    branchMap48[b].count++;
    branchMap48[b].totalHours += (r._serviceHours||0);
    const d=analyzeDelay(r);
    if(d==='parts') branchMap48[b].parts++;
    if(d==='customer') branchMap48[b].customer++;
  });
  const branchRanked = Object.values(branchMap48)
    .map(b=>({...b, avgHours: b.totalHours/b.count}))
    .sort((a,b)=>b.count-a.count).slice(0,10);

  // ── Worker analysis ───────────────────────────────────────
  const workerMap = {};
  closed48.forEach(r=>{
    const w=r[C.WORKER]||'Unassigned';
    if(!workerMap[w]) workerMap[w]={worker:w,count:0,avgHours:0,total:0};
    workerMap[w].count++;
    workerMap[w].total += (r._serviceHours||0);
  });
  const workerRanked = Object.values(workerMap)
    .map(w=>({...w,avgHours:w.total/w.count}))
    .sort((a,b)=>b.count-a.count).slice(0,8);

  // ── Service hours distribution ────────────────────────────
  const hourBuckets = [
    {label:'48–72h', count: closed48.filter(r=>r._serviceHours<=72).length},
    {label:'72–96h', count: closed48.filter(r=>r._serviceHours>72&&r._serviceHours<=96).length},
    {label:'96–120h',count: closed48.filter(r=>r._serviceHours>96&&r._serviceHours<=120).length},
    {label:'>120h',  count: closed48.filter(r=>r._serviceHours>120).length},
  ];

  // ── Strategic score per branch ────────────────────────────
  // lower % of >48h = better
  const totalByBranch = {};
  allClosed.forEach(r=>{const b=r._branch||'Unknown';totalByBranch[b]=(totalByBranch[b]||0)+1;});
  const branchScored = branchRanked.map(b=>({
    ...b,
    pct: totalByBranch[b.branch]?(b.count/totalByBranch[b.branch]*100):0,
  })).sort((a,b)=>b.pct-a.pct);

  // ── Render ────────────────────────────────────────────────
  document.getElementById('page-insights').innerHTML=`

  <!-- TOP INSIGHT BANNER -->
  <div class="insight-card" style="background:linear-gradient(135deg,#001A47,#003D8F);border:none;margin-bottom:22px">
    <div class="insight-icon" style="background:rgba(255,255,255,.15);color:white;font-size:18px">📊</div>
    <div class="insight-text" style="color:white">
      <div class="insight-title" style="color:white;font-size:16px">Deep Insights — Closed Tickets Analysis (&gt;48h)</div>
      <span style="color:rgba(255,255,255,.75);font-size:13px">
        ${fmt(closed48.length)} tickets closed after 48h out of ${fmt(allClosed.length)} total closed
        (${fmtPct(allClosed.length?closed48.length/allClosed.length*100:null)} exceeded 48h target)
      </span>
    </div>
  </div>

  <!-- KPI CARDS -->
  <div class="kpi-grid" style="grid-template-columns:repeat(5,1fr);margin-bottom:22px">
    <div class="kpi-card red"><div class="kpi-label">Closed &gt;48h</div><div class="kpi-value">${fmt(closed48.length)}</div><div class="kpi-delta">Exceeded target</div></div>
    <div class="kpi-card amber"><div class="kpi-label">Troubleshooting</div><div class="kpi-value">${fmt(ts48.length)}</div><div class="kpi-delta">Device fault / parts</div></div>
    <div class="kpi-card blue"><div class="kpi-label">Value Added</div><div class="kpi-value">${fmt(va48.length)}</div><div class="kpi-delta">Extra service / freon</div></div>
    <div class="kpi-card ${customerPostponed.length>0?'amber':'green'}"><div class="kpi-label">Customer Delay</div><div class="kpi-value">${fmt(customerPostponed.length)}</div><div class="kpi-delta">Postponed / no answer</div></div>
    <div class="kpi-card gray"><div class="kpi-label">Avg Service Hours</div><div class="kpi-value">${fmt(avg(closed48,r=>r._serviceHours),1)}</div><div class="kpi-delta">For &gt;48h tickets</div></div>
  </div>

  <!-- DELAY REASON BREAKDOWN -->
  <div class="section-header"><div class="section-title">Root Cause Analysis — Why Did It Take >48h?</div><span class="section-badge">${closed48.length} tickets</span></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:22px">
    ${Object.values(delayCats).map(cat=>{
      const pct=closed48.length?Math.round(cat.rows.length/closed48.length*100):0;
      const avgH=cat.rows.length?avg(cat.rows,r=>r._serviceHours):null;
      return`<div style="background:${cat.bg};border:1px solid ${cat.color}20;border-radius:var(--r-lg);padding:16px">
        <div style="font-size:11px;font-weight:700;color:${cat.color};text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">${esc(cat.label)}</div>
        <div style="font-size:28px;font-weight:700;color:var(--gray-900);line-height:1">${cat.rows.length}</div>
        <div style="font-size:11px;color:var(--gray-500);margin-top:4px">${pct}% of &gt;48h tickets</div>
        <div style="font-size:11px;color:var(--gray-400);margin-top:2px;font-family:var(--mono)">Avg: ${avgH!==null?fmt(avgH,1)+'h':'—'}</div>
      </div>`;
    }).join('')}
  </div>

  <!-- CHARTS ROW 1 -->
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Service Hours Distribution (&gt;48h tickets)</div><div class="chart-card-sub">How long beyond 48h did they take?</div></div></div>
      <div class="chart-wrap"><canvas id="ch-ins-hours"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Completion Type Breakdown</div><div class="chart-card-sub">Troubleshooting vs Value Added vs Other</div></div></div>
      <div class="chart-wrap"><canvas id="ch-ins-type"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Delay Cause Distribution</div></div></div>
      <div class="chart-wrap"><canvas id="ch-ins-delay"></canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Top Branches — Most >48h Tickets</div></div></div>
      <div class="chart-wrap"><canvas id="ch-ins-branch"></canvas></div>
    </div>
  </div>

  <!-- APPOINTMENT VS RESCHEDULING ANALYSIS -->
  <div class="section-header"><div class="section-title">Appointment & Rescheduling Analysis</div></div>
  <div class="chart-grid two-thirds">
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Reschedule Impact on Closure Time</div><div class="chart-card-sub">Tickets rescheduled vs not — avg service hours</div></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px 0">
        <div style="text-align:center;padding:20px;background:var(--danger-bg);border-radius:var(--r-md)">
          <div style="font-size:32px;font-weight:700;color:var(--danger)">${fmt(withReschedule.length)}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px">Had reschedule reason</div>
          <div style="font-size:12px;color:var(--gray-400);font-family:var(--mono);margin-top:2px">Avg: ${fmt(avg(withReschedule,r=>r._serviceHours),1)}h</div>
        </div>
        <div style="text-align:center;padding:20px;background:var(--success-bg);border-radius:var(--r-md)">
          <div style="font-size:32px;font-weight:700;color:var(--success)">${fmt(closed48.length-withReschedule.length)}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px">No reschedule reason</div>
          <div style="font-size:12px;color:var(--gray-400);font-family:var(--mono);margin-top:2px">Avg: ${fmt(avg(closed48.filter(r=>!r._rescheduleDate||!r._rescheduleReason),r=>r._serviceHours),1)}h</div>
        </div>
      </div>
      <div style="margin-top:14px;padding:12px;background:var(--gray-50);border-radius:var(--r-sm);font-size:12px;color:var(--gray-600)">
        <strong>${fmt(customerPostponed.length)} tickets</strong> were delayed because customer postponed, didn't answer, or was unavailable.
        ${withReschedule.length>0?`Average extra hours added by rescheduling: <strong>${fmt(avg(withReschedule,r=>r._serviceHours),1)}h</strong>`:''}
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div class="chart-card-title">Top Workers — Most >48h Closures</div></div>
      <div class="chart-wrap"><canvas id="ch-ins-worker"></canvas></div>
    </div>
  </div>

  <!-- BRANCH PERFORMANCE TABLE -->
  <div class="section-header"><div class="section-title">Branch Performance — Tickets Closed >48h</div><span class="section-badge">Strategic View</span></div>
  <div class="table-card" style="margin-bottom:22px">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Branch</th><th>Total &gt;48h</th><th>% of Closed</th><th>Avg Hours</th><th>Parts Delay</th><th>Customer Delay</th><th>Action Priority</th></tr></thead>
      <tbody>${branchScored.map(b=>{
        const priority = b.pct>=40?'🔴 Critical':b.pct>=25?'🟠 High':b.pct>=15?'🟡 Medium':'🟢 Low';
        const priorityCls = b.pct>=40?'badge-red':b.pct>=25?'badge-amber':b.pct>=15?'badge-blue':'badge-green';
        return'<tr>'+
          '<td class="fw-600">'+esc(b.branch)+'</td>'+
          '<td class="text-mono">'+b.count+'</td>'+
          '<td><div style="display:flex;align-items:center;gap:8px">'+
            '<div style="flex:1;height:6px;background:var(--gray-100);border-radius:3px">'+
              '<div style="width:'+Math.min(b.pct,100).toFixed(1)+'%;height:100%;border-radius:3px;background:'+(b.pct>=40?'#dc2626':b.pct>=25?'#d97706':'#003D8F')+'"></div>'+
            '</div>'+
            '<span class="text-mono" style="font-size:11px">'+fmtPct(b.pct)+'</span>'+
          '</div></td>'+
          '<td class="text-mono">'+fmt(b.avgHours,1)+'h</td>'+
          '<td class="text-mono '+(b.parts>0?'color-danger':'')+'">'+b.parts+'</td>'+
          '<td class="text-mono '+(b.customer>0?'color-warning':'')+'">'+b.customer+'</td>'+
          '<td><span class="badge '+priorityCls+'">'+priority+'</span></td>'+
        '</tr>';
      }).join('')}</tbody>
    </table></div>
  </div>

  <!-- OVER 60 KM TICKETS -->
  <div class="section-header"><div class="section-title">Over 60 KM (Mileage)</div><span class="section-badge">${farDistance.length} tickets</span></div>
  <div class="table-card" style="margin-bottom:22px">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Ticket #</th><th>Branch</th><th>Worker</th><th>Ticket Status</th><th>Aging</th><th>Mileage</th><th>Date</th><th>Remark</th><th>Parts</th></tr></thead>
      <tbody>${farDistance.length===0?'<tr><td colspan="9" class="table-empty">No tickets with mileage over 60 KM</td></tr>':
        farDistance.map(r=>'<tr>'+
          '<td class="ticket-id">'+esc(r[C.TICKET_NUM])+'</td><td>'+esc(r._branch)+'</td>'+
          '<td>'+(r._hasWorker?esc(r[C.WORKER]):'<span class="badge badge-red">Unassigned</span>')+'</td>'+
          '<td>'+ticketStatusBadge(r)+'</td><td>'+agingBadge(r._agingHours)+'</td>'+
          '<td class="text-mono fw-600">'+fmt(r._mileage)+' KM</td>'+
          '<td class="text-mono">'+fmtDate(r._rescheduled)+'</td>'+
          '<td>'+esc(r._rescheduleRemark||'—')+'</td>'+
          '<td>'+partsStatusCell(r)+'</td></tr>').join('')}
      </tbody></table></div>
  </div>

  <!-- MAINTENANCE INSTRUCTIONS DEEP DIVE -->
  <div class="section-header"><div class="section-title">Technician Notes — Maintenance Instructions Sample</div><span class="section-badge">Latest 15 tickets</span></div>
  <div class="table-card" style="margin-bottom:22px">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Ticket #</th><th>Branch</th><th>Worker</th><th>Service Info (Problem)</th><th>Completion Type</th><th>Hours</th><th>Technician Notes</th></tr></thead>
      <tbody>${closed48.slice(0,15).map(r=>{
        const type=classifyCompletion(r);
        const typeBadge=type==='troubleshooting'?'<span class="badge badge-amber">Troubleshooting</span>':
                         type==='value-added'?'<span class="badge badge-blue">Value Added</span>':
                         '<span class="badge badge-gray">Other</span>';
        const notes=parseMaintenance(r);
        return'<tr>'+
          '<td class="ticket-id">'+esc(r[C.TICKET_NUM])+'</td>'+
          '<td style="font-size:12px">'+esc(r._branch)+'</td>'+
          '<td style="font-size:12px">'+esc(r[C.WORKER]||'—')+'</td>'+
          '<td style="font-size:11px;max-width:200px">'+esc(truncate(r[C.SERVICE_INFO]||r[C.SERVICE_TYPE]||'—',60))+'</td>'+
          '<td>'+typeBadge+'</td>'+
          '<td class="text-mono fw-600" style="color:'+(r._serviceHours>72?'#dc2626':'#d97706')+'">'+fmt(r._serviceHours,1)+'h</td>'+
          '<td style="font-size:11px;max-width:300px;white-space:pre-wrap">'+esc(truncate(notes||'—',120))+'</td>'+
        '</tr>';
      }).join('')}
      ${closed48.length===0?'<tr><td colspan="7" class="table-empty">No tickets closed after 48h</td></tr>':''}</tbody>
    </table></div>
  </div>

  <!-- STRATEGIC RECOMMENDATIONS -->
  <div class="section-header"><div class="section-title">Strategic Recommendations</div><span class="section-badge">Data-Driven</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px">
    ${buildInsightCards(closed48,delayCats,branchScored,customerPostponed,ts48,rate48)}
  </div>
  `;

  // ── Charts ──────────────────────────────────────────────────
  barChart('ch-ins-hours',hourBuckets.map(b=>b.label),[{
    label:'Tickets',data:hourBuckets.map(b=>b.count),
    backgroundColor:['#d97706','#dc2626','#7c3aed','#111318']
  }],{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}});

  const typeLabels=['Troubleshooting','Value Added','Other'];
  const typeCounts=[
    ts48.length,
    va48.length,
    closed48.length-ts48.length-va48.length
  ];
  donutChart('ch-ins-type',typeLabels,typeCounts,{plugins:{legend:{position:'right'}}});

  const dCats=Object.values(delayCats);
  hBarChart('ch-ins-delay',dCats.map(c=>c.label),dCats.map(c=>c.rows.length),
    dCats.map(c=>c.color),{plugins:{legend:{display:false}}});

  hBarChart('ch-ins-branch',branchRanked.map(b=>truncate(b.branch,22)),branchRanked.map(b=>b.count),
    CONFIG.COLORS.RED,{plugins:{legend:{display:false}}});

  hBarChart('ch-ins-worker',workerRanked.map(w=>truncate(w.worker,22)),workerRanked.map(w=>w.count),
    CONFIG.COLORS.AMBER,{plugins:{legend:{display:false}}});
}

// ── Strategic insight cards ───────────────────────────────────
function buildInsightCards(closed48,delayCats,branchScored,customerPostponed,ts48,rate48){
  const cards=[];

  // Card 1: 48h Rate status
  const rateColor = rate48>=85?'#16a34a':rate48>=70?'#d97706':'#dc2626';
  const rateIcon  = rate48>=85?'✅':rate48>=70?'⚠️':'🚨';
  cards.push({
    icon:rateIcon, title:'48h Repair Rate',
    color:rateColor, bg:rate48>=85?'#dcfce7':rate48>=70?'#fef3c7':'#fee2e2',
    body: rate48>=85
      ? 'Your 48h rate is on target. Maintain current dispatch and acceptance processes.'
      : 'Rate is '+(rate48?fmtPct(rate48):'unknown')+' — below 85% target. Focus on reducing dispatch-to-acceptance lag and customer scheduling delays.',
    action: rate48>=85?null:'Review "Dispatched – Not Accepted" phase tickets and escalate same-day.'
  });

  // Card 2: Parts/Supply chain
  const partsCount=delayCats.parts.rows.length;
  const partsPct=closed48.length?Math.round(partsCount/closed48.length*100):0;
  if(partsCount>0) cards.push({
    icon:'🔩', title:'Parts & Supply Chain Delay',
    color:'#7c3aed', bg:'#f3f0ff',
    body:partsCount+' tickets ('+partsPct+'%) required parts or freon. Avg closure: '+fmt(avg(delayCats.parts.rows,r=>r._serviceHours),1)+'h.',
    action:'Pre-stock common spare parts in high-demand branches. Track freon levels monthly.'
  });

  // Card 3: Customer behavior
  if(customerPostponed.length>0) cards.push({
    icon:'👤', title:'Customer Availability',
    color:'#d97706', bg:'#fef3c7',
    body:customerPostponed.length+' tickets delayed due to customer: no answer, postponed, or unavailable.',
    action:'Implement 3-attempt contact policy. Auto-cancel after 3 failed contact attempts and requeue.'
  });

  // Card 4: Top critical branch
  const critical=branchScored.find(b=>b.pct>=40);
  if(critical) cards.push({
    icon:'🔴', title:'Critical Branch: '+truncate(critical.branch,25),
    color:'#dc2626', bg:'#fee2e2',
    body:fmtPct(critical.pct)+' of '+critical.branch+'\'s closed tickets exceeded 48h. Avg time: '+fmt(critical.avgHours,1)+'h.',
    action:'Assign dedicated supervisor. Weekly performance review. Check technician workload distribution.'
  });

  // Card 5: Troubleshooting patterns
  if(ts48.length>0) cards.push({
    icon:'🔧', title:'Troubleshooting Pattern',
    color:'#0891b2', bg:'#ecfeff',
    body:ts48.length+' troubleshooting tickets exceeded 48h. These indicate complex faults or part availability issues.',
    action:'Build a fault knowledge base from Maintenance Instructions. Train technicians on common diagnoses.'
  });

  // Card 6: Distance
  const distCount=delayCats.distance.rows.length;
  if(distCount>0) cards.push({
    icon:'📍', title:'Distance Delays (>60km)',
    color:'#dc2626', bg:'#fee2e2',
    body:distCount+' tickets affected by distance. Consider regional technician deployment.',
    action:'Map customer locations and assign nearest certified technician automatically.'
  });

  return cards.map(c=>`
    <div style="background:${c.bg};border:1px solid ${c.color}25;border-radius:var(--r-lg);padding:18px;border-left:4px solid ${c.color}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="font-size:18px">${c.icon}</span>
        <span style="font-size:13px;font-weight:700;color:var(--gray-900)">${esc(c.title)}</span>
      </div>
      <p style="font-size:12px;color:var(--gray-700);line-height:1.6;margin-bottom:${c.action?'10px':'0'}">${esc(c.body)}</p>
      ${c.action?`<div style="background:rgba(0,0,0,.04);border-radius:var(--r-sm);padding:8px 10px;font-size:11px;color:${c.color};font-weight:600">→ ${esc(c.action)}</div>`:''}
    </div>
  `).join('');
}

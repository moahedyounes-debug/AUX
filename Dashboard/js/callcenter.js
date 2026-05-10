// ═══════════════════════════════════════════════════════════════
//  AUX ASC DASHBOARD · CALL CENTER
//  Sources:
//    Calls sheet    → KPI (SLA, AHT, THT, abandon, volume)
//    WhatsApp Uniqe → every row = 1 WhatsApp conversation
//    Evaluation     → agent scores by category/month
//
//  SLA calculation:
//    Within SLA column = 1 → within SLA, 0 → not
//    SLA Rate = Σ(Within SLA=1) / total rows × 100
//
//  Abandon calculation:
//    Event column contains "ABANDON" (case-insensitive)
//    Abandon Rate = Σ(Event contains ABANDON) / total × 100
//
//  WhatsApp:
//    Any row in WhatsApp Uniqe tab = 1 WhatsApp conversation
//    Use same Hour/Month columns for peak hours
// ═══════════════════════════════════════════════════════════════

const CC_DB = {
  calls:  [],
  wa:     [],   // WhatsApp Unique rows
  evals:  [],
  loaded: false,
  loading:false,
};

async function loadCCData() {
  if (CC_DB.loading) return;
  CC_DB.loading = true;
  try {
    const [cr, war, er] = await Promise.all([
      fetch(ccKpiUrl()),
      fetch(ccWaUrl()),
      fetch(ccEvalUrl()),
    ]);
    CC_DB.calls = cr.ok  ? parseCSV(await cr.text()).map(enrichCall)  : [];
    CC_DB.wa    = war.ok ? parseCSV(await war.text()).map(enrichWA)   : [];
    CC_DB.evals = er.ok  ? parseCSV(await er.text()).map(enrichEval)  : [];
    CC_DB.loaded = true;
  } catch(e) { console.error('CC load:', e); }
  CC_DB.loading = false;
}

// ── Enrich Call row ───────────────────────────────────────────
function enrichCall(row) {
  const C = CONFIG.CC_COLS;
  const r = {...row};

  // Month: extract from Date column (format: MM/DD/YYYY) as "YYYY-MM"
  const dateStr = r[C.DATE] ? String(r[C.DATE]) : '';
  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const month = dateMatch[1]; // MM
    const year = dateMatch[3];  // YYYY
    r._monthKey = `${year}-${String(parseInt(month)).padStart(2, '0')}`;
  } else {
    r._monthKey = '';
  }

  // Hour: Use SLAP2 if available, else HOUR
  const slap2Val = r[C.SLAP2] ? String(r[C.SLAP2]).trim() : '';
  const hourVal = r[C.HOUR] ? String(r[C.HOUR]).trim() : '';
  r._hour = parseInt(slap2Val || hourVal) || 0;

  // AHT/THT: Time value in various formats from Google Sheets export
  // Could be: "0:00:09" | "00:00:09.000" | decimal 0.000104166 (9 secs / 86400)
  const parseTime = (val) => {
    if (!val) return 0;
    const str = String(val).trim();
    if (!str) return 0;

    // Try 1: Time string format (H:MM:SS or HH:MM:SS or HH:MM:SS.mmm or H:MM:SS.mmm)
    const timeMatch = str.match(/(\d+):(\d+):(\d+)(?:\.(\d+))?/);
    if (timeMatch) {
      const h = parseInt(timeMatch[1]);
      const m = parseInt(timeMatch[2]);
      const s = parseInt(timeMatch[3]);
      return h * 3600 + m * 60 + s;
    }

    // Try 2: Decimal number (might be fraction of day or seconds)
    const num = parseFloat(str);
    if (!isNaN(num) && num !== 0) {
      // If very small (< 1), assume fraction of day
      if (num < 1) {
        return Math.round(num * 86400);
      }
      // If between 1-3600, assume seconds
      if (num >= 1 && num < 3600) {
        return Math.round(num);
      }
      // If >= 3600, assume already seconds
      return Math.round(num);
    }

    return 0;
  };
  // Try exact column name, then fallback to variations
  r._aht = parseTime(r[C.AHT] || r['Average Handle Time'] || r['handle time'] || r['AHT']);
  r._tht = parseTime(r[C.THT] || r['Total Handle Time'] || r['talk time'] || r['THT']);

  r._qty      = parseFloat(r[C.QTY])  || 1;
  r._agent    = (r[C.AGENT_NAME] || r[C.AGENT] || '').trim();
  r._callType = (r[C.CALL_TYPE] || '').trim().toUpperCase();
  r._event    = (r[C.EVENT]     || '').trim().toUpperCase();

  // SLA: Within SLA = 1 (or "yes") → true
  const w = String(r[C.WITHIN_SLA] || '').trim().toLowerCase();
  r._withinSLA   = (w === '1' || w === 'yes');

  // Abandon: Event contains "ABANDON"
  r._isAbandoned = r._event.includes('ABANDON');

  // Inbound / Outbound from Call Type (IB = Inbound, OB = Outbound)
  r._isInbound  = r._callType.includes('IB');
  r._isOutbound = r._callType.includes('OB');

  return r;
}

// ── Enrich WhatsApp row ───────────────────────────────────────
// Every row in WhatsApp Uniqe = 1 conversation
function enrichWA(row) {
  const r = {...row};

  // Month: extract from Date column (format: YYYY-MM-DD) as "YYYY-MM"
  const dateStr = r['Date'] ? String(r['Date']).trim() :
                  r['date'] ? String(r['date']).trim() : '';
  const dateMatch = dateStr.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (dateMatch) {
    const year = dateMatch[1];   // YYYY
    const month = dateMatch[2];  // MM
    r._monthKey = `${year}-${String(parseInt(month)).padStart(2, '0')}`;
  } else {
    // Fallback: use Month column if available
    r._monthKey = (r['Month'] || r['month'] || '').trim();
  }

  // Hour: Use Slap2 if available, else Hours or Hour
  const slap2Val = r['Slap2'] ? String(r['Slap2']).trim() : '';
  const hourVal = r['Hours'] ? String(r['Hours']).trim() :
                  r['Hour'] ? String(r['Hour']).trim() : '';
  r._hour = parseInt(slap2Val || hourVal) || 0;

  r._agent = (r['Agent Name'] || r['Agent'] || r['agent'] || '').trim();
  return r;
}

// ── Enrich Eval row ───────────────────────────────────────────
function enrichEval(row) {
  const C = CONFIG.EVAL_COLS;
  const r = {...row};
  r._agent    = (r[C.AGENT]    || '').trim();
  r._mYear    = (r[C.M_YEAR]   || '').trim();
  r._month    = (r[C.MONTH]    || r._mYear || '').trim();
  r._category = (r[C.CATEGORY] || '').trim();
  r._criteria = (r[C.CRITERIA] || '').trim();

  // Score comes from "Manager Evaluation" column (0-5 scale)
  // Try exact name first, then fallbacks
  let mgrEvalVal = r[C.MGR_EVAL] || r['Manager Evaluation'] || r['Manager_Evaluation'] || r['manager evaluation'] || '';

  // If not found, search all keys for columns containing "manager" AND "evaluation"
  if (!mgrEvalVal) {
    const foundKey = Object.keys(row).find(k => {
      const kLower = k.toLowerCase().replace(/\s+/g, '');
      return kLower.includes('manager') && kLower.includes('evaluation');
    });
    if (foundKey) mgrEvalVal = row[foundKey];
  }

  // Trim whitespace from the value
  mgrEvalVal = String(mgrEvalVal || '').trim();
  r._score = parseFloat(mgrEvalVal) || 0;
  r._max = 5;
  r._mgrEval = r._score;
  r._pct = r._max > 0 ? Math.round(r._score / r._max * 100) : 0;

  return r;
}

// ── Filter helpers ────────────────────────────────────────────
function filterCalls(agent, year, month, direction) {
  let d = CC_DB.calls;
  if (agent)    d = d.filter(r => r._agent === agent);
  if (month)    d = d.filter(r => r._monthKey === month);
  if (year)     d = d.filter(r => r._monthKey.startsWith(year + '-'));
  if (direction === 'Inbound')  d = d.filter(r => r._isInbound);
  if (direction === 'Outbound') d = d.filter(r => r._isOutbound);
  return d;
}
function filterWA(agent, year, month) {
  let d = CC_DB.wa;
  if (agent) d = d.filter(r => r._agent === agent);
  if (month) d = d.filter(r => r._monthKey === month);
  if (year)  d = d.filter(r => r._monthKey.startsWith(year + '-'));
  return d;
}
function filterEvals(agent, month) {
  let d = CC_DB.evals;
  if (agent) d = d.filter(r => r._agent === agent);
  if (month) {
    // month is in format "2026-04", extract the month number
    const monthParts = month.split('-');
    const monthNum = monthParts[1]; // "04"
    const monthIndex = parseInt(monthNum);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const monthName = monthNames[monthIndex - 1]; // "Apr"

    // Filter by month name (case-insensitive) or by the full month key
    d = d.filter(r => {
      const m = (r._month || '').toLowerCase();
      return m.includes(monthName.toLowerCase()) || m.includes(monthNum) || m === month;
    });
  }
  return d;
}

// ── Monthly grouping ──────────────────────────────────────────
function groupByMonthCC(rows) {
  const m = {};
  rows.forEach(r => {
    const k = r._monthKey || '—';
    if (!m[k]) m[k] = {mk:k, total:0, sla:0, abandon:0, inbound:0, outbound:0, totalAHT:0, ahtN:0, totalTHT:0, thtN:0};
    m[k].total++;
    if (r._withinSLA)   m[k].sla++;
    if (r._isAbandoned) m[k].abandon++;
    if (r._isInbound)   m[k].inbound++;
    if (r._isOutbound)  m[k].outbound++;
    if (r._aht > 0)   { m[k].totalAHT += r._aht; m[k].ahtN++; }
    if (r._tht > 0)   { m[k].totalTHT += r._tht; m[k].thtN++; }
  });
  return Object.values(m)
    .sort((a,b) => String(a.mk).localeCompare(String(b.mk)))
    .map(m => ({
      ...m,
      slaRate:     m.total ? +(m.sla / m.total * 100).toFixed(1) : null,
      abandonRate: m.total ? +(m.abandon / m.total * 100).toFixed(1) : null,
      avgAHT:      m.ahtN  ? +(m.totalAHT / m.ahtN).toFixed(0) : null,
      avgTHT:      m.thtN  ? +(m.totalTHT / m.thtN).toFixed(0) : null,
    }));
}

function groupWAByMonth(rows) {
  const m = {};
  rows.forEach(r => {
    const k = r._monthKey || '—';
    m[k] = (m[k]||0) + 1;
  });
  return Object.entries(m).sort(([a],[b])=>String(a).localeCompare(String(b))).map(([mk,count])=>({mk,count}));
}

function peakHours(calls, wa) {
  const c = Array(24).fill(0);
  const w = Array(24).fill(0);
  calls.forEach(r => { if (r._hour>=0&&r._hour<24) c[r._hour]++; });
  wa.forEach(r    => { if (r._hour>=0&&r._hour<24) w[r._hour]++; });
  return {calls:c, wa:w};
}

// ── Agent eval aggregation ────────────────────────────────────
function agentEvalSummary(evals) {
  const agents = {};
  evals.forEach(r => {
    if (!r._agent) return;
    if (!agents[r._agent]) agents[r._agent] = {agent:r._agent, cats:{}, months:{}, totalScore:0, totalMax:0};
    const a = agents[r._agent];
    a.totalScore += r._score;
    a.totalMax   += r._max;
    if (!a.cats[r._category]) a.cats[r._category] = {score:0, max:0};
    a.cats[r._category].score += r._score;
    a.cats[r._category].max   += r._max;
    if (r._month) {
      if (!a.months[r._month]) a.months[r._month] = {score:0, max:0};
      a.months[r._month].score += r._score;
      a.months[r._month].max   += r._max;
    }
  });
  return Object.values(agents).map(a => ({
    ...a,
    overallPct: a.totalMax > 0 ? Math.round(a.totalScore / a.totalMax * 100) : null,
    catPcts: Object.fromEntries(
      Object.entries(a.cats).map(([k,v]) => [k, v.max>0 ? Math.round(v.score/v.max*100) : null])
    ),
    monthPcts: Object.fromEntries(
      Object.entries(a.months).map(([k,v]) => [k, v.max>0 ? Math.round(v.score/v.max*100) : null])
    ),
  })).sort((a,b) => (b.overallPct||0)-(a.overallPct||0));
}

// ── Monthly eval table (all agents × months) ──────────────────
function monthlyEvalTable(evals) {
  const rows = {};
  evals.forEach(r => {
    const key = r._agent + '|' + r._month;
    if (!rows[key]) rows[key] = {agent:r._agent, month:r._month, cats:{}, totalScore:0, totalMax:0};
    rows[key].totalScore += r._score;
    rows[key].totalMax   += r._max;
    if (!rows[key].cats[r._category]) rows[key].cats[r._category] = {score:0, max:0};
    rows[key].cats[r._category].score += r._score;
    rows[key].cats[r._category].max   += r._max;
  });
  return Object.values(rows)
    .sort((a,b) => String(a.month).localeCompare(String(b.month)) || a.agent.localeCompare(b.agent))
    .map(r => ({
      ...r,
      overallPct: r.totalMax > 0 ? Math.round(r.totalScore / r.totalMax * 100) : null,
      catPcts: Object.fromEntries(
        Object.entries(r.cats).map(([k,v]) => [k, v.max>0 ? Math.round(v.score/v.max*100) : null])
      ),
    }));
}

// ── Render Call Center Page ───────────────────────────────────
async function renderCallCenter() {
  const el = document.getElementById('page-callcenter');
  if (!el) return;

  el.innerHTML = `<div style="padding:60px;text-align:center;color:var(--gray-400)">
    <div class="spinner" style="margin:0 auto 16px;width:32px;height:32px;border-width:3px"></div>
    <div>Loading Call Center data…</div>
  </div>`;

  if (!CC_DB.loaded) await loadCCData();

  if (!CC_DB.loaded) {
    el.innerHTML = `<div class="insight-card" style="border-color:#dc2626;background:#fee2e2">
      <div class="insight-icon" style="color:#dc2626">⚠️</div>
      <div class="insight-text">
        <div class="insight-title" style="color:#dc2626">Cannot load Call Center data</div>
        Ensure KPI sheet and Evaluation sheet are shared publicly.
      </div>
    </div>`;
    return;
  }

  // ── Current filter values ─────────────────────────────────
  const fAgent = (document.getElementById('cc-f-agent')?.value || '').trim();
  const fYear  = (document.getElementById('cc-f-year')?.value  || '').trim();
  const fMonth = (document.getElementById('cc-f-month')?.value || '').trim();
  const fChan  = (document.getElementById('cc-f-chan')?.value  || '').trim();
  const fDir   = (document.getElementById('cc-f-dir')?.value   || '').trim();

  // Apply channel filter
  let calls = filterCalls(fAgent, fYear, fMonth, fDir);
  let wa    = filterWA(fAgent, fYear, fMonth);
  if (fChan === 'Calls')     wa    = [];
  if (fChan === 'WhatsApp')  calls = [];

  // ── Overall KPIs ──────────────────────────────────────────
  const total       = calls.length;
  const slaCount    = calls.filter(r => r._withinSLA).length;
  const abandonCount= calls.filter(r => r._isAbandoned).length;
  const inbound     = calls.filter(r => r._isInbound).length;
  const outbound    = calls.filter(r => r._isOutbound).length;
  const slaRate     = total ? +(slaCount    / total * 100).toFixed(1) : null;
  const abandonRate = total ? +(abandonCount/ total * 100).toFixed(1) : null;
  const avgAHT      = avg(calls.filter(r=>r._aht>0), r=>r._aht);
  const avgTHT      = avg(calls.filter(r=>r._tht>0), r=>r._tht);
  const waTotal     = wa.length;

  // ── Monthly data ──────────────────────────────────────────
  const monthly     = groupByMonthCC(calls);
  const waMonthly   = groupWAByMonth(wa);
  const mLabels     = monthly.map(m => m.mk);
  const peak        = peakHours(calls, wa);
  const hours       = Array.from({length:24},(_,i)=>String(i).padStart(2,'0')+':00');

  // ── Eval data ─────────────────────────────────────────────
  const evalFiltered = filterEvals(fAgent, fMonth);
  const agentSummaries = agentEvalSummary(evalFiltered);
  const monthlyEvals   = monthlyEvalTable(evalFiltered);
  const categories     = [...new Set(CC_DB.evals.map(r=>r._category).filter(Boolean))].sort();

  // ── Unique agents + months for filters ───────────────────
  const allAgents = [...new Set(CC_DB.calls.map(r=>r._agent).filter(Boolean))].sort();
  const allMonths = [...new Set([
    ...CC_DB.calls.map(r=>r._monthKey),
    ...CC_DB.wa.map(r=>r._monthKey)
  ].filter(Boolean))].sort();
  const allYears  = [...new Set(allMonths.map(m=>m.slice(0,4)).filter(Boolean))].sort().reverse();

  const T = CONFIG.TARGETS;
  const fmtSec = s => s ? (s/60).toFixed(1)+'m' : '—';
  const gradeOf = v => v>=90?'A':v>=80?'B':v>=70?'C':'D';
  const grCls   = v => v>=90?'badge-green':v>=80?'badge-blue':v>=70?'badge-amber':'badge-red';
  const pctClr  = v => v>=85?'#16a34a':v>=70?'#d97706':'#dc2626';

  el.innerHTML = `
  <div class="insight-card" style="background:linear-gradient(135deg,#0891b2,#003D8F);border:none;margin-bottom:18px">
    <div class="insight-icon" style="background:rgba(255,255,255,.15);color:white;font-size:20px">📞</div>
    <div class="insight-text" style="color:white">
      <div class="insight-title" style="color:white;font-size:16px">Call Center — Top Management Report</div>
      <span style="color:rgba(255,255,255,.75);font-size:13px">
        ${fmt(total)} calls · ${fmt(waTotal)} WhatsApp · ${agentSummaries.length} agents
        <span style="margin-left:12px;opacity:.7;font-size:11px">SLA = Within SLA=1 ÷ total · Abandon = Event=ABANDON ÷ total</span>
      </span>
    </div>
    <button onclick="CC_DB.loaded=false;renderCallCenter()" style="background:rgba(255,255,255,.15);color:white;border:1px solid rgba(255,255,255,.3);border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;white-space:nowrap">⟳ Refresh</button>
  </div>

  <!-- FILTERS -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:var(--gray-50);border-radius:var(--r-md);padding:10px 14px;margin-bottom:16px">
    <label style="font-size:11px;color:var(--gray-500)">Agent</label>
    <select id="cc-f-agent" class="filter-input" style="width:auto" onchange="renderCallCenter()">
      <option value="">All agents</option>
      ${allAgents.map(a=>`<option ${a===fAgent?'selected':''}>${esc(a)}</option>`).join('')}
    </select>
    <label style="font-size:11px;color:var(--gray-500)">Year</label>
    <select id="cc-f-year" class="filter-input" style="width:auto" onchange="renderCallCenter()">
      <option value="">All years</option>
      ${allYears.map(y=>`<option ${y===fYear?'selected':''}>${y}</option>`).join('')}
    </select>
    <label style="font-size:11px;color:var(--gray-500)">Month</label>
    <select id="cc-f-month" class="filter-input" style="width:auto" onchange="renderCallCenter()">
      <option value="">All months</option>
      ${allMonths.map(m=>`<option ${m===fMonth?'selected':''}>${esc(m)}</option>`).join('')}
    </select>
    <label style="font-size:11px;color:var(--gray-500)">Channel</label>
    <select id="cc-f-chan" class="filter-input" style="width:auto" onchange="renderCallCenter()">
      <option value="" ${!fChan?'selected':''}>All channels</option>
      <option ${fChan==='Calls'?'selected':''}>Calls</option>
      <option ${fChan==='WhatsApp'?'selected':''}>WhatsApp</option>
    </select>
    <label style="font-size:11px;color:var(--gray-500)">Direction</label>
    <select id="cc-f-dir" class="filter-input" style="width:auto" onchange="renderCallCenter()">
      <option value="" ${!fDir?'selected':''}>Inbound + Outbound</option>
      <option ${fDir==='Inbound'?'selected':''}>Inbound</option>
      <option ${fDir==='Outbound'?'selected':''}>Outbound</option>
    </select>
  </div>

  <!-- KPI CARDS -->
  <div class="kpi-grid" style="grid-template-columns:repeat(8,1fr);margin-bottom:18px">
    <div class="kpi-card ${slaRate===null?'gray':slaRate>=T.SLA?'green':slaRate>=T.SLA*.9?'amber':'red'}">
      <div class="kpi-label">SLA Rate</div><div class="kpi-value">${fmtPct(slaRate)}</div>
      <div class="kpi-target">Target ≥ ${T.SLA}%</div>
    </div>
    <div class="kpi-card ${abandonRate===null?'gray':abandonRate<=T.ABANDON?'green':abandonRate<=T.ABANDON*2?'amber':'red'}">
      <div class="kpi-label">Abandon Rate</div><div class="kpi-value">${fmtPct(abandonRate)}</div>
      <div class="kpi-target">Target ≤ ${T.ABANDON}%</div>
    </div>
    <div class="kpi-card accent"><div class="kpi-label">Total Calls</div><div class="kpi-value">${fmt(total)}</div><div class="kpi-delta">All calls</div></div>
    <div class="kpi-card blue"><div class="kpi-label">WhatsApp</div><div class="kpi-value">${fmt(waTotal)}</div><div class="kpi-delta">Conversations</div></div>
    <div class="kpi-card gray"><div class="kpi-label">Avg AHT</div><div class="kpi-value">${fmtSec(avgAHT)}</div><div class="kpi-delta">Handle time</div></div>
    <div class="kpi-card gray"><div class="kpi-label">Avg THT</div><div class="kpi-value">${fmtSec(avgTHT)}</div><div class="kpi-delta">Talk time</div></div>
    <div class="kpi-card blue"><div class="kpi-label">Inbound</div><div class="kpi-value">${fmt(inbound)}</div><div class="kpi-delta">${total?fmtPct(inbound/total*100):'—'} of total</div></div>
    <div class="kpi-card gray"><div class="kpi-label">Outbound</div><div class="kpi-value">${fmt(outbound)}</div><div class="kpi-delta">${total?fmtPct(outbound/total*100):'—'} of total</div></div>
  </div>

  <!-- TREND CHARTS -->
  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">SLA Rate — Monthly</div><div class="chart-card-sub">Within SLA=1 ÷ total · target ${T.SLA}%</div></div></div>
      <div class="chart-wrap tall"><canvas id="ch-cc-sla" role="img" aria-label="Monthly SLA rate line chart">SLA rate trend.</canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Abandon Rate — Monthly</div><div class="chart-card-sub">Event=ABANDON ÷ total · target ≤ ${T.ABANDON}%</div></div></div>
      <div class="chart-wrap tall"><canvas id="ch-cc-abn" role="img" aria-label="Monthly abandon rate line chart">Abandon rate trend.</canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Call Volume — Inbound vs Outbound</div></div></div>
      <div class="chart-wrap"><canvas id="ch-cc-vol" role="img" aria-label="Monthly call volume bar chart">Call volume by month.</canvas></div>
    </div>
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">WhatsApp Volume — Monthly</div></div></div>
      <div class="chart-wrap"><canvas id="ch-cc-wa" role="img" aria-label="Monthly WhatsApp volume bar chart">WhatsApp conversations per month.</canvas></div>
    </div>
  </div>
  <div class="chart-grid single">
    <div class="chart-card">
      <div class="chart-card-header"><div><div class="chart-card-title">Peak Hours — Calls &amp; WhatsApp</div><div class="chart-card-sub">Volume by hour of day (darker = more volume)</div></div></div>
      <div class="chart-wrap tall"><canvas id="ch-cc-peak" role="img" aria-label="Peak hours bar chart by hour of day">Peak hours chart.</canvas></div>
    </div>
  </div>

  <!-- AGENT EVALUATION CARDS -->
  ${agentSummaries.length>0?`
  <div class="section-header"><div class="section-title">Agent Evaluation — Overall Scores</div><span class="section-badge">${agentSummaries.length} agents</span></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-bottom:18px">
    ${agentSummaries.map(a=>{
      const initials=a.agent.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
      const cats=['Call Handling Process','Communication Skills','Efficiency & Quality','Product/System Knowledge','Soft Skills & Customer Experience'];
      const bars=cats.map(cat=>{
        const pct=a.catPcts[cat]??a.catPcts[Object.keys(a.catPcts).find(k=>k.toLowerCase().includes(cat.toLowerCase().split(' ')[0]))||'']??null;
        if(pct===null)return'';
        return`<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
          <div style="font-size:9px;color:var(--gray-500);width:80px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(cat)}">${esc(cat)}</div>
          <div style="flex:1;height:10px;background:var(--gray-100);border-radius:2px;overflow:hidden">
            <div style="width:${pct}%;height:100%;border-radius:2px;background:${pctClr(pct)}"></div>
          </div>
          <div style="font-size:10px;font-family:var(--mono);width:32px;text-align:right;color:${pctClr(pct)}">${pct}%</div>
        </div>`;
      }).join('');
      return`<div class="chart-card">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--aux-blue-mist);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--aux-blue)">${initials}</div>
          <div>
            <div style="font-weight:600;font-size:13px">${esc(a.agent)}</div>
            <div style="font-size:10px;color:var(--gray-400)">Call center agent</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:24px;font-weight:700;color:${pctClr(a.overallPct||0)};line-height:1">${a.overallPct??'—'}%</div>
            <span class="badge ${grCls(a.overallPct||0)}" style="font-size:10px">${gradeOf(a.overallPct||0)}</span>
          </div>
        </div>
        ${bars||'<div style="font-size:11px;color:var(--gray-400)">No evaluation data for this period</div>'}
      </div>`;
    }).join('')}
  </div>`:''}

  <!-- MONTHLY EVAL TABLE -->
  ${monthlyEvals.length>0?`
  <div class="section-header"><div class="section-title">Monthly Evaluation — All Agents</div></div>
  <div class="table-card">
    <div class="table-scroll"><table class="data-table">
      <thead><tr>
        <th style="text-align:left">Agent</th><th>Month</th>
        ${categories.map(c=>`<th style="font-size:9px;white-space:nowrap;max-width:80px">${esc(c)}</th>`).join('')}
        <th>Overall</th><th>Grade</th>
      </tr></thead>
      <tbody>${monthlyEvals.map(r=>`<tr>
        <td style="font-weight:600;text-align:left">${esc(r.agent)}</td>
        <td class="text-mono">${esc(r.month)}</td>
        ${categories.map(c=>{const p=r.catPcts[c]??null;return`<td class="text-mono" style="color:${p!==null?pctClr(p):'var(--gray-300)'}">${p!==null?p+'%':'—'}</td>`;}).join('')}
        <td class="text-mono fw-600" style="color:${pctClr(r.overallPct||0)}">${r.overallPct??'—'}%</td>
        <td><span class="badge ${grCls(r.overallPct||0)}">${gradeOf(r.overallPct||0)}</span></td>
      </tr>`).join('')}</tbody>
    </table></div>
  </div>`:''}
  `;

  // ── Draw charts ──────────────────────────────────────────
  const base = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{
      x:{grid:{display:false},ticks:{font:{size:10}}},
      y:{grid:{color:'rgba(128,128,128,.1)'},ticks:{font:{size:10}}}
    }
  };

  if (mLabels.length) {
    new Chart(document.getElementById('ch-cc-sla'),{
      type:'line',
      data:{labels:mLabels,datasets:[{
        label:'SLA %',data:monthly.map(m=>m.slaRate),
        borderColor:'#16a34a',borderWidth:2,tension:.3,pointRadius:3,fill:false,
      }]},
      options:{...base,scales:{...base.scales,y:{...base.scales.y,min:0,max:100,ticks:{callback:v=>v+'%',font:{size:10}}}}}
    });
    new Chart(document.getElementById('ch-cc-abn'),{
      type:'line',
      data:{labels:mLabels,datasets:[{
        label:'Abandon %',data:monthly.map(m=>m.abandonRate),
        borderColor:'#dc2626',borderWidth:2,tension:.3,pointRadius:3,fill:true,backgroundColor:'rgba(220,38,38,.07)',
      }]},
      options:{...base,scales:{...base.scales,y:{...base.scales.y,beginAtZero:true,ticks:{callback:v=>v+'%',font:{size:10}}}}}
    });
    new Chart(document.getElementById('ch-cc-vol'),{
      type:'bar',
      data:{labels:mLabels,datasets:[
        {label:'Inbound', data:monthly.map(m=>m.inbound),  backgroundColor:'#003D8F',borderRadius:3},
        {label:'Outbound',data:monthly.map(m=>m.outbound), backgroundColor:'#93c4fb',borderRadius:3},
      ]},
      options:{...base,plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}}}
    });
  }

  if (waMonthly.length) {
    const waLabels = waMonthly.map(m=>m.mk);
    new Chart(document.getElementById('ch-cc-wa'),{
      type:'bar',
      data:{labels:waLabels,datasets:[{
        label:'WhatsApp',data:waMonthly.map(m=>m.count),
        backgroundColor:'#16a34a',borderRadius:3,
      }]},
      options:base
    });
  }

  // Peak hours — 24h bar
  const peakMax = Math.max(...peak.calls, ...peak.wa, 1);
  new Chart(document.getElementById('ch-cc-peak'),{
    type:'bar',
    data:{
      labels:hours,
      datasets:[
        {label:'Calls',     data:peak.calls, backgroundColor:peak.calls.map(v=>`rgba(0,61,143,${0.2+v/peakMax*.8})`),borderRadius:2},
        {label:'WhatsApp',  data:peak.wa,    backgroundColor:peak.wa.map(v=>`rgba(22,163,74,${0.2+v/peakMax*.8})`),  borderRadius:2},
      ]
    },
    options:{
      ...base,
      plugins:{legend:{display:true,labels:{boxWidth:10,font:{size:11}}}},
      scales:{
        x:{...base.scales.x,ticks:{autoSkip:false,maxRotation:0,font:{size:9}}},
        y:{...base.scales.y,beginAtZero:true}
      }
    }
  });
}

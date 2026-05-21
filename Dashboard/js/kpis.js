// ═══════════════════════════════
//  AUX ASC DASHBOARD · KPIs
// ═══════════════════════════════
const KPI = {

  pending(rows)     { return rows.filter(r=>r._isPending); },
  pendingRate(rows)  { return rows.length?(rows.filter(r=>r._isPending).length/rows.length*100):null; },
  completed(rows)   { return rows.filter(r=>!r._isPending); },

  rate48h(rows) {
    const d=rows.filter(r=>!r._isPending&&r._serviceHours!==null);
    return d.length?(d.filter(r=>r._serviceHours<=48).length/d.length*100):null;
  },
  rate72h(rows) {
    const d=rows.filter(r=>!r._isPending&&r._serviceHours!==null);
    return d.length?(d.filter(r=>r._serviceHours<=72).length/d.length*100):null;
  },

  unassignedCount(rows) { return rows.filter(r=>!r._hasWorker).length; },

  // Pending with NO Reason For Rescheduling
  pendingNoReason(rows) {
    return rows.filter(r=>r._isPending && !r._hasRescheduleReason);
  },

  // Tickets with Reason For Rescheduling (for chart replacement)
  withRescheduleReason(rows) {
    return rows.filter(r=>r._hasRescheduleReason);
  },

  agingDistribution(rows) {
    const cats=CONFIG.AGING_CATEGORIES.map(c=>({label:c.label,max:c.max,count:0}));
    rows.forEach(r=>{
      const h=r._agingHours; if(h===null)return;
      for(const c of cats){if(h<=c.max){c.count++;return;}}
      cats[cats.length-1].count++;
    });
    return cats;
  },

  byMonth(rows) {
    const months=groupByMonth(rows);
    return months.map(([month,mRows])=>{
      const[y,m]=month.split('-').map(Number);
      const mStart=new Date(y,m-1,1), mEnd=new Date(y,m,0,23,59,59);
      const done=mRows.filter(r=>!r._isPending&&r._serviceHours!==null);
      const tc=done.length;
      const openInMonth=rows.filter(r=>{
        if(!r._dispatch)return false;
        const closed=r._completion||new Date();
        return r._dispatch<=mEnd && closed>=mStart;
      });
      return {
        month, label:formatMonthLabel(month),
        total:mRows.length,
        pending:mRows.filter(r=>r._isPending).length,
        pendingSnapshot:openInMonth.filter(r=>r._isPending).length,
        pendingDuration:openInMonth.length,
        completed:tc,
        rate48h:tc?(done.filter(r=>r._serviceHours<=48).length/tc*100):null,
        rate72h:tc?(done.filter(r=>r._serviceHours<=72).length/tc*100):null,
        // Replaced: count of tickets WITH Reason For Rescheduling (instead of unassigned)
        withReason:mRows.filter(r=>r._hasRescheduleReason).length,
        noReason:mRows.filter(r=>r._isPending && !r._hasRescheduleReason).length,
      };
    });
  },

  pendingByReason(rows) {
    const p=rows.filter(r=>r._isPending); const m={};
    p.forEach(r=>{const k=r._rescheduleReason||'(No reason)';m[k]=(m[k]||0)+1;});
    return Object.entries(m).sort(([,a],[,b])=>b-a).map(([reason,count])=>({reason,count}));
  },
  pendingByBranch(rows) {
    const m=groupBy(rows.filter(r=>r._isPending),r=>r._branch);
    return Object.entries(m).map(([branch,b])=>({branch,count:b.length})).sort((a,b)=>b.count-a.count);
  },
  pendingByWorker(rows) {
    const m=groupBy(rows.filter(r=>r._isPending),r=>r[CONFIG.COLS.WORKER]);
    return Object.entries(m).map(([worker,w])=>({worker,count:w.length})).sort((a,b)=>b.count-a.count);
  },
  pendingByProduct(rows) {
    const m=groupBy(rows.filter(r=>r._isPending),r=>r[CONFIG.COLS.PRODUCT_TYPE]||r[CONFIG.COLS.PRODUCT_LINE]);
    return Object.entries(m).map(([product,p])=>({product,count:p.length})).sort((a,b)=>b.count-a.count);
  },

  byBranch(rows) {
    return Object.entries(groupBy(rows,r=>r._branch)).map(([branch,bRows])=>{
      const done=bRows.filter(r=>!r._isPending&&r._serviceHours!==null);
      const pc=bRows.filter(r=>r._isPending).length;
      const b={branch,total:bRows.length,pending:pc,
        pendingRate:bRows.length?pc/bRows.length*100:null,
        rate48h:done.length?done.filter(r=>r._serviceHours<=48).length/done.length*100:null,
        rate72h:done.length?done.filter(r=>r._serviceHours<=72).length/done.length*100:null,
        unassigned:bRows.filter(r=>!r._hasWorker).length,score:0};
      b.score=(b.rate48h??50)*0.4+(b.rate72h??50)*0.35+(100-(b.pendingRate??50))*0.25;
      return b;
    }).sort((a,b)=>b.score-a.score);
  },

  // ── By City: Extract city from branch (format: "City - Company") ──
  byCity(rows) {
    const m=groupBy(rows,r=>{
      if(!r._branch)return'(Unknown)';
      const city=r._branch.split('-')[0].trim();
      return city||'(Unknown)';
    });
    return Object.entries(m).map(([city,cRows])=>{
      const done=cRows.filter(r=>!r._isPending&&r._serviceHours!==null);
      const pc=cRows.filter(r=>r._isPending).length;
      const closed=cRows.filter(r=>!r._isPending).length;
      return {
        city,
        registration: cRows.length,
        closed: closed,
        pending: pc,
        pendingRate: cRows.length?pc/cRows.length*100:null,
        rate48h: done.length?done.filter(r=>r._serviceHours<=48).length/done.length*100:null,
        rate72h: done.length?done.filter(r=>r._serviceHours<=72).length/done.length*100:null,
      };
    }).sort((a,b)=>b.registration-a.registration);
  },

  // ── REJECTED / RETURNED / OBM per spec:
  // Rejected:  Phase contains "Refusal" OR Status contains "Rejected", CompResult NOT blank/cancel
  // Returned:  Phase contains "Rejected upon review" OR Status contains "Returned", CompResult NOT blank/cancel
  // OBM Statement: CompResult contains "cancel" AND Service Info contains "OBM"
  rejectedAll(rows) {
    return rows.filter(r=>r._isRejected || r._isReturned || r._isOBMStatement);
  },
  rejectedOnly(rows) { return rows.filter(r=>r._isRejected); },
  returnedOnly(rows) { return rows.filter(r=>r._isReturned); },
  obmOnly(rows)      { return rows.filter(r=>r._isOBMStatement); },
  rejectedByBranch(rows){
    const all=KPI.rejectedAll(rows);
    const m=groupBy(all,r=>r._branch);
    return Object.entries(m).map(([b,r])=>({branch:b,count:r.length})).sort((a,b)=>b.count-a.count);
  },
  rejectedByWorker(rows){
    const all=KPI.rejectedAll(rows);
    const m=groupBy(all,r=>r[CONFIG.COLS.WORKER]);
    return Object.entries(m).map(([w,r])=>({worker:w,count:r.length})).sort((a,b)=>b.count-a.count);
  },

  // ── TODAY's SCHEDULE: reads from Rescheduling column (date) ONLY ──
  // Only shows PENDING tickets with a rescheduling date matching today
  todaySchedule(rows) {
    const t=new Date();
    const todayStr=`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
    return rows.filter(r=>{
      // Only include PENDING tickets
      if(!r._isPending) return false;
      // Check ONLY Rescheduling date (not Appointed date)
      if(r._rescheduled){
        const d=r._rescheduled;
        const dStr=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if(dStr===todayStr) return true;
      }
      return false;
    });
  },

  // ── DELAY REASON ANALYSIS ──
  analyzeDelayReasons(rows) {
    const pending=rows.filter(r=>r._isPending);
    const C=CONFIG.COLS;
    const CATS=[
      {key:'distance', label:'Distance Delay',      color:'distance', badge:'#dc2626', badgeBg:'#fee2e2',
        checkFn: r=>r._farDistance, keywords:[]},
      {key:'parts',    label:'Spare Parts Delay',   color:'parts',    badge:'#7c3aed', badgeBg:'#f3f0ff',
        keywords:['part','spare','replacement','awaiting part','no parts','out of stock','قطع','قطعة']},
      {key:'customer', label:'Customer Delay',      color:'customer', badge:'#d97706', badgeBg:'#fef3c7',
        keywords:['customer not available','postponed','no answer','customer unavailable','customer request','not available','reschedule','عميل','تأجيل']},
      {key:'technical',label:'Service Center Delay',color:'technical', badge:'#003D8F', badgeBg:'#eaf3ff',
        keywords:['technician delay','no technician','technician unavailable','no worker','no technician available','assignment delay','فني','لا يوجد فني']},
    ];
    const res={};
    CATS.forEach(c=>res[c.key]={...c,tickets:[],count:0,totalAging:0});
    res.unspecified={key:'unspecified',label:'Unspecified Delay',color:'other',badge:'#5a607a',badgeBg:'#f3f5f9',tickets:[],count:0,totalAging:0};
    pending.forEach(r=>{
      const txt=[r[C.COMPLETION_RESULT]||'',r[C.MAINTENANCE]||'',r[C.RESCHED_SUPP]||'',r[C.RESCHED_REASON]||'',r[C.RESCHEDULING]||''].join(' ').toLowerCase();
      let matched=false;
      if(r._farDistance){res.distance.tickets.push(r);res.distance.count++;if(r._agingHours)res.distance.totalAging+=r._agingHours;matched=true;}
      else{for(const cat of CATS.slice(1)){if(cat.keywords.some(k=>txt.includes(k))){res[cat.key].tickets.push(r);res[cat.key].count++;if(r._agingHours)res[cat.key].totalAging+=r._agingHours;matched=true;break;}}}
      if(!matched){res.unspecified.tickets.push(r);res.unspecified.count++;if(r._agingHours)res.unspecified.totalAging+=r._agingHours;}
    });
    return Object.values(res).filter(c=>c.count>0).map(c=>{
      c.avgAging=c.count>0?c.totalAging/c.count:null;
      c.branches=Object.entries(groupBy(c.tickets,t=>t._branch)).map(([br,t])=>({branch:br,count:t.length})).sort((a,b)=>b.count-a.count);
      c.technicians=Object.entries(groupBy(c.tickets,t=>t[CONFIG.COLS.WORKER]||'(Unassigned)')).map(([tech,t])=>({tech,count:t.length})).sort((a,b)=>b.count-a.count);
      return c;
    }).sort((a,b)=>b.count-a.count);
  },

  // ── By ASC: Aggregate KPIs for each Authorized Service Center ──
  byASC(rows) {
    const asc_groups=groupBy(rows, r=>r._asc||r[CONFIG.COLS.AFFILIATED]||'Unknown');
    return Object.entries(asc_groups)
      .map(([asc, asc_rows])=>{
        // Skip invalid/empty ASCs
        if(!asc || asc==='Unknown' || asc==='') return null;

        // Calculate base metrics
        const total=asc_rows.length;
        const pending=asc_rows.filter(r=>r._isPending).length;
        const completed=asc_rows.filter(r=>!r._isPending&&r._serviceHours!==null).length;
        const unassigned=asc_rows.filter(r=>!r._hasWorker).length;
        const rescheduled=asc_rows.filter(r=>r[CONFIG.COLS.RESCHEDULING]).length;

        // Calculate rates
        const pending_rate=total?(pending/total*100):null;
        const rate_48h=completed?
          (asc_rows.filter(r=>!r._isPending&&r._serviceHours!==null&&r._serviceHours<=48).length/completed*100):null;
        const rate_72h=completed?
          (asc_rows.filter(r=>!r._isPending&&r._serviceHours!==null&&r._serviceHours<=72).length/completed*100):null;

        // Composite performance score (out of 100)
        const T=CONFIG.TARGETS;
        const score48=rate_48h!==null?(rate_48h/T.RATE_48H)*100:0;
        const score72=rate_72h!==null?(rate_72h/T.RATE_72H)*100:0;
        const scorePend=pending_rate!==null?((T.PENDING_RATE-pending_rate)/T.PENDING_RATE)*100:0;
        const composite_score=(score48+score72+scorePend)/3;

        return {
          asc,
          total,
          pending,
          completed,
          pending_rate,
          rate_48h,
          rate_72h,
          unassigned,
          rescheduled,
          score: composite_score
        };
      })
      .filter(x=>x!==null)
      .sort((a,b)=>b.score-a.score);  // Sort by performance score descending
  },
};

// ── Shared badge helpers ──────────────────────
function targetBadge(v,t,h=true){
  if(v===null)return'<span class="badge badge-gray">—</span>';
  const good=h?v>=t:v<=t;
  const cls=good?'badge-green':(h?(v>=t*.9?'badge-amber':'badge-red'):(v<=t*1.1?'badge-amber':'badge-red'));
  return`<span class="badge ${cls}">${h?fmtPct(v):fmt(v,1)+'h'}</span>`;
}
function agingLabel(h){
  if(h===null)return'—';
  for(const c of CONFIG.AGING_CATEGORIES){if(h<=c.max)return c.label;}
  return'> 72 Hours';
}
function agingBadge(h){
  const l=agingLabel(h);
  let c='badge-green';
  if(h===null)c='badge-gray';else if(h>72)c='badge-red';else if(h>48)c='badge-amber';else if(h>24)c='badge-blue';
  return`<span class="badge ${c}">${l}</span>`;
}
function statusBadge(r){
  if(r._isPending)      return'<span class="badge badge-amber">Pending</span>';
  if(r._isRejected)     return'<span class="badge badge-red">Rejected</span>';
  if(r._isReturned)     return'<span class="badge badge-red">Returned</span>';
  if(r._isOBMStatement) return'<span class="badge badge-blue">OBM Statement</span>';
  if(r._isCancelled)    return'<span class="badge badge-gray">Cancelled</span>';
  return'<span class="badge badge-green">Completed</span>';
}

// ── Ticket Status badge from Processing Phase ──────
function ticketStatusBadge(r){
  const color = r._phaseColor || 'gray';
  const label = r._phaseLabel || r._ticketStatus || '—';
  let cls;
  if (color === 'red') cls = 'badge-red';
  else if (color === 'green') cls = 'badge-green';
  else if (color === 'amber') cls = 'badge-amber';
  else if (color === 'orange') cls = 'badge-orange';
  else cls = 'badge-gray';
  return '<span class="badge '+cls+'">'+esc(label)+'</span>';
}

// ── Pending Pivot: Branch (rows) × Aging (columns) → count ──
function buildPendingPivot(rows){
  const pending=rows.filter(r=>r._isPending);
  const agingCols=['≤ 12h','≤ 24h','≤ 48h','≤ 72h','> 72h'];
  const branchMap={};
  pending.forEach(r=>{
    const br=r._branch||'(Unknown)';
    if(!branchMap[br])branchMap[br]={total:0};
    agingCols.forEach(c=>{if(!branchMap[br][c])branchMap[br][c]=0;});
    branchMap[br][r._agingCat]=(branchMap[br][r._agingCat]||0)+1;
    branchMap[br].total++;
  });
  // Sort by total desc
  const rows2=Object.entries(branchMap)
    .map(([br,data])=>({branch:br,...data}))
    .sort((a,b)=>b.total-a.total);
  return{cols:agingCols,rows:rows2,totalPending:pending.length};
}

// ── Branches with pending (for email alerts) ──────────
function branchesWithPending(rows){
  const pending=rows.filter(r=>r._isPending);
  const map={};
  pending.forEach(r=>{
    const br=r._branch||'';
    if(!br)return;
    if(!map[br])map[br]={count:0,noReason:0,todayVisit:false};
    map[br].count++;
    if(!r._hasRescheduleReason)map[br].noReason++;
  });
  // Check today's visits
  const today=KPI.todaySchedule(rows);
  today.forEach(r=>{
    const br=r._branch||'';
    if(map[br])map[br].todayVisit=true;
  });
  return Object.entries(map).map(([branch,d])=>({branch,...d})).sort((a,b)=>b.count-a.count);
}

// ── PARTS RETURN SUMMARY (Loaner Model) ─────────────────
// Tracks: Consumed (used by tech) vs Returned (by service provider)
// Remaining = Consumed - Returned (with edge case handling)
function buildPartsReturnSummary(transactions){
  // Group by part key (code or name) + branch
  const byPart={};

  transactions.forEach(tx=>{
    if(!tx._transactionType) return;
    const key=`${tx._key}|${tx._branch}`;
    if(!byPart[key]){
      byPart[key]={
        code: tx._partCode,
        name: tx._partName,
        branch: tx._branch,
        asc: tx._asc,
        consumed: 0,
        returned: 0,
        requested: 0,
      };
    }
    const p=byPart[key];
    if(tx._transactionType==='Part Used By Tech') p.consumed+=tx._qty;
    else if(tx._transactionType==='Part Return Received') p.returned+=tx._qty;
    else if(tx._transactionType==='Part Request By SVC') p.requested+=tx._qty;
  });

  // Calculate remaining and status
  return Object.values(byPart).map(p=>{
    // Remaining logic (matches Power BI model):
    // If used=0 → blank; if no returned → show used; else → used - returned (min 0)
    let remaining=null;
    if(p.consumed>0){
      if(p.returned===0) remaining=p.consumed;
      else remaining=Math.max(0, p.consumed-p.returned);
    }

    const status=remaining===null?'unused':(remaining>0?'outstanding':'complete');

    return{
      code: p.code,
      name: p.name,
      branch: p.branch,
      asc: p.asc,
      consumed: p.consumed,
      returned: p.returned,
      remaining: remaining,
      status: status,
    };
  }).sort((a,b)=>(a.branch+a.code).localeCompare(b.branch+b.code));
}

// Summary totals for parts return
function partsReturnTotals(summary){
  return{
    consumed: summary.reduce((s,p)=>s+(p.consumed||0), 0),
    returned: summary.reduce((s,p)=>s+(p.returned||0), 0),
    outstanding: summary.reduce((s,p)=>s+(p.remaining||0), 0),
  };
}


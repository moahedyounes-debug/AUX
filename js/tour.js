// ═══════════════════════════════
//  AUX ASC DASHBOARD · ONBOARDING TOUR
//  Shows once per email (first login only)
// ═══════════════════════════════
(function(){
  const KEY = 'aux_onboarded_emails';
  function seen(email){
    try { return (JSON.parse(localStorage.getItem(KEY)||'[]')).includes(email); }
    catch { return false; }
  }
  function markSeen(email){
    try {
      const list = JSON.parse(localStorage.getItem(KEY)||'[]');
      if (!list.includes(email)) { list.push(email); localStorage.setItem(KEY, JSON.stringify(list)); }
    } catch {}
  }

  const STEPS = [
    { sel:'.sidebar-nav .nav-item[data-page="page-overview"]',
      title:'KPI Overview', body:'Headline metrics: completion rates, pending tickets and SLA targets.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-trends"]',
      title:'Monthly Trends', body:'See month-over-month performance trends.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-daily"]',
      title:'Daily Operations', body:'Today\'s pending tickets, workers, branches and aging.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-pending"]',
      title:'Pending Analysis', body:'Deep-dive into reschedule reasons and bottlenecks.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-branches"]',
      title:'Branch Comparison', body:'Rank branches by performance score.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-parts"]',
      title:'Spare Parts', body:'Stock balance, ABC class, reorder alerts and shipment tracking.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-callcenter"]',
      title:'Call Center', body:'Calls, SLA, agents and WhatsApp.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-rejected"]',
      title:'Rejected / Returned', body:'Documents rejected or tickets returned for review.' },
    { sel:'.sidebar-nav .nav-item[data-page="page-export"]',
      title:'Export Center', body:'Download Excel / PowerPoint reports.' },
    { sel:'#refresh-btn',
      title:'Refresh', body:'Reload the latest data from Google Sheets at any time. You\'re all set!' },
  ];

  let idx = 0;
  function ensureLayer(){
    let l = document.getElementById('aux-tour');
    if (l) return l;
    l = document.createElement('div');
    l.id = 'aux-tour';
    l.innerHTML = `
      <div class="aux-tour-backdrop"></div>
      <div class="aux-tour-spot"></div>
      <div class="aux-tour-card">
        <div class="aux-tour-step"></div>
        <div class="aux-tour-title"></div>
        <div class="aux-tour-body"></div>
        <div class="aux-tour-dots"></div>
        <div class="aux-tour-actions">
          <button class="aux-tour-skip">Skip</button>
          <div style="flex:1"></div>
          <button class="aux-tour-prev">Back</button>
          <button class="aux-tour-next">Next</button>
        </div>
      </div>`;
    document.body.appendChild(l);
    const css = document.createElement('style');
    css.textContent = `
      #aux-tour{position:fixed;inset:0;z-index:9999;font-family:var(--font,system-ui)}
      #aux-tour .aux-tour-backdrop{position:absolute;inset:0;background:rgba(0,18,55,.55);backdrop-filter:blur(2px)}
      #aux-tour .aux-tour-spot{position:absolute;border:2px solid #5BA4F5;border-radius:10px;
        box-shadow:0 0 0 9999px rgba(0,18,55,.55);transition:all .25s ease;pointer-events:none}
      #aux-tour .aux-tour-card{position:absolute;background:#fff;border-radius:14px;padding:18px 20px;
        width:320px;box-shadow:0 20px 60px rgba(0,0,0,.35);transition:all .25s ease}
      #aux-tour .aux-tour-step{font-size:11px;font-weight:600;color:#5BA4F5;letter-spacing:.5px;text-transform:uppercase}
      #aux-tour .aux-tour-title{font-size:17px;font-weight:700;color:#001A47;margin:4px 0 6px}
      #aux-tour .aux-tour-body{font-size:13px;color:#4a5568;line-height:1.55}
      #aux-tour .aux-tour-dots{display:flex;gap:5px;margin:14px 0 12px}
      #aux-tour .aux-tour-dots span{width:7px;height:7px;border-radius:50%;background:#cbd5e1}
      #aux-tour .aux-tour-dots span.active{background:#003D8F;width:18px;border-radius:5px}
      #aux-tour .aux-tour-actions{display:flex;gap:8px;align-items:center}
      #aux-tour button{border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit}
      #aux-tour .aux-tour-skip{background:transparent;color:#64748b}
      #aux-tour .aux-tour-prev{background:#eef2f7;color:#001A47}
      #aux-tour .aux-tour-next{background:#003D8F;color:#fff}
      #aux-tour .aux-tour-next:hover{background:#0056C7}
    `;
    document.head.appendChild(css);
    l.querySelector('.aux-tour-skip').onclick = end;
    l.querySelector('.aux-tour-prev').onclick = ()=>{ if(idx>0){idx--; show();} };
    l.querySelector('.aux-tour-next').onclick = ()=>{ if(idx<STEPS.length-1){idx++; show();} else end(); };
    return l;
  }
  function show(){
    const l = ensureLayer();
    const step = STEPS[idx];
    const target = document.querySelector(step.sel);
    const spot = l.querySelector('.aux-tour-spot');
    const card = l.querySelector('.aux-tour-card');
    if (target) {
      const r = target.getBoundingClientRect();
      spot.style.left = (r.left-6)+'px';
      spot.style.top  = (r.top-6)+'px';
      spot.style.width  = (r.width+12)+'px';
      spot.style.height = (r.height+12)+'px';
      // Place card to the right of sidebar items, otherwise below
      const onSide = r.right < window.innerWidth*0.4;
      if (onSide) {
        card.style.left = Math.min(r.right+18, window.innerWidth-340)+'px';
        card.style.top  = Math.max(12, r.top - 20)+'px';
      } else {
        card.style.left = Math.max(12, Math.min(r.left, window.innerWidth-340))+'px';
        card.style.top  = (r.bottom+14)+'px';
      }
    } else {
      spot.style.cssText = 'display:none';
      card.style.left = '50%';
      card.style.top  = '50%';
      card.style.transform = 'translate(-50%,-50%)';
    }
    l.querySelector('.aux-tour-step').textContent = `Step ${idx+1} of ${STEPS.length}`;
    l.querySelector('.aux-tour-title').textContent = step.title;
    l.querySelector('.aux-tour-body').textContent  = step.body;
    l.querySelector('.aux-tour-dots').innerHTML =
      STEPS.map((_,i)=>`<span class="${i===idx?'active':''}"></span>`).join('');
    l.querySelector('.aux-tour-prev').style.visibility = idx===0 ? 'hidden' : 'visible';
    l.querySelector('.aux-tour-next').textContent = idx===STEPS.length-1 ? 'Got it' : 'Next';
  }
  function end(){
    const l = document.getElementById('aux-tour');
    if (l) l.remove();
    if (window._currentEmail) markSeen(window._currentEmail);
  }
  // Public API
  window.startOnboardingTourIfFirstLogin = function(email){
    if (!email || seen(email)) return;
    setTimeout(()=>{ idx=0; show(); window.addEventListener('resize', show); }, 600);
  };
})();

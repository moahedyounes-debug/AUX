// ═══════════════════════════════
//  AUX ASC DASHBOARD · APP
// ═══════════════════════════════
let currentPage = 'page-overview';
let _currentEmail = '';
let _currentASC   = '';

function navigate(pageId, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  
  const pe = document.getElementById(pageId);
  if (pe) pe.classList.add('active');
  currentPage = pageId;

  // Use i18n translations for page titles
  const pgKeys = {
    'page-overview': 'pg_overview',
    'page-trends': 'pg_trends',
    'page-daily': 'pg_daily',
    'page-pending': 'pg_pending',
    'page-branches': 'pg_branches',
    'page-rejected': 'pg_rejected',
    'page-export': 'pg_export',
    'page-activity': 'pg_activity',
    'page-insights': 'pg_insights',
    'page-parts': 'pg_parts',
    'page-callcenter': 'pg_cc',
    'page-asc': 'pg_asc',
  };

  const key = pgKeys[pageId];
  const langObj = (typeof I18N !== 'undefined' && I18N[_lang]) || null;
  const titles = langObj && key ? langObj[key] : null;
  
  if (titles) {
    const topbarTitle = document.getElementById('topbar-title');
    const topbarCrumb = document.getElementById('topbar-crumb');
    if (topbarTitle) topbarTitle.textContent = titles[0];
    if (topbarCrumb) topbarCrumb.textContent = titles[1];
  }

  renderCurrentPage();
  if (typeof applyTranslations === 'function') applyTranslations();
  
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth < 960 && sidebar) {
    sidebar.classList.remove('open');
  }
}

async function renderCurrentPage() {
  if (typeof logActivity === 'function') {
    logActivity('View page: ' + currentPage.replace('page-', ''));
  }
  if (typeof writeHeartbeat === 'function') {
    writeHeartbeat(); // update heartbeat with current page
  }

  // Safely call page rendering functions defined in pages.js / parts.js / callcenter.js
  try {
    if (currentPage === 'page-overview' && typeof renderOverview === 'function') await renderOverview();
    else if (currentPage === 'page-trends' && typeof renderTrends === 'function') await renderTrends();
    else if (currentPage === 'page-daily' && typeof renderDaily === 'function') await renderDaily();
    else if (currentPage === 'page-pending' && typeof renderPending === 'function') await renderPending();
    else if (currentPage === 'page-branches' && typeof renderBranches === 'function') await renderBranches();
    else if (currentPage === 'page-rejected' && typeof renderRejected === 'function') await renderRejected();
    else if (currentPage === 'page-export' && typeof renderExport === 'function') await renderExport();
    else if (currentPage === 'page-activity' && typeof renderActivityLog === 'function') await renderActivityLog();
    else if (currentPage === 'page-insights' && typeof renderInsights === 'function') await renderInsights();
    else if (currentPage === 'page-parts' && typeof renderParts === 'function') await renderParts();
    else if (currentPage === 'page-callcenter' && typeof renderCallCenter === 'function') await renderCallCenter();
    else if (currentPage === 'page-asc' && typeof renderASCPerformance === 'function') await renderASCPerformance();
    else {
      console.warn(`Render function for ${currentPage} is missing or pages.js failed to load completely.`);
    }
  } catch (err) {
    console.error(`Error rendering page ${currentPage}:`, err);
  }
}

function toggleSidebar() { 
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open'); 
}

// ── REFRESH ──────────────────────────────────────────────────
async function refreshData() {
  if (!_currentEmail || !_currentASC) return;

  const btn = document.getElementById('refresh-btn');
  const icon = document.getElementById('refresh-icon');
  const txt = document.getElementById('refresh-txt');

  if (!btn || !icon || !txt) return;

  // Animate the button
  btn.disabled = true;
  icon.style.animation = 'spin-refresh 0.8s linear infinite';
  txt.textContent = 'Refreshing…';

  try {
    // Destroy all charts first safely from registry
    if (typeof CHART_REGISTRY !== 'undefined') {
      Object.values(CHART_REGISTRY).forEach(c => { try { c.destroy(); } catch (e) {} });
      Object.keys(CHART_REGISTRY).forEach(k => delete CHART_REGISTRY[k]);
    }

    // Reload data from Google Sheets
    if (typeof loadAllData === 'function') {
      await loadAllData(_currentEmail, _currentASC);
    }

    // Update date range display
    if (typeof DB !== 'undefined' && DB.raw && DB.raw.length > 0) {
      const dates = DB.raw.map(r => r._created).filter(Boolean).sort((a, b) => a - b);
      const displayEl = document.getElementById('data-date-display');
      if (dates.length && displayEl && typeof fmtDate === 'function') {
        displayEl.textContent = fmtDate(dates[0]) + ' – ' + fmtDate(dates[dates.length - 1]);
      }
    }

    // Update timestamp
    const now = new Date();
    const lastUpdatedEl = document.getElementById('last-updated');
    const refreshTimeEl = document.getElementById('refresh-time');
    
    if (lastUpdatedEl) lastUpdatedEl.textContent = 'Updated: ' + now.toLocaleTimeString();
    if (refreshTimeEl) refreshTimeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Re-render current page
    renderCurrentPage();

    // Success feedback
    icon.style.animation = '';
    txt.textContent = typeof t === 'function' ? t('refreshed') : 'Refreshed ✓';
    btn.style.background = 'rgba(22,163,74,.15)';
    btn.style.borderColor = 'rgba(22,163,74,.3)';
    btn.style.color = '#16a34a';
    
    setTimeout(() => {
      txt.textContent = typeof t === 'function' ? t('refresh') : 'Refresh';
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.disabled = false;
    }, 2000);

  } catch (err) {
    console.error('Refresh error:', err);
    icon.style.animation = '';
    txt.textContent = 'Failed — retry';
    btn.style.background = 'rgba(220,38,38,.1)';
    btn.style.color = '#dc2626';
    setTimeout(() => {
      txt.textContent = 'Refresh';
      btn.style.background = '';
      btn.style.color = '';
      btn.disabled = false;
    }, 3000);
  }
}

// ── AUTO-REFRESH every 5 minutes ─────────────────────────────
let _autoRefreshTimer = null;
let _heartbeatTimer = null;

let HEARTBEAT_URL = 'https://script.google.com/macros/s/AKfycbyRGaKvBin32c4B-L2aVjYnO2LmKYkB1yeuhkN9EgLubV7AA3XR384KBxbcA9eSuz7tbQ/exec';

async function writeHeartbeat() {
  if (!_currentEmail || !HEARTBEAT_URL) return;
  try {
    await fetch(HEARTBEAT_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'heartbeat',
        email: _currentEmail,
        asc: _currentASC,
        page: currentPage || '—',
        ts: new Date().toISOString(),
      })
    });
  } catch (e) { 
    console.warn('Heartbeat failed:', e.message); 
  }
}

async function readActiveUsers() {
  if (!HEARTBEAT_URL) return {};
  try {
    const url = HEARTBEAT_URL + '?action=read';
    const resp = await fetch(url);
    return await resp.json(); 
  } catch (e) { 
    return {}; 
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  _autoRefreshTimer = setInterval(() => { refreshData(); }, 5 * 60 * 1000);
  writeHeartbeat();
  _heartbeatTimer = setInterval(writeHeartbeat, 90 * 1000);
}

function stopAutoRefresh() {
  if (_autoRefreshTimer) { clearInterval(_autoRefreshTimer); _autoRefreshTimer = null; }
  if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  if (_currentEmail && HEARTBEAT_URL) {
    fetch(HEARTBEAT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout', email: _currentEmail })
    }).catch(() => {});
  }
}

// ── ACTIVITY LOG ─────────────────────────────────────────────
const _activityLog = [];
function logActivity(action) {
  const entry = {
    time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    email: _currentEmail || '—',
    asc: _currentASC || '—',
    action,
  };
  _activityLog.push(entry);
  if (_activityLog.length > 100) _activityLog.shift();
}

// ── LOGIN ─────────────────────────────────────────────────────
async function handleLogin() {
  const emailInput = document.getElementById('login-email');
  const email = (emailInput ? emailInput.value : '').toLowerCase().trim();
  const errorEl = document.getElementById('login-error');
  const loadingEl = document.getElementById('login-loading');
  const btnEl = document.getElementById('login-btn');
  
  if (errorEl) errorEl.style.display = 'none';
  
  if (!email || !email.includes('@')) {
    if (errorEl) {
      errorEl.textContent = typeof t === 'function' ? t('login_error_email') : 'Please enter a valid email address.';
      errorEl.style.display = 'block';
    }
    return;
  }
  
  if (btnEl) btnEl.disabled = true;
  if (loadingEl) loadingEl.style.display = 'flex';
  
  try {
    let accessRows = [];
    if (typeof fetchSheet === 'function' && typeof CONFIG !== 'undefined') {
      try { accessRows = await fetchSheet(CONFIG.ACCESS_SHEET); } catch (e) { console.warn('Access sheet failed:', e); }
    }
    
    if (typeof DB !== 'undefined') {
      DB.accessMap = {};
      DB.adminAccessMap = {};
      accessRows.forEach(r => {
        const em = (r['Email'] || r['email'] || r['EMAIL'] || r['E-mail'] || '').toLowerCase().trim();
        const asc = (r['ASC'] || r['asc'] || r['Company'] || r['company'] || r['ASC Name'] || '').trim();
        const adm = (r['Admin Access'] || r['admin access'] || r['Admin'] || '').trim().toLowerCase();
        if (em && asc) DB.accessMap[em] = asc;
        if (em) DB.adminAccessMap[em] = (adm === 'yes' || adm === 'true' || adm === '1');
      });
    }

    let userASC = typeof DB !== 'undefined' ? DB.accessMap[email] : null;
    if (!userASC) {
      if (typeof DB !== 'undefined' && Object.keys(DB.accessMap).length > 0) {
        _activityLog.push({
          time: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          email, asc: '—', action: 'Login FAILED — Email not in Access sheet'
        });
        try {
          const stored = JSON.parse(localStorage.getItem('aux_activity_log') || '[]');
          stored.push(_activityLog[_activityLog.length - 1]);
          localStorage.setItem('aux_activity_log', JSON.stringify(stored.slice(-500)));
        } catch (e) {}
        
        if (errorEl) {
          errorEl.textContent = typeof t === 'function' ? t('login_error_notfound') : 'Email not registered in Access sheet.';
          errorEl.style.display = 'block';
        }
        if (btnEl) btnEl.disabled = false;
        if (loadingEl) loadingEl.style.display = 'none';
        return;
      }
      userASC = 'ZAM'; 
      console.warn('Demo mode triggered');
    }

    if (typeof DB !== 'undefined') {
      DB.isAdminAccess = DB.adminAccessMap[email] === true;
    }
    
    if (loadingEl) {
      const span = loadingEl.querySelector('span');
      if (span) span.textContent = 'Loading ticket data…';
    }
    
    if (typeof loadAllData === 'function') {
      await loadAllData(email, userASC);
    }
    
    _currentEmail = email; 
    _currentASC = userASC;
    logActivity('Login — Dashboard accessed');
    setupDashboard(email, userASC);
    
  } catch (err) {
    console.error(err);
    if (errorEl) {
      errorEl.textContent = `Error loading data: ${err.message}. Ensure the Google Sheet is public.`;
      errorEl.style.display = 'block';
    }
  }
  if (btnEl) btnEl.disabled = false;
  if (loadingEl) loadingEl.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('login-email');
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
});

function setupDashboard(email, userASC) {
  _currentEmail = email;
  _currentASC = userASC;

  const loginScreen = document.getElementById('login-screen');
  const appScreen = document.getElementById('app');
  if (loginScreen) loginScreen.style.display = 'none';
  if (appScreen) appScreen.style.display = 'flex';

  const initials = email.split('@')[0].substring(0, 2).toUpperCase();
  const avatarEl = document.getElementById('user-avatar');
  const emailDisplayEl = document.getElementById('user-email-display');
  const ascDisplayEl = document.getElementById('user-asc-display');
  const ascBadgeTopEl = document.getElementById('asc-badge-top');

  if (avatarEl) avatarEl.textContent = initials;
  if (emailDisplayEl) emailDisplayEl.textContent = email;
  if (ascDisplayEl) ascDisplayEl.textContent = userASC + (DB.isAdminAccess ? ' ★' : '');
  if (ascBadgeTopEl) ascBadgeTopEl.textContent = userASC;

  const adminBadge = document.getElementById('admin-badge');
  if (adminBadge) adminBadge.style.display = DB.isAdminAccess ? 'inline-flex' : 'none';

  const now = new Date();
  const lastUpdatedEl = document.getElementById('last-updated');
  const refreshTimeEl = document.getElementById('refresh-time');
  if (lastUpdatedEl) lastUpdatedEl.textContent = 'Updated: ' + now.toLocaleTimeString();
  if (refreshTimeEl) refreshTimeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const ascWrap = document.getElementById('filter-asc-wrap');
  if (ascWrap) ascWrap.style.display = DB.isAdmin ? 'block' : 'none';

  const brAlertNav = document.getElementById('nav-alerts');
  if (brAlertNav) brAlertNav.style.display = (DB.isAdmin && DB.isAdminAccess) ? 'flex' : 'none';

  const ccNavItem = document.querySelector('[data-page="page-callcenter"]');
  if (ccNavItem) ccNavItem.style.display = DB.isAdminAccess ? 'flex' : 'none';

  if (typeof DB !== 'undefined' && DB.raw && DB.raw.length > 0) {
    const dates = DB.raw.map(r => r._created).filter(Boolean).sort((a, b) => a - b);
    const dataDateDisplay = document.getElementById('data-date-display');
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    
    if (dates.length) {
      if (dataDateDisplay && typeof fmtDate === 'function') {
        dataDateDisplay.textContent = fmtDate(dates[0]) + ' – ' + fmtDate(dates[dates.length - 1]);
      }
      const toISO = d => d.toISOString().split('T')[0];
      if (filterFrom) filterFrom.value = toISO(dates[0]);
      if (filterTo) filterTo.value = toISO(dates[dates.length - 1]);
    }
  }

  startAutoRefresh();
  navigate('page-overview', document.querySelector('.nav-item[data-page="page-overview"]'));
  if (typeof startOnboardingTourIfFirstLogin === 'function') {
    startOnboardingTourIfFirstLogin(email);
  }
}

function logout() {
  stopAutoRefresh();
  _currentEmail = ''; 
  _currentASC = '';
  
  if (typeof DB !== 'undefined') {
    DB.raw = []; DB.filtered = []; DB.allRaw = []; DB.userASC = null; DB.isAdmin = false;
  }
  
  if (typeof CHART_REGISTRY !== 'undefined') {
    Object.values(CHART_REGISTRY).forEach(c => { try { c.destroy(); } catch (e) {} });
    Object.keys(CHART_REGISTRY).forEach(k => delete CHART_REGISTRY[k]);
  }
  
  const appScreen = document.getElementById('app');
  const loginScreen = document.getElementById('login-screen');
  const loginEmail = document.getElementById('login-email');
  const loginError = document.getElementById('login-error');

  if (appScreen) appScreen.style.display = 'none';
  if (loginScreen) loginScreen.style.display = 'flex';
  if (loginEmail) loginEmail.value = '';
  if (loginError) loginError.style.display = 'none';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }
});

// ── ACTIVITY LOG PAGE ─────────────────────────────────────────
async function renderActivityLog() {
  const isFullAdmin = typeof DB !== 'undefined' && DB.isAdmin && DB.isAdminAccess;
  const el = document.getElementById('page-activity');
  if (!el) return;

  if (!isFullAdmin) {
    el.innerHTML = '<div class="insight-card"><div class="insight-icon">🔒</div><div class="insight-text"><div class="insight-title">Admin Access Required</div>Only users with ASC = All and Admin Access = yes can view this page.</div></div>';
    return;
  }

  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gray-400)"><div class="spinner" style="margin:0 auto 12px"></div>Loading activity data…</div>';

  let heartbeats = {};
  if (HEARTBEAT_URL) {
    heartbeats = await readActiveUsers();
  } else {
    el.innerHTML = '<div class="insight-card"><div class="insight-icon">⚙️</div><div class="insight-text"><div class="insight-title">Heartbeat URL Not Configured</div>Set <code>HEARTBEAT_URL</code> in app.js after deploying the Google Apps Script. See <b>AUX_Heartbeat_Script.gs</b> for instructions.</div></div>';
    return;
  }

  const ACTIVE_TTL = 5 * 60 * 1000; 
  const nowMs = Date.now();
  const isActiveHb = (email) => {
    const hb = heartbeats[email];
    if (!hb) return false;
    return (nowMs - new Date(hb.ts).getTime()) < ACTIVE_TTL;
  };

  let stored = [];
  try { stored = JSON.parse(localStorage.getItem('aux_activity_log') || '[]'); } catch (e) {}
  _activityLog.forEach(e => {
    const key = e.time + '|' + e.email + '|' + e.action;
    if (!stored.find(s => s.time + '|' + s.email + '|' + s.action === key)) stored.push(e);
  });
  stored = stored.slice(-500).reverse();
  try { localStorage.setItem('aux_activity_log', JSON.stringify(stored.slice(0, 500))); } catch (e) {}

  const allUsers = typeof DB !== 'undefined' ? Object.entries(DB.accessMap).map(([email, asc]) => ({
    email, asc, isAdmin: DB.adminAccessMap?.[email] === true
  })) : [];
  
  const totalUsers = allUsers.length;
  const activeCount = allUsers.filter(u => isActiveHb(u.email)).length;
  const loginEvents = stored.filter(e => e.action.startsWith('Login'));
  const failedLogins = stored.filter(e => e.action.includes('FAILED'));

  el.innerHTML = `
  <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
    <div class="kpi-card accent"><div class="kpi-label">Total Users</div><div class="kpi-value">${totalUsers}</div><div class="kpi-delta">In Access sheet</div></div>
    <div class="kpi-card ${activeCount > 0 ? 'green' : 'gray'}"><div class="kpi-label">Active Now</div><div class="kpi-value">${activeCount}</div><div class="kpi-delta">Heartbeat ≤ 5 min</div></div>
    <div class="kpi-card blue"><div class="kpi-label">Login Events</div><div class="kpi-value">${loginEvents.length}</div><div class="kpi-delta">Successful logins</div></div>
    <div class="kpi-card ${failedLogins.length > 0 ? 'red' : 'green'}"><div class="kpi-label">Failed Logins</div><div class="kpi-value">${failedLogins.length}</div><div class="kpi-delta">Unauthorized attempts</div></div>
  </div>

  <div class="section-header"><div class="section-title">User Access List</div><span class="section-badge">${totalUsers} users</span></div>
  <div class="table-card" style="margin-bottom:20px">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Email</th><th>ASC</th><th>Admin</th><th>Last Seen</th><th>Current Page</th><th>Status</th></tr></thead>
      <tbody>${allUsers.map(u => {
        const hb = heartbeats[u.email];
        const active = isActiveHb(u.email);
        const lastLog = stored.find(e => e.email === u.email);
        let lastSeenStr = 'Never';
        if (hb && hb.ts) lastSeenStr = new Date(hb.ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        else if (lastLog) lastSeenStr = esc(lastLog.time);
        const currentPageStr = hb ? esc((hb.page || '—').replace('page-', '')) : '—';
        return '<tr' + (active ? ' style="background:rgba(22,163,74,.06)"' : '') + '>' +
          '<td>' + esc(u.email) + '</td>' +
          '<td style="text-align:center"><span class="badge badge-blue">' + esc(u.asc) + '</span></td>' +
          '<td style="text-align:center">' + (u.isAdmin ? '<span class="badge badge-amber">★ Admin</span>' : '<span class="badge badge-gray">User</span>') + '</td>' +
          '<td class="text-mono text-sm">' + lastSeenStr + '</td>' +
          '<td class="text-sm">' + currentPageStr + '</td>' +
          '<td>' + (active ? '<span class="badge badge-green">● Active</span>' : '<span class="badge badge-gray">Offline</span>') + '</td>' +
        '</tr>';
      }).join('')}</tbody>
    </table></div>
  </div>

  <div class="section-header">
    <div class="section-title">Activity Log</div>
    <span class="section-badge">${stored.length} events</span>
    <button onclick="clearActivityLog()" class="filter-reset-btn" style="width:auto;padding:4px 12px;color:rgba(220,38,38,.8);border-color:rgba(220,38,38,.3)">🗑 Clear</button>
  </div>
  <div class="table-card">
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Time</th><th>Email</th><th>ASC</th><th>Action</th></tr></thead>
      <tbody>${stored.length === 0
        ? '<tr><td colspan="4" class="table-empty">No activity yet</td></tr>'
        : stored.map(e => {
            const iFail = e.action.includes('FAILED');
            return '<tr' + (iFail ? ' style="background:var(--danger-bg)"' : '') + '>' +
              '<td class="text-mono text-sm">' + esc(e.time) + '</td>' +
              '<td>' + esc(e.email) + '</td>' +
              '<td style="text-align:center"><span class="badge ' + (e.asc && e.asc !== '—' ? 'badge-blue' : 'badge-red') + '">' + esc(e.asc || '—') + '</span></td>' +
              '<td>' + (iFail ? '⚠️ ' : '') + esc(e.action) + '</td>' +
            '</tr>';
          }).join('')}
      </tbody>
    </table></div>
  </div>`;
}

function clearActivityLog() {
  if (!confirm('Clear all activity logs? This cannot be undone.')) return;
  try { localStorage.removeItem('aux_activity_log'); } catch (e) {}
  _activityLog.length = 0;
  renderActivityLog();
}

// ── Send Branch Alert Email (Admin + All Access only) ─────────
async function sendBranchAlert(branchName) {
  if (typeof DB === 'undefined' || !DB.isAdmin || !DB.isAdminAccess) {
    alert('Branch alerts can only be sent by Admin users (Admin Access = yes + ASC = All).');
    return;
  }
  logActivity('Send Alert — Branch: ' + branchName);
  try {
    const accessRows = await fetchSheet(CONFIG.ACCESS_SHEET);
    const company = branchName.includes(' - ') ? branchName.split(' - ').pop().trim() : '';

    const toEmails = [];
    const ccEmails = [];

    const normRow = raw => {
      if (!raw.includes(' - ')) return raw;
      return normalizeCityName(raw.split(' - ')[0].trim()) + ' - ' + raw.split(' - ').slice(1).join(' - ').trim();
    };

    for (const r of accessRows) {
      const rowBranch = normRow((r['If Branch has pending'] || '').trim());
      const email = (r['Email'] || r['email'] || '').trim();
      if (email && rowBranch.toLowerCase() === branchName.toLowerCase()) {
        toEmails.push(email);
      }
    }

    if (toEmails.length === 0) {
      for (const r of accessRows) {
        const rowBranch = (r['If Branch has pending'] || '').trim();
        const email = (r['Email'] || r['email'] || '').trim();
        if (email && rowBranch.toLowerCase() === branchName.toLowerCase()) {
          toEmails.push(email);
        }
      }
    }

    for (const r of accessRows) {
      const rowBranch = (r['If Branch has pending'] || '').trim();
      const email = (r['Email'] || r['email'] || '').trim();
      if (!email || toEmails.includes(email)) continue;
      const isCompanyCC = company && rowBranch.toLowerCase() === (company + ' cc').toLowerCase();
      const isAlwaysCC = rowBranch.toLowerCase() === 'always cc';
      if (isCompanyCC || isAlwaysCC) ccEmails.push(email);
    }

    if (toEmails.length === 0 && ccEmails.length === 0) {
      alert('No emails configured for branch: ' + branchName + '\n\nCheck "If Branch has pending" column in Access sheet.');
      return;
    }

    const pending = DB.filtered.filter(r => r._isPending && r._branch === branchName);
    const noReason = pending.filter(r => !r._hasRescheduleReason).length;
    const subject = encodeURIComponent('AUX ASC Alert: ' + pending.length + ' Pending — ' + branchName);
    const body = encodeURIComponent(
      'Dear Service Center Team,\n\nAutomated alert from AUX ASC Dashboard.\n\n' +
      'Branch: ' + branchName + '\nTotal Pending: ' + pending.length + '\nWithout Reason: ' + noReason + '\n\nTickets:\n' +
      pending.slice(0, 15).map(r =>
        '  • ' + (r[CONFIG.COLS.TICKET_NUM] || '') +
        ' | Worker: ' + (r[CONFIG.COLS.WORKER] || 'Unassigned') +
        ' | Aging: ' + (r._agingCat || '—') +
        ' | Phase: ' + (r._phaseLabel || '—') +
        (r._rescheduleReason ? ' | Reason: ' + r._rescheduleReason : ' | ⚠️ NO REASON')
      ).join('\n') + (pending.length > 15 ? '\n  ...and ' + (pending.length - 15) + ' more' : '') +
      '\n\nPlease update reschedule reasons.\n\nAUX ASC Dashboard — Created by Moahed Younes'
    );

    const to = toEmails.join(',');
    const cc = encodeURIComponent(ccEmails.join(';'));
    window.open('mailto:' + to + (cc ? '?cc=' + cc + '&' : '?') + 'subject=' + subject + '&body=' + body, '_blank');
  } catch (err) { 
    alert('Error: ' + err.message); 
  }
}

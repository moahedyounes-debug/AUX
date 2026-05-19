// ═══════════════════════════════
//  AUX ASC DASHBOARD · DATA
// ═══════════════════════════════
const DB = {
  raw: [], filtered: [], allRaw: [],
  accessMap: {}, userASC: null, isAdmin: false, loadedAt: null,
};

// ── CSV parser that handles multi-line quoted fields ──────────
// The Google Sheets export contains rows where Maintenance Instructions
// span multiple lines inside quotes — standard line-by-line split breaks these.
function parseCSV(text) {
  // Remove BOM
  const raw = text.replace(/^\uFEFF/, '');

  // ── Tokenise the whole file character-by-character ──
  // This correctly handles \n inside quoted fields.
  const rows = [];
  let fields = [], cur = '', inQ = false;

  for (let i = 0; i < raw.length; i++) {
    const ch  = raw[i];
    const nxt = raw[i+1];

    if (ch === '"') {
      if (inQ && nxt === '"') { cur += '"'; i++; }   // escaped quote
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) {
      fields.push(cur.trim()); cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && nxt === '\n') i++;           // CRLF
      fields.push(cur.trim());
      rows.push(fields);
      fields = []; cur = '';
    } else {
      cur += ch;
    }
  }
  // last field / row
  if (cur !== '' || fields.length) { fields.push(cur.trim()); rows.push(fields); }

  if (rows.length < 2) return [];
  const headers = rows[0];

  // Handle duplicate headers (like multiple empty columns) by making them unique
  const uniqueHeaders = [];
  const headerCounts = {};
  headers.forEach((h, i) => {
    let key = h;
    if (!key) {
      // For empty headers, use index as key: __col_0, __col_1, etc.
      key = `__col_${i}`;
    } else if (uniqueHeaders.includes(key)) {
      // For duplicate non-empty headers, append counter
      headerCounts[key] = (headerCounts[key] || 1) + 1;
      key = `${h}__${headerCounts[key]}`;
    }
    uniqueHeaders.push(key);
  });

  return rows.slice(1).map(vals => {
    const o = {};
    uniqueHeaders.forEach((h, i) => { o[h] = (vals[i] || '').trim(); });
    return o;
  }).filter(r => {
    // Remove completely empty rows
    return Object.values(r).some(v => v !== '');
  });
}

// ── Parse CSV but ONLY keep rows where Ticket Number starts with "GD" ──
// Used for the main data sheet (Sheet1) only — not for Access sheet
function parseCSV_GD(text) {
  const all = parseCSV(text);
  const ticketCol = Object.keys(all[0] || {})[0] || 'Ticket Number';
  return all.filter(r => {
    const val = r[ticketCol] || '';
    return val.startsWith('GD');
  });
}

async function fetchSheet(name) {
  const r = await fetch(sheetUrl(name));
  if (!r.ok) throw new Error(`Cannot load sheet: ${name}`);
  return parseCSV(await r.text());
}

// ── Fetch main data sheet with GD filter ──
async function fetchDataSheet() {
  const r = await fetch(sheetUrl(CONFIG.DATA_SHEET));
  if (!r.ok) throw new Error(`Cannot load data sheet`);
  return parseCSV_GD(await r.text());
}

// ── Company: normalise to ZAM / wiFEX / Classic / DOZN / ABL ─
function extractCompany(n) {
  if (!n) return '';
  const lower = n.toLowerCase();
  if (lower.includes('zam'))                         return 'ZAM';
  if (lower.includes('wifex') || lower.includes('authorized maintenance and operations')) return 'wiFEX';
  if (lower.includes('classic'))                     return 'Classic';
  if (lower.includes('dozn'))                        return 'DOZN';
  if (lower.includes('abl'))                         return 'ABL';
  return '';  // unknown — will be filtered out
}

// ── Canonical city name map ─────────────────────────────────────
// Maps all known spelling variants → single canonical name.
// Keys MUST be lower-case; values are the canonical display form.
const CITY_NORMALIZE = {
  // ── Khamis Mushait ──────────────────────────────────────────
  'khamis musheet':              'Khamis Mushait',
  'khamis mushayt':              'Khamis Mushait',
  'khamis mushyat':              'Khamis Mushait',
  'khamis musheit':              'Khamis Mushait',
  'khamis mushyt':               'Khamis Mushait',
  'hamis mushait':               'Khamis Mushait',
  // ── Makkah ──────────────────────────────────────────────────
  'makkah al mukarramah':        'Makkah',
  'makkah al-mukarramah':        'Makkah',
  'mecca':                       'Makkah',
  'mekka':                       'Makkah',
  // ── Madinah ─────────────────────────────────────────────────
  'al madinah':                  'Madinah',
  'al madinah al munawwarah':    'Madinah',
  'al-madinah':                  'Madinah',
  'medina':                      'Madinah',
  'madina':                      'Madinah',
  'madinah al munawwarah':       'Madinah',
  // ── Al Hasa / Alhasa ────────────────────────────────────────
  'al hasa':                     'Alhasa',
  'al-hasa':                     'Alhasa',
  'al ahsa':                     'Alhasa',
  'al-ahsa':                     'Alhasa',
  'ahsa':                        'Alhasa',
  // ── Jeddah ──────────────────────────────────────────────────
  'jiddah':                      'Jeddah',
  'jedda':                       'Jeddah',
  'jiddah':                      'Jeddah',
  // ── Qassim ──────────────────────────────────────────────────
  'al qassim':                   'Qassim',
  'al-qassim':                   'Qassim',
  'qaseem':                      'Qassim',
  'qasim':                       'Qassim',
  // Buraydah / Buraidah = capital city of Qassim region (all variants → Qassim)
  'buraydah':                    'Qassim',
  'al buraydah':                 'Qassim',
  'al-buraydah':                 'Qassim',
  'buraidah':                    'Qassim',
  'al buraidah':                 'Qassim',
  'unayzah':                     'Qassim',   // second major city in Qassim
  'unaizah':                     'Qassim',
  'onaizah':                     'Qassim',
  // ── Jizan / Jazan ────────────────────────────────────────────
  'jazan':                       'Jizan',
  'jizan':                       'Jizan',
  // ── Taif ────────────────────────────────────────────────────
  'al taif':                     'Taif',
  'at-taif':                     'Taif',
  "at-ta'if":                    'Taif',
  'ta\'if':                      'Taif',
  // ── Hail ────────────────────────────────────────────────────
  "ha'il":                       'Hail',
  'ha\'il':                      'Hail',
  // ── Riyadh ──────────────────────────────────────────────────
  'ar riyadh':                   'Riyadh',
  'ar-riyadh':                   'Riyadh',
  // ── Dammam ──────────────────────────────────────────────────
  'ad dammam':                   'Dammam',
  'ad-dammam':                   'Dammam',
  // ── Tabuk ───────────────────────────────────────────────────
  'tabuk city':                  'Tabuk',
  // ── Al Kharj ────────────────────────────────────────────────
  'alkharj':                     'Al Kharj',
  'al-kharj':                    'Al Kharj',
  // ── Al Baha ─────────────────────────────────────────────────
  'al-baha':                     'Al Baha',
  'albaha':                      'Al Baha',
  // ── Al Qunfudhah ────────────────────────────────────────────
  'al qunfudah':                 'Al Qunfudhah',
  'al-qunfudhah':                'Al Qunfudhah',
  'qunfudhah':                   'Al Qunfudhah',
  // ── Hafar Al Batin ──────────────────────────────────────────
  'hafar albatin':                'Hafar Al Batin',
  'hafar-al-batin':               'Hafar Al Batin',
  // ── Yanbu ───────────────────────────────────────────────────
  'yanbo':                       'Yanbu',
  'yanbu al-bahr':               'Yanbu',
  // ── Najran ──────────────────────────────────────────────────
  'najran city':                 'Najran',
  // ── Sakaka ──────────────────────────────────────────────────
  'sakakah':                     'Sakaka',
  // ── Rabigh ──────────────────────────────────────────────────
  'rabegh':                      'Rabigh',
  'rabigh city':                 'Rabigh',
  // ── Bisha ───────────────────────────────────────────────────
  'besha':                       'Bisha',
  'bisah':                       'Bisha',
};

// ── Normalise a raw city/branch name to its canonical form ──────
function normalizeCityName(city) {
  if (!city) return city;
  const trimmed = city.trim();
  return CITY_NORMALIZE[trimmed.toLowerCase()] || trimmed;
}

// ── Branch: extract city from the provider name and format as "City - Company"
// Examples:
//   "ZAM - Jeddah Branch"                          → "Jeddah - ZAM"
//   "Classic Pvt. Ltd. Company-Riyadh Branch"       → "Riyadh - Classic"
//   "wiFEX ... - Makkah Al Mukarramah Branch"       → "Makkah - wiFEX"
function extractBranch(n) {
  if (!n) return null;

  const company = extractCompany(n);
  if (!company) return null;   // no valid company → discard

  // Find the city part: text after the last '-', strip " Branch" suffix
  const dashIdx = n.lastIndexOf('-');
  if (dashIdx === -1) return null;

  let city = n.substring(dashIdx + 1).trim();
  city = city.replace(/\s*branch\s*/i, '').trim();
  city = normalizeCityName(city);   // ← canonicalise spelling

  if (!city) return null;

  return `${city} - ${company}`;
}
function parseDate(s) {
  if (!s) return null;
  const str = s.trim();
  if (!str || str === '—' || str === '-') return null;

  // ── ISO / Google Sheets default: "2026-04-28 14:30:00" or "2026-04-28 0:00:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const iso = str.replace(' ', 'T');
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return d;
  }

  // ── "28 Apr, 13:17" or "28 Apr 2026 13:17"
  const mo = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const m1 = str.match(/^(\d{1,2})\s+([A-Za-z]{3})[,\s]+(\d{4})?\s*(\d{1,2}):(\d{2})/);
  if (m1) {
    const [,day,mon,yr,hr,min] = m1;
    const month = mo[mon] ?? mo[mon.slice(0,3)];
    if (month !== undefined) {
      const year = yr ? parseInt(yr) : new Date().getFullYear();
      return new Date(year, month, +day, +hr, +min);
    }
  }

  // ── "28 Apr, 2026" (date only)
  const m2 = str.match(/^(\d{1,2})\s+([A-Za-z]{3})[,\s]+(\d{4})$/);
  if (m2) {
    const month = mo[m2[2]];
    if (month !== undefined) return new Date(+m2[3], month, +m2[1]);
  }

  // ── DD/MM/YYYY or MM/DD/YYYY ─────────────────────────────────
  // Some columns (e.g. Rescheduling) use MM/DD/YYYY (US format).
  // Auto-detect: if the second number > 12 it cannot be a month → MM/DD/YYYY.
  //              if the first  number > 12 it cannot be a day   → DD/MM/YYYY.
  //              otherwise default to DD/MM/YYYY (Saudi standard).
  const m3 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:(\d{1,2}):(\d{2}))?/);
  if (m3) {
    const [,a,b,y,h='0',min='0'] = m3;
    let month, day;
    if (+b > 12) {
      // b can't be a month → MM/DD/YYYY (a=month, b=day)
      month = +a - 1; day = +b;
    } else if (+a > 12) {
      // a can't be a day in DD/MM format → DD/MM/YYYY confirmed (a=day, b=month)
      month = +b - 1; day = +a;
    } else {
      // Ambiguous: default to DD/MM/YYYY (Saudi standard)
      month = +b - 1; day = +a;
    }
    return new Date(+y, month, day, +h, +min);
  }

  // ── Fallback: native Date parse
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// ── Format: date only ─────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—';
  try {
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch(e) { return '—'; }
}

// ── Format: date + time 24h ───────────────────────────────────
function fmtDateTime(d) {
  if (!d) return '—';
  try {
    const dd = String(d.getDate()).padStart(2,'0');
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${dd} ${mo}, ${hh}:${mm}`;
  } catch(e) { return '—'; }
}

// ── Format: time only 24h ────────────────────────────────────
function fmtTime(d) {
  if (!d) return '—';
  try {
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  } catch(e) { return '—'; }
}

// ── Format: date + full time 24h (for logs) ──────────────────
function fmtDateTimeFull(d) {
  if (!d) return '—';
  try {
    const dd = String(d.getDate()).padStart(2,'0');
    const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
    const yr = d.getFullYear();
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    const ss = String(d.getSeconds()).padStart(2,'0');
    return `${dd} ${mo} ${yr}, ${hh}:${mm}:${ss}`;
  } catch(e) { return '—'; }
}

function enrichRow(row) {
  const C = CONFIG.COLS; const r = {...row};

  // ── Company & Branch ─────────────────────────────
  r._company = extractCompany(r[C.PROVIDER_NAME]);
  r._branch  = extractBranch(r[C.PROVIDER_NAME]);

  // ── Ticket number must start with GD ─────────────
  r._validTicket = (r[C.TICKET_NUM]||'').startsWith('GD');

  // ── Dates ────────────────────────────────────────
  r._created    = parseDate(r[C.CREATED]);
  r._dispatch   = parseDate(r[C.DISPATCH]);
  r._completion = parseDate(r[C.COMPLETION_TIME]);
  // Rescheduling = scheduled visit date
  r._rescheduled = parseDate(r[C.RESCHEDULING]);
  r._appointed   = parseDate(r[C.APPOINTED]);

  // ── Raw field values ─────────────────────────────
  const affiliated     = (r[C.AFFILIATED] || '').trim();
  const completion     = (r[C.COMPLETION_RESULT] || '').trim();
  const completionLow  = completion.toLowerCase();
  const phase          = (r[C.PHASE] || '').trim();
  const phaseLow       = phase.toLowerCase();
  const status         = (r[C.STATUS] || '').trim();
  const statusLow      = status.toLowerCase();
  const serviceInfo    = (r[C.SERVICE_INFO] || r[C.SERVICE_TYPE] || '');
  const serviceInfoUp  = serviceInfo.toUpperCase();

  // ── Pending: Affiliated NOT blank + Completion Result IS blank ─
  r._isPending = affiliated !== '' && completion === '';

  // ── Status classification per spec: ──────────────
  // Rejected:  Phase=Refusal(worker)     Status=Rejected          CompResult NOT blank/cancel
  // Returned:  Phase=Rejected upon review Status=Returned order    CompResult NOT blank/cancel
  // OBM-Statement: Phase=Statement Status=Statement of account CompResult=Cancel + ServiceInfo contains OBM
  // Cancelled: CompResult contains "cancel" AND ServiceInfo does NOT contain OBM → EXCLUDED

  r._isRejected = (phaseLow.includes('refusal') || statusLow.includes('rejected'))
    && completion !== '' && !completionLow.includes('cancel');

  r._isReturned = (phaseLow.includes('rejected upon review') || statusLow.includes('returned'))
    && completion !== '' && !completionLow.includes('cancel');

  r._isOBMStatement = completionLow.includes('cancel') && serviceInfoUp.includes('OBM');

  // Cancelled = cancel in Completion Result AND NOT OBM → will be filtered out in loadAllData
  r._isCancelled = completionLow.includes('cancel') && !serviceInfoUp.includes('OBM');

  // ── Numerics ──────────────────────────────────────
  const sh = parseFloat(r[C.SERVICE_HOURS]); r._serviceHours = isNaN(sh) ? null : sh;
  const mi = parseFloat(r[C.MILEAGE]);       r._mileage      = isNaN(mi) ? null : mi;
  r._farDistance = r._mileage !== null && r._mileage > 60;

  // Debug: Log mileage values for tickets marked as far distance
  if (r._farDistance && !window._mileageDebugLogged) {
    console.log('Sample far distance tickets:', {
      ticket: r[C.TICKET_NUM],
      rawMileage: r[C.MILEAGE],
      parsedMileage: r._mileage,
      isFarDistance: r._farDistance
    });
  }
  r._hasWorker   = !!(r[C.WORKER] && r[C.WORKER].trim());

  // ── Aging ─────────────────────────────────────────
  const now = new Date();
  if (r._isPending && r._dispatch)                        r._agingHours = (now - r._dispatch) / 3600000;
  else if (!r._isPending && r._completion && r._dispatch) r._agingHours = (r._completion - r._dispatch) / 3600000;
  else if (r._dispatch)                                   r._agingHours = (now - r._dispatch) / 3600000;
  else                                                    r._agingHours = null;

  // ── Pending Duration = Completion Time − Dispatch ─
  if (r._dispatch) {
    const end = r._completion || new Date();
    r._pendingDurationHrs = (end - r._dispatch) / 3600000;
  } else r._pendingDurationHrs = null;

  // ── Month key ─────────────────────────────────────
  r._monthKey = r._created
    ? `${r._created.getFullYear()}-${String(r._created.getMonth()+1).padStart(2,'0')}` : '';

  // ── Reschedule info ───────────────────────────────
  r._rescheduleReason = r[C.RESCHED_REASON] || '';
  r._rescheduleDate   = r[C.RESCHEDULING] || '';
  r._rescheduleRemark = r[C.RESCHED_SUPP] || '';
  // Combined display
  r._rescheduleDisplay = [
    r._rescheduleDate ? 'Date: ' + r._rescheduleDate.substring(0,10) : '',
    r._rescheduleRemark ? r._rescheduleRemark : ''
  ].filter(Boolean).join(' · ') || '—';

  // ── Has reschedule reason (for counting) ──────────
  r._hasRescheduleReason = !!(r[C.RESCHED_REASON] && r[C.RESCHED_REASON].trim());

  // ── Ticket Status from Processing Phase (per spec) ──
  // Mapping: Processing Phase + Ticket Status → Final Status Label & Color
  // Dynamic suffix: If Rescheduling date available → append " and appointment updated"
  //                 Else if Reason/Remark available → append " and reason updated"
  r._ticketStatus = status;  // original Ticket Status field
  r._phase        = phase;   // original Processing Phase

  const phaseLowTrimmed = phaseLow.trim();
  const statusLowTrimmed = statusLow.trim();
  let baseLabel = '';
  let baseColor = 'gray';

  // 1. Headquarters Dispatch Network | Not assigned → Red
  if (phaseLowTrimmed.includes('dispatch network')) {
    baseLabel = 'Not assigned';
    baseColor = 'red';
  }
  // 2. Branch dispatching workers | Dispatched work → amber
  else if (phaseLowTrimmed.includes('branch dispatching')) {
    baseLabel = 'Dispatched But Not Accepted By Technician';
    baseColor = 'amber';
  }
  // 3. Accepting orders (workers) | Accepted → Orange
  else if (phaseLowTrimmed.includes('accepting orders')) {
    baseLabel = 'Accepted By Technician';
    baseColor = 'orange';
  }
  // 4a. Change of appointment time (branch) with Dispatched work → amber
  else if (phaseLowTrimmed.includes('change of appointment time') && statusLowTrimmed.includes('dispatched')) {
    baseLabel = 'Dispatched & appointment updated But Not Accepted By Technician';
    baseColor = 'amber';
  }
  // 4b. Change of appointment time (branch) with Accepted → Green
  else if (phaseLowTrimmed.includes('change of appointment time') && statusLowTrimmed.includes('accepted')) {
    baseLabel = 'Accepted By Technician';
    baseColor = 'green';
  }
  // 5. Statement | Statement of account → Green
  else if (phaseLowTrimmed.includes('statement')) {
    baseLabel = 'Completed';
    baseColor = 'green';
  }
  // 6. Change of schedule (workers) | Accepted → Green
  else if (phaseLowTrimmed.includes('change of schedule')) {
    baseLabel = 'Accepted By Technician';
    baseColor = 'green';
  }
  // 7. Completion Confirmation (Headquarters) | Completed → Green
  else if (phaseLowTrimmed.includes('completion confirmation')) {
    baseLabel = 'Completed';
    baseColor = 'green';
  }
  // 8. Rejected upon review (repair) | Returned order → Red
  else if (phaseLowTrimmed.includes('rejected upon review')) {
    baseLabel = 'Rejected';
    baseColor = 'red';
  }
  // 9. Order Creation (Headquarters) | Not assigned → Red
  else if (phaseLowTrimmed.includes('order creation')) {
    baseLabel = 'Created but not assigned to SVC Center';
    baseColor = 'red';
  }
  // Fallback
  else {
    baseLabel = phase || status || '—';
    baseColor = 'gray';
  }

  // ── Dynamic suffix based on actual data ──
  // Check both appointment date AND reason/remark
  // ONLY apply dynamic suffixes to PENDING tickets - completed tickets show base status only
  let finalLabel = baseLabel;
  const hasAppointment = r._rescheduled;
  const hasReason = r._hasRescheduleReason || r._rescheduleRemark;
  const alreadyHasAppointment = baseLabel.toLowerCase().includes('appointment');

  if (r._isPending && !alreadyHasAppointment) {
    // Only add suffixes if base label doesn't already include appointment info
    if (hasAppointment && hasReason) {
      finalLabel += ' and appointment and reason updated';
    } else if (hasAppointment) {
      finalLabel += ' and appointment updated';
    } else if (hasReason) {
      finalLabel += ' and reason updated';
    }
  }

  r._phaseLabel = finalLabel;
  r._phaseColor = baseColor;

  // _isDispatchedWork = ONLY "Branch dispatching workers"
  // _isNotAssigned    = "Dispatch Network" phase
  r._isNotAssigned    = phaseLowTrimmed.includes('dispatch network');
  r._isDispatchedWork = phaseLowTrimmed.includes('branch dispatching');

  // ── Aging category label ──────────────────────────
  if (r._agingHours === null) r._agingCat = '—';
  else if (r._agingHours <= 12)  r._agingCat = '≤ 12h';
  else if (r._agingHours <= 24)  r._agingCat = '≤ 24h';
  else if (r._agingHours <= 48)  r._agingCat = '≤ 48h';
  else if (r._agingHours <= 72)  r._agingCat = '≤ 72h';
  else                           r._agingCat = '> 72h';

  return r;
}

async function loadAllData(email, userASC) {
  const rawRows = await fetchDataSheet();  // Uses GD-filtered parser
  
  // Load Pending Reason mapping sheet
  let reasonMap = {};
  try {
    const reasonRows = await fetchSheet('Penidng Reason');
    reasonRows.forEach(r => {
      const reason = (r['Reason For Rescheduling'] || '').trim();
      const cat    = (r['Category'] || '').trim();
      if (reason && cat) reasonMap[reason.toLowerCase()] = cat;
    });
    console.log('Pending Reason map loaded:', Object.keys(reasonMap).length, 'entries');
  } catch(e) { console.warn('Pending Reason sheet not found, using fallback:', e.message); }
  
  const enriched = rawRows
    .map(r => {
      const row = enrichRow(r);
      // Apply category from Pending Reason sheet
      if (row._rescheduleReason && reasonMap[row._rescheduleReason.toLowerCase()]) {
        row._reasonCategory = reasonMap[row._rescheduleReason.toLowerCase()];
      } else {
        row._reasonCategory = '';
      }
      return row;
    })
    .filter(r => {
      if (!r._company) return false;
      if (!r._branch) return false;
      if (r._isCancelled) return false;
      return true;
    });

  DB.isAdmin = (userASC === CONFIG.ALL_ACCESS);
  if (DB.isAdmin) { DB.allRaw=[...enriched]; DB.raw=[...enriched]; }
  else { DB.allRaw=[]; DB.raw=enriched.filter(r=>r._company===userASC); }
  DB.userASC=userASC; DB.loadedAt=new Date();
  DB.filtered=[...DB.raw];
  populateDropdowns(DB.raw);
}

function applyFilters() {
  const from    = document.getElementById('filter-from')?.value;
  const to      = document.getElementById('filter-to')?.value;
  const branch  = document.getElementById('filter-branch')?.value;
  const worker  = document.getElementById('filter-worker')?.value;
  const company = document.getElementById('filter-company')?.value;
  let src = DB.isAdmin ? DB.allRaw : DB.raw;
  if (DB.isAdmin && company) src = src.filter(r=>r._company===company);
  DB.filtered = src.filter(r => {
    if (from && r._created && r._created<new Date(from)) return false;
    if (to   && r._created && r._created>new Date(to+'T23:59:59')) return false;
    if (branch && r._branch!==branch) return false;
    if (worker && r[CONFIG.COLS.WORKER]!==worker) return false;
    return true;
  });
  populateDropdowns(src);
  renderCurrentPage();
}

function resetFilters() {
  ['filter-from','filter-to','filter-branch','filter-worker','filter-company'].forEach(id=>{
    const el=document.getElementById(id); if(el)el.value='';
  });
  DB.filtered=[...(DB.isAdmin?DB.allRaw:DB.raw)];
  populateDropdowns(DB.isAdmin?DB.allRaw:DB.raw);
  renderCurrentPage();
}

function populateDropdowns(src) {
  const branches=[...new Set(src.map(r=>r._branch).filter(Boolean))].sort();
  const workers=[...new Set(src.map(r=>r[CONFIG.COLS.WORKER]).filter(Boolean))].sort();
  const br=document.getElementById('filter-branch');
  if(br){
    const prev=br.value; // save selection before rebuild
    br.innerHTML='<option value="">All Branches</option>'+branches.map(b=>`<option value="${esc(b)}">${esc(b)}</option>`).join('');
    if(prev) br.value=prev; // restore selection
  }
  const wk=document.getElementById('filter-worker');
  if(wk){
    const prev=wk.value; // save selection before rebuild
    wk.innerHTML='<option value="">All Workers</option>'+workers.map(w=>`<option value="${esc(w)}">${esc(w)}</option>`).join('');
    if(prev) wk.value=prev; // restore selection
  }
}

// ── Helpers ──────────────────────────────────
function groupByMonth(rows){
  const m={};
  rows.forEach(r=>{if(!r._monthKey)return;if(!m[r._monthKey])m[r._monthKey]=[];m[r._monthKey].push(r);});
  return Object.entries(m).sort(([a],[b])=>a.localeCompare(b));
}
function groupBy(rows,fn){
  const m={};
  rows.forEach(r=>{const k=fn(r)||'(Unknown)';if(!m[k])m[k]=[];m[k].push(r);});
  return m;
}
function avg(rows,fn){
  const v=rows.map(fn).filter(x=>x!==null&&!isNaN(x));
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
}
function esc(s){
  if(!s)return'';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmt(n,d=0){
  if(n===null||n===undefined||isNaN(n))return'—';
  return Number(n).toLocaleString('en',{maximumFractionDigits:d,minimumFractionDigits:d});
}
function fmtPct(n,d=1){
  if(n===null||n===undefined||isNaN(n))return'—';
  return Number(n).toFixed(d)+'%';
}
function formatMonthLabel(ym){
  if(!ym) return '—';
  const[y,m]=ym.split('-');
  const idx = parseInt(m) - 1;
  const monthStr = (typeof getMonthName === 'function')
    ? getMonthName(idx)
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx];
  return monthStr + ' ' + y;
}
function truncate(s,n){if(!s)return'—';return s.length>n?s.substring(0,n)+'…':s;}

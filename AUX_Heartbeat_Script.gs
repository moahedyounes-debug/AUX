/**
 * AUX ASC Dashboard — Heartbeat + Parts Tracker
 * ══════════════════════════════════════════════
 * Google Apps Script Web App
 *
 * SHEETS IN THIS WORKBOOK:
 *   Sheet1      → Main ticket data (read-only from dashboard)
 *   ActiveUsers → Timestamp | Email | ASC | Page | Action
 *   Access      → Email | ASC | If Branch has pending | Admin Access | parts
 *   Parts       → Order Number | Part Number | Part Discerption | AWB | Request Date | Final Status | Branch | Qty
 *   Tracking    → Order Number | Airwaybill | Carrier | Added By | ASC | Added At | Status
 *
 * ACTIONS HANDLED:
 *   heartbeat    → logs to ActiveUsers, updates cache
 *   logout       → removes from cache, logs to ActiveUsers
 *   parts_request → writes to Parts sheet (8 cols exact)
 *   tracking     → writes/updates Tracking sheet (7 cols)
 *
 * DEPLOY:
 *   Extensions → Apps Script → Deploy → New deployment
 *   Type: Web app | Execute as: Me | Access: Anyone
 */

const SHEET_ACTIVE  = 'ActiveUsers';
const SHEET_PARTS   = 'Parts';
const SHEET_TRACKING= 'Tracking';
const CACHE_KEY     = 'active_users';
const CACHE_TTL     = 21600; // 6 hours
const STALE_MS      = 10 * 60 * 1000; // 10 min → remove from cache

// ── GET: return active users from cache ───────────────────────
function doGet(e) {
  const result = CacheService.getScriptCache().get(CACHE_KEY) || '{}';
  return ContentService
    .createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: handle all actions ──────────────────────────────────
function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const email = (data.email || '').toLowerCase().trim();
    const action= (data.action || 'heartbeat');

    // Route to handler
    if (action === 'parts_request') {
      writePartsRequest(data);
      return ok();
    }
    if (action === 'tracking') {
      writeTracking(data);
      return ok();
    }

    // Heartbeat / logout → update cache + log
    if (!email) return ok();

    const cache = CacheService.getScriptCache();
    let users = {};
    try { users = JSON.parse(cache.get(CACHE_KEY) || '{}'); } catch(err) {}

    if (action === 'logout') {
      delete users[email];
    } else {
      users[email] = {
        email,
        asc:  data.asc  || '—',
        page: data.page || '—',
        ts:   data.ts   || new Date().toISOString(),
      };
    }

    // Remove stale entries
    const cutoff = Date.now() - STALE_MS;
    Object.keys(users).forEach(k => {
      if (new Date(users[k].ts).getTime() < cutoff) delete users[k];
    });

    cache.put(CACHE_KEY, JSON.stringify(users), CACHE_TTL);
    logToActiveUsers(data, action);

  } catch(err) {
    console.error('doPost error:', err.toString());
  }
  return ok();
}

// ── Write to Parts sheet ───────────────────────────────────────
// Columns (exact match to sheet):
//   Order Number | Part Number | Part Discerption | AWB |
//   Request Date | Final Status | Branch | Qty
function writePartsRequest(data) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_PARTS);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_PARTS);
      sheet.appendRow([
        'Order Number', 'Part Number', 'Part Discerption',
        'AWB', 'Request Date', 'Final Status', 'Branch', 'Qty'
      ]);
      sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const orderNo = String(data.orderNumber || '').trim();

    // If order exists → update AWB and/or Final Status only
    if (orderNo) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const col1 = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
        const idx  = col1.findIndex(v => String(v).trim() === orderNo);
        if (idx >= 0) {
          const row = idx + 2;
          if (data.awb)         sheet.getRange(row, 4).setValue(data.awb);
          if (data.finalStatus) sheet.getRange(row, 6).setValue(data.finalStatus);
          return;
        }
      }
    }

    // New row
    sheet.appendRow([
      orderNo                   || '—',  // Order Number
      data.partNumber           || '—',  // Part Number
      data.partDesc             || '—',  // Part Discerption  ← exact spelling
      data.awb                  || '',   // AWB
      data.requestDate          || new Date().toLocaleDateString('en-GB'), // Request Date
      data.finalStatus          || 'Pending', // Final Status
      data.branch               || '—',  // Branch
      data.qty                  || '1',  // Qty
    ]);

  } catch(err) {
    console.error('writePartsRequest error:', err.toString());
  }
}

// ── Write to Tracking sheet ────────────────────────────────────
// Columns: Order Number | Airwaybill | Carrier | Added By | ASC | Added At | Status
function writeTracking(data) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_TRACKING);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_TRACKING);
      sheet.appendRow([
        'Order Number', 'Airwaybill', 'Carrier',
        'Added By', 'ASC', 'Added At', 'Status'
      ]);
      sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const orderNo = String(data.orderNumber || '').trim();
    const awb     = String(data.awb         || '').trim();

    // If order exists → update AWB + Status
    if (orderNo || awb) {
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
        const idx  = rows.findIndex(r =>
          (orderNo && String(r[0]).trim() === orderNo) ||
          (awb     && String(r[1]).trim() === awb)
        );
        if (idx >= 0) {
          const row = idx + 2;
          if (awb)           sheet.getRange(row, 2).setValue(awb);
          if (data.status)   sheet.getRange(row, 7).setValue(data.status);
          if (data.carrier)  sheet.getRange(row, 3).setValue(data.carrier);
          return;
        }
      }
    }

    // New row
    sheet.appendRow([
      orderNo                || '—',
      awb                    || '—',
      data.carrier           || 'SMSA Express',
      data.addedBy           || data.email || '—',
      data.asc               || '—',
      new Date().toLocaleString('en-GB'),
      data.status            || 'Pending',
    ]);

  } catch(err) {
    console.error('writeTracking error:', err.toString());
  }
}

// ── Log to ActiveUsers sheet ───────────────────────────────────
// Columns: Timestamp | Email | ASC | Page | Action
function logToActiveUsers(data, action) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_ACTIVE);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_ACTIVE);
      sheet.appendRow(['Timestamp', 'Email', 'ASC', 'Page', 'Action']);
      sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const label = action === 'logout'    ? 'Logout'
                : action === 'heartbeat' ? 'Active'
                :                          'Login';

    sheet.appendRow([
      new Date().toLocaleString('en-GB'),
      data.email || '—',
      data.asc   || '—',
      data.page  || '—',
      label,
    ]);

    // Keep last 3000 rows only
    const lastRow = sheet.getLastRow();
    if (lastRow > 3001) {
      sheet.deleteRows(2, lastRow - 3001);
    }
  } catch(err) {
    console.error('logToActiveUsers error:', err.toString());
  }
}

// ── Helper ─────────────────────────────────────────────────────
function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

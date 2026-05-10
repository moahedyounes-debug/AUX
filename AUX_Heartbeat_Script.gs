/**
 * AUX ASC Dashboard — Heartbeat Tracker
 * ══════════════════════════════════════
 * Google Apps Script Web App
 *
 * HOW TO DEPLOY:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file (replace any existing code)
 * 3. Save (Ctrl+S)
 * 4. Click "Deploy" → "New deployment"
 * 5. Type: Web app
 * 6. Execute as: Me
 * 7. Who has access: Anyone  ← IMPORTANT
 * 8. Click Deploy → Copy the Web App URL
 * 9. Paste the URL into app.js → HEARTBEAT_URL = 'paste here'
 * 10. Re-upload app.js to GitHub
 *
 * SHEET SETUP:
 * Creates a sheet named "ActiveUsers" automatically with columns:
 * Email | ASC | Page | Timestamp | Status
 */

const SHEET_NAME = 'ActiveUsers';
const ACTIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── GET: Read active users ────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;

  const result = CacheService.getScriptCache().get('active_users') || '{}';
  
  return ContentService
    .createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── POST: Write heartbeat or logout ──────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const email = (data.email || '').toLowerCase().trim();
    if (!email) return ok();

    const cache = CacheService.getScriptCache();
    let users = {};
    try { users = JSON.parse(cache.get('active_users') || '{}'); } catch(err) {}

    if (data.action === 'logout') {
      delete users[email];
    } else if (data.action === 'parts_request') {
      // Write spare part request to Parts sheet in main spreadsheet
      writePartsRequest(data);
      return ok();
    } else {
      // heartbeat
      users[email] = {
        email: email,
        asc:   data.asc  || '—',
        page:  data.page || '—',
        ts:    data.ts   || new Date().toISOString(),
      };
    }

    // Clean up stale entries (> 10 minutes)
    const cutoff = Date.now() - 10 * 60 * 1000;
    Object.keys(users).forEach(k => {
      if (new Date(users[k].ts).getTime() < cutoff) delete users[k];
    });

    // Store in cache (expires in 21600 sec = 6 hours)
    cache.put('active_users', JSON.stringify(users), 21600);

    // Also log to sheet
    logToSheet(data);

  } catch(err) {
    // Swallow errors — client uses no-cors so won't see response anyway
  }

  return ok();
}

function ok() {
  return ContentService
    .createTextOutput(JSON.stringify({status:'ok'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function writePartsRequest(data) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const SHEET = data.sheet || 'Parts';
    let sheet   = ss.getSheetByName(SHEET);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET);
      sheet.appendRow(['Order Number','Part Number','Part Description','AWB','Request Date','Final Status','Branch','Qty','Notes','Requested By','ASC']);
      sheet.getRange(1,1,1,11).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    // Check if order already exists — update AWB / status if so
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const orderCol = sheet.getRange(2,1,lastRow-1,1).getValues().flat();
      const existIdx = orderCol.findIndex(v => String(v).trim() === String(data.orderNumber||'').trim());
      if (existIdx >= 0) {
        const row = existIdx + 2;
        if (data.awb) sheet.getRange(row, 4).setValue(data.awb);
        if (data.finalStatus) sheet.getRange(row, 6).setValue(data.finalStatus);
        return;
      }
    }
    // New request
    sheet.appendRow([
      data.orderNumber  || '—',
      data.partNumber   || '—',
      data.partDesc     || '—',
      data.awb          || '',
      data.requestDate  || new Date().toLocaleDateString('en-GB'),
      data.finalStatus  || 'Pending',
      data.branch       || '—',
      data.qty          || '1',
      data.notes        || '',
      data.requestedBy  || '—',
      data.asc          || '—',
    ]);
  } catch(err) {
    // best-effort
  }
}

function logToSheet(data) {
  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    let sheet   = ss.getSheetByName(SHEET_NAME);

    // Create sheet if missing
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(['Timestamp', 'Email', 'ASC', 'Page', 'Action']);
      sheet.getRange(1,1,1,5).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    const action = data.action === 'logout'   ? 'Logout'
                 : data.action === 'heartbeat' ? 'Active'
                 : 'Login';

    sheet.appendRow([
      new Date().toLocaleString('en-GB'),
      data.email || '—',
      data.asc   || '—',
      data.page  || '—',
      action,
    ]);

    // Keep only last 2000 rows
    const lastRow = sheet.getLastRow();
    if (lastRow > 2001) {
      sheet.deleteRows(2, lastRow - 2001);
    }
  } catch(err) {
    // Sheet logging is best-effort
  }
}

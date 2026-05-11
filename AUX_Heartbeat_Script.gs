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
const SHEET_PARTS_MODEL = 'Parts Model';
const ACTIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── GET: Handle multiple actions ─────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  const query = e.parameter.query || '';

  // Lookup models from Parts Model sheet
  if (action === 'models') {
    return ContentService
      .createTextOutput(JSON.stringify(getModelsList(query)))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Default: return active users from cache
  const result = CacheService.getScriptCache().get('active_users') || '{}';

  return ContentService
    .createTextOutput(result)
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET Models from Parts Model sheet ────────────────────────
// Column structure: J=Customer Model, E=Accessory Code, G=Accessory Name
function getModelsList(query) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_PARTS_MODEL);
    if (!sheet) return { error: 'Parts Model sheet not found', models: [] };

    const data = sheet.getDataRange().getValues();
    const models = [];

    // Skip header row, collect unique models matching query
    // Columns: J=Customer Model, E=Accessory Code (Part Number), G=Accessory Name (Description)
    const seen = new Set();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const model = String(row[9] || '').trim();        // Column J: Customer Model
      const partNum = String(row[4] || '').trim();      // Column E: Accessory Code
      const partDesc = String(row[6] || '').trim();     // Column G: Accessory Name

      if (model && !seen.has(model) && model.toUpperCase().startsWith(query.toUpperCase())) {
        models.push({
          model: model,
          partNumber: partNum,
          partDescription: partDesc,
        });
        seen.add(model);
      }
    }

    return { error: null, models: models };
  } catch (err) {
    return { error: err.toString(), models: [] };
  }
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
      sheet.appendRow(['Order Number','Part Number','Part Description','Model','Serial Number','AWB','Request Date','Final Status','Branch','Qty','Notes','Requested By','ASC']);
      sheet.getRange(1,1,1,13).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    // Check if order already exists — update AWB / status if so
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const orderCol = sheet.getRange(2,1,lastRow-1,1).getValues().flat();
      const existIdx = orderCol.findIndex(v => String(v).trim() === String(data.orderNumber||'').trim());
      if (existIdx >= 0) {
        const row = existIdx + 2;
        if (data.awb) sheet.getRange(row, 6).setValue(data.awb);
        if (data.finalStatus) sheet.getRange(row, 8).setValue(data.finalStatus);
        return;
      }
    }
    // New request
    sheet.appendRow([
      data.orderNumber  || '—',
      data.partNumber   || '—',
      data.partDesc     || '—',
      data.model        || '—',
      data.serialNumber || '',
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

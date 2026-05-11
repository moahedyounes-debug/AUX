/**
 * AUX ASC Dashboard — Heartbeat Tracker [ENHANCED DEBUG VERSION]
 * ══════════════════════════════════════════════════════════════
 * Google Apps Script Web App
 *
 * HOW TO DEPLOY:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file (replace any existing code)
 * 3. Save (Ctrl+S)
 * 4. Click "Deploy" → "New deployment" (or update existing)
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
const PARTS_MODEL_SHEET_ID = '1jQvpH0ZA5V_JB0Y2uLBM-3_Bt9VurTbncAE4WDv4wUg'; // Separate spreadsheet with Parts Model
const ACTIVE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── TEST ENDPOINT: Debug sheet structure ─────────────────────
function testSheets() {
  const mainSS = SpreadsheetApp.getActiveSpreadsheet();
  const partsModelSS = SpreadsheetApp.openById(PARTS_MODEL_SHEET_ID);

  const partsModel = partsModelSS.getSheetByName(SHEET_PARTS_MODEL);
  const parts = mainSS.getSheetByName('Parts');

  const result = {
    mainSpreadsheetId: mainSS.getId(),
    partsModelSpreadsheetId: PARTS_MODEL_SHEET_ID,
    mainSheetNames: mainSS.getSheets().map(s => s.getName()),
    partsModelSpreadsheetSheets: partsModelSS.getSheets().map(s => s.getName()),
    partsModelExists: !!partsModel,
    partsSheetExists: !!parts,
  };

  if (partsModel) {
    const data = partsModel.getDataRange().getValues();
    result.partsModelRowCount = data.length;
    result.partsModelColCount = data[0]?.length;
    result.partsModelHeader = data[0];
    result.partsModelSampleRows = data.slice(1, 3);
  }

  if (parts) {
    const data = parts.getDataRange().getValues();
    result.partsRowCount = data.length;
    result.partsColCount = data[0]?.length;
    result.partsHeader = data[0];
  }

  return result;
}

// ── GET: Handle multiple actions ─────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  const query = e.parameter.query || '';

  // Test endpoint - returns sheet structure info
  if (action === 'test') {
    return ContentService
      .createTextOutput(JSON.stringify(testSheets(), null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Lookup models from Parts Model sheet
  if (action === 'models') {
    const result = getModelsList(query);
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Lookup all parts for a specific model
  if (action === 'parts_for_model') {
    const result = getPartsForModel(query);
    return ContentService
      .createTextOutput(JSON.stringify(result))
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
    // Read from the SEPARATE Parts Model spreadsheet
    const partsModelSS = SpreadsheetApp.openById(PARTS_MODEL_SHEET_ID);
    const sheet = partsModelSS.getSheetByName(SHEET_PARTS_MODEL);

    if (!sheet) {
      const sheetNames = partsModelSS.getSheets().map(s => s.getName());
      return {
        error: `Parts Model sheet not found in Parts Model spreadsheet. Available sheets: ${sheetNames.join(', ')}`,
        models: [],
        debug: { query, sheetNames, spreadsheetId: PARTS_MODEL_SHEET_ID }
      };
    }

    const data = sheet.getDataRange().getValues();
    const models = [];

    Logger.log(`getModelsList: Query="${query}", Total rows=${data.length}`);
    Logger.log(`getModelsList: Header row: ${JSON.stringify(data[0])}`);

    // Skip header row, collect unique models matching query
    // Columns: J=Customer Model (index 9), E=Accessory Code (index 4), G=Accessory Name (index 6)
    const seen = new Set();
    let matchCount = 0;

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
        matchCount++;
        Logger.log(`Found model: ${model} (${partNum} - ${partDesc})`);
      }
    }

    Logger.log(`getModelsList: Found ${matchCount} matching models`);
    return { error: null, models: models };
  } catch (err) {
    const errMsg = err.toString();
    Logger.log(`getModelsList ERROR: ${errMsg}`);
    return {
      error: `Error loading models: ${errMsg}`,
      models: [],
      debug: { query }
    };
  }
}

// ── GET All Parts for a specific Model ───────────────────────
// Returns all parts (accessories) available for a given model
function getPartsForModel(modelName) {
  try {
    // Read from the SEPARATE Parts Model spreadsheet
    const partsModelSS = SpreadsheetApp.openById(PARTS_MODEL_SHEET_ID);
    const sheet = partsModelSS.getSheetByName(SHEET_PARTS_MODEL);

    if (!sheet) {
      return {
        error: 'Parts Model sheet not found',
        parts: []
      };
    }

    const data = sheet.getDataRange().getValues();
    const parts = [];

    Logger.log(`getPartsForModel: Model="${modelName}", Total rows=${data.length}`);

    // Columns: J=Customer Model (index 9), E=Accessory Code (index 4), G=Accessory Name (index 6)
    const seen = new Set();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const model = String(row[9] || '').trim();        // Column J: Customer Model
      const partNum = String(row[4] || '').trim();      // Column E: Accessory Code
      const partDesc = String(row[6] || '').trim();     // Column G: Accessory Name

      // Collect ALL parts for the exact model match
      if (model.toUpperCase() === modelName.toUpperCase() && partNum && !seen.has(partNum)) {
        parts.push({
          partNumber: partNum,
          partDescription: partDesc,
          model: model
        });
        seen.add(partNum);
        Logger.log(`Found part for model ${model}: ${partNum} - ${partDesc}`);
      }
    }

    Logger.log(`getPartsForModel: Found ${parts.length} parts for model ${modelName}`);
    return { error: null, parts: parts };
  } catch (err) {
    const errMsg = err.toString();
    Logger.log(`getPartsForModel ERROR: ${errMsg}`);
    return {
      error: `Error loading parts: ${errMsg}`,
      parts: []
    };
  }
}

// ── POST: Write heartbeat or logout ──────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const email = (data.email || '').toLowerCase().trim();

    Logger.log(`doPost: action=${data.action}, email=${email}`);

    if (!email && data.action !== 'parts_request') {
      Logger.log(`doPost: Email missing, skipping`);
      return ok();
    }

    const cache = CacheService.getScriptCache();
    let users = {};
    try { users = JSON.parse(cache.get('active_users') || '{}'); } catch(err) {}

    if (data.action === 'logout') {
      delete users[email];
      Logger.log(`User logged out: ${email}`);
    } else if (data.action === 'parts_request') {
      // Write spare part request to Parts sheet in main spreadsheet
      Logger.log(`doPost: Processing parts_request for order: ${data.orderNumber}, status: ${data.finalStatus}`);
      writePartsRequest(data);
      // Sync status back to daily operations if applicable
      syncPartStatusToDailyOps(data);
      return ok();
    } else {
      // heartbeat
      users[email] = {
        email: email,
        asc:   data.asc  || '—',
        page:  data.page || '—',
        ts:    data.ts   || new Date().toISOString(),
      };
      Logger.log(`User heartbeat: ${email} on page ${data.page}`);
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
    const errMsg = err.toString();
    Logger.log(`doPost ERROR: ${errMsg}`);
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

    Logger.log(`writePartsRequest: Sheet="${SHEET}", Order="${data.orderNumber}"`);

    if (!sheet) {
      Logger.log(`writePartsRequest: Sheet "${SHEET}" not found, creating new sheet`);
      sheet = ss.insertSheet(SHEET);
      sheet.appendRow(['Order Number','Part Number','Part Description','Model','Serial Number','AWB','Request Date','Dispatch Date','Receiving Date','Final Status','Branch','Qty','Notes','Requested By','ASC']);
      sheet.getRange(1,1,1,15).setFontWeight('bold');
      sheet.setFrozenRows(1);
      Logger.log(`writePartsRequest: Created new sheet with headers`);
    }

    // Check if order already exists — update AWB / status / dates if so
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const orderCol = sheet.getRange(2,1,lastRow-1,1).getValues().flat();
      const existIdx = orderCol.findIndex(v => String(v).trim() === String(data.orderNumber||'').trim());
      if (existIdx >= 0) {
        const row = existIdx + 2;
        Logger.log(`writePartsRequest: Order exists at row ${row}, updating AWB/status/dates`);
        if (data.awb) sheet.getRange(row, 6).setValue(data.awb);
        if (data.dispatchDate) sheet.getRange(row, 8).setValue(data.dispatchDate);
        if (data.receivingDate) sheet.getRange(row, 9).setValue(data.receivingDate);
        if (data.finalStatus) sheet.getRange(row, 10).setValue(data.finalStatus);

        // Sync to Daily Operations if status changed
        syncPartStatusToDailyOps(data.orderNumber, data.finalStatus);

        // Send email notification for status update
        sendPartsStatusUpdateEmail(data);
        return;
      }
    }

    // New request
    Logger.log(`writePartsRequest: Adding new row for order ${data.orderNumber}`);
    sheet.appendRow([
      data.orderNumber  || '—',
      data.partNumber   || '—',
      data.partDesc     || '—',
      data.model        || '—',
      data.serialNumber || '',
      data.awb          || '',
      data.requestDate  || new Date().toLocaleDateString('en-GB'),
      data.dispatchDate || '',
      data.receivingDate || '',
      data.finalStatus  || 'Pending',
      data.branch       || '—',
      data.qty          || '1',
      data.notes        || '',
      data.requestedBy  || '—',
      data.asc          || '—',
    ]);
    Logger.log(`writePartsRequest: Successfully added row to sheet`);

    // Send email notification for parts request
    sendPartsRequestEmail(data);
  } catch(err) {
    const errMsg = err.toString();
    Logger.log(`writePartsRequest ERROR: ${errMsg}`);
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
      Logger.log(`logToSheet: Created ActiveUsers sheet`);
    }

    const action = data.action === 'logout'   ? 'Logout'
                 : data.action === 'heartbeat' ? 'Active'
                 : data.action === 'parts_request' ? 'PartsRequest'
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
    Logger.log(`logToSheet ERROR: ${err.toString()}`);
  }
}

// ── Sync part status back to daily operations ────────────────
function syncPartStatusToDailyOps(orderNumber, finalStatus) {
  try {
    if (!orderNumber || !finalStatus) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Sheet1');
    if (!sheet) {
      Logger.log(`syncPartStatusToDailyOps: Sheet1 not found`);
      return;
    }

    const dataRange = sheet.getDataRange().getValues();

    // Find "Parts" column (used to track part status in Daily Operations)
    let partsCol = -1;
    for (let c = 0; c < dataRange[0].length; c++) {
      const header = String(dataRange[0][c] || '').toLowerCase();
      if (header.includes('parts') || header.includes('part')) {
        partsCol = c;
        break;
      }
    }

    if (partsCol === -1) {
      Logger.log(`syncPartStatusToDailyOps: Parts column not found`);
      return;
    }

    // Find Ticket Number column (usually first column, column A)
    const ticketCol = 0;

    // Find the row matching the order number and update status
    for (let i = 1; i < dataRange.length; i++) {
      const ticketNum = String(dataRange[i][ticketCol] || '').trim();
      if (ticketNum === String(orderNumber || '').trim()) {
        // Found matching row - update Parts column with status
        sheet.getRange(i + 1, partsCol + 1).setValue(finalStatus);
        Logger.log(`syncPartStatusToDailyOps: Updated order ${orderNumber} at row ${i+1} to status: ${finalStatus}`);
        return;
      }
    }

    Logger.log(`syncPartStatusToDailyOps: Order ${orderNumber} not found in Sheet1`);
  } catch(err) {
    Logger.log(`syncPartStatusToDailyOps ERROR: ${err.toString()}`);
  }
}

// ── Get email routing from Access sheet ──────────────────────────
function getEmailRouting(branch, asc, actionType) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const accessSheet = ss.getSheetByName('Access');
    if (!accessSheet) {
      Logger.log(`getEmailRouting: Access sheet not found`);
      return { to: [], cc: [], branchPic: '' };
    }

    const data = accessSheet.getDataRange().getValues();
    const headers = data[0];

    // Find column indices
    const branchCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('branch'));
    const emailCol = headers.findIndex(h => h && h.toString().toLowerCase() === 'email');
    const ascCol = headers.findIndex(h => h && h.toString().toLowerCase() === 'asc');
    const picCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('pic'));

    if (branchCol === -1 || emailCol === -1) {
      Logger.log(`getEmailRouting: Required columns not found`);
      return { to: [], cc: [], branchPic: '' };
    }

    let toEmails = [];
    let ccEmails = [];
    let branchPic = '';
    let ascName = '';

    // First pass: Get TO emails and extract ASC name for the specific branch
    for (let i = 1; i < data.length; i++) {
      const rowBranch = String(data[i][branchCol] || '').trim();
      const email = String(data[i][emailCol] || '').trim();
      const asc = String(data[i][ascCol] || '').trim();
      const pic = picCol >= 0 ? String(data[i][picCol] || '').trim() : '';

      // Match the specific branch (e.g., "Dammam - wiFEX")
      if (rowBranch.toLowerCase() === branch.toLowerCase()) {
        if (email) toEmails.push(email);
        if (asc) ascName = asc;
        if (pic) branchPic = pic;
      }
    }

    // Second pass: Get CC emails (ASC CC group + Always CC group)
    for (let i = 1; i < data.length; i++) {
      const rowBranch = String(data[i][branchCol] || '').trim();
      const email = String(data[i][emailCol] || '').trim();

      if (email && !toEmails.includes(email)) {
        // Check for ASC CC group (e.g., "wiFEX CC", "ZAM CC")
        if (ascName && rowBranch.toLowerCase() === (ascName + ' CC').toLowerCase()) {
          ccEmails.push(email);
        }
        // Check for Always CC group
        else if (rowBranch.toLowerCase() === 'always cc') {
          ccEmails.push(email);
        }
      }
    }

    Logger.log(`getEmailRouting: branch=${branch}, asc=${ascName}, to=${toEmails.join(',')}, cc=${ccEmails.join(',')}`);

    return {
      to: toEmails,
      cc: ccEmails,
      ascName: ascName,
      branchPic: branchPic
    };
  } catch(err) {
    Logger.log(`getEmailRouting ERROR: ${err.toString()}`);
    return { to: [], cc: [], branchPic: '' };
  }
}

// ── Send email for parts request ─────────────────────────────────
function sendPartsRequestEmail(data) {
  try {
    const routing = getEmailRouting(data.branch, data.asc, 'parts_request');

    // Logic: If part request from Daily Operations
    // TO: Arslan + ASC CC + Always CC (as recipients)
    // CC: rest of ASC CC + Always CC

    const to = ['arslan.s@auxair.com'];
    const cc = routing.cc || [];

    Logger.log(`sendPartsRequestEmail: TO=${to.join(',')}, CC=${cc.join(',')}`);

    const subject = `Parts Request — ${data.orderNumber} — ${data.branch}`;
    const body = `Dear Parts Team,

New spare part request:

Order Number : ${data.orderNumber}
Branch       : ${data.branch}
ASC          : ${routing.ascName || '—'}
Part Name    : ${data.partDesc}
Part Number  : ${data.partNumber}
Quantity     : ${data.qty}
Model        : ${data.model || '—'}
Serial Number: ${data.serialNumber || '—'}
Notes        : ${data.notes || '—'}
Requested By : ${data.requestedBy || 'AUX ASC Dashboard'}
Date         : ${data.requestDate}

Please process and update AWB in the Parts sheet.

AUX ASC Dashboard — Created by Moahed Younes`;

    // Send email using GmailApp
    if (to.length > 0) {
      GmailApp.sendEmail(to.join(','), subject, body, {
        cc: cc.length > 0 ? cc.join(',') : null,
        replyTo: 'arslan.s@auxair.com'
      });
      Logger.log(`sendPartsRequestEmail: Email sent successfully`);
    }
  } catch(err) {
    Logger.log(`sendPartsRequestEmail ERROR: ${err.toString()}`);
  }
}

// ── Send email for part status update ────────────────────────────
function sendPartsStatusUpdateEmail(data) {
  try {
    const routing = getEmailRouting(data.branch, data.asc, 'parts_status');

    // TO: Branch PIC, CC: ASC CC + Always CC
    const to = routing.branchPic ? [routing.branchPic] : routing.to || [];
    const cc = routing.cc || [];

    Logger.log(`sendPartsStatusUpdateEmail: TO=${to.join(',')}, CC=${cc.join(',')}`);

    const statusMap = {
      'Dispatched': '📦 Dispatched',
      'Received': '✅ Received',
      'Part Not Available': '❌ Part Not Available',
      'Pending': '⏳ Pending'
    };

    const statusLabel = statusMap[data.finalStatus] || data.finalStatus;
    const subject = `Parts Status Update — ${data.orderNumber} — ${statusLabel}`;

    const body = `Dear Branch Team,

Parts request status update:

Order Number : ${data.orderNumber}
Branch       : ${data.branch}
ASC          : ${routing.ascName || '—'}
Status       : ${statusLabel}
Part Name    : ${data.partDesc || '—'}
Part Number  : ${data.partNumber || '—'}
Quantity     : ${data.qty || '—'}
AWB/Tracking : ${data.awb || '—'}
${data.dispatchDate ? `Dispatch Date: ${data.dispatchDate}\n` : ''}${data.receivingDate ? `Receiving Date: ${data.receivingDate}\n` : ''}
Updated By   : ${data.requestedBy || 'AUX ASC Dashboard'}
Date         : ${new Date().toLocaleDateString('en-GB')}

${data.finalStatus === 'Dispatched' ? 'Parts have been dispatched. Please track using the AWB provided above.' : ''}${data.finalStatus === 'Received' ? 'Parts have been received at the branch.' : ''}${data.finalStatus === 'Part Not Available' ? 'This part is not available. Please contact the parts supervisor for alternatives.' : ''}

AUX ASC Dashboard — Created by Moahed Younes`;

    // Send email using GmailApp
    if (to.length > 0) {
      GmailApp.sendEmail(to.join(','), subject, body, {
        cc: cc.length > 0 ? cc.join(',') : null,
        replyTo: 'arslan.s@auxair.com'
      });
      Logger.log(`sendPartsStatusUpdateEmail: Email sent successfully`);
    } else {
      Logger.log(`sendPartsStatusUpdateEmail: No TO recipients found`);
    }
  } catch(err) {
    Logger.log(`sendPartsStatusUpdateEmail ERROR: ${err.toString()}`);
  }
}

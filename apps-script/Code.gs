/**
 * Accounts Manager — Google Sheets bridge (one copy per seller).
 *
 * SETUP
 *  1. Open your Google Sheet → Extensions → Apps Script.
 *  2. Replace everything in Code.gs with this file and click Save.
 *  3. Deploy → New deployment → type "Web app".
 *       Execute as:      Me
 *       Who has access:  Anyone
 *  4. Authorize, then copy the Web app URL (ends with /exec) into the app.
 *
 * After editing this script later, use Deploy → Manage deployments → Edit →
 * Version "New version" so the same URL keeps working.
 *
 * The URL is the only key to your data — do not share it.
 */

const CONFIG_SHEET = '_Config';
const ID_COL = '_id';
const CREATED_COL = '_createdAt';
const MAX_CELL_CHARS = 49000; // Sheets hard limit is 50,000 per cell
const BRIDGE_VERSION = 1;

function doGet() {
  return json_({ ok: true, data: { app: 'accounts-manager', version: BRIDGE_VERSION } });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Invalid request body' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    return json_({ ok: true, data: route_(req) });
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

function route_(req) {
  switch (req.action) {
    case 'ping':
      var ss = SpreadsheetApp.getActive();
      return { name: ss.getName(), timeZone: ss.getSpreadsheetTimeZone(), version: BRIDGE_VERSION };
    case 'getConfig':
      return getConfig_();
    case 'setConfig':
      return setConfig_(req.key, req.value);
    case 'deleteConfig':
      return deleteConfig_(req.key);
    case 'headers':
      return headers_(req.sheet);
    case 'list':
      return list_(req.sheet);
    case 'append':
      return append_(req.sheet, req.record);
    case 'appendMany':
      return (req.records || []).map(function (r) { return append_(req.sheet, r); });
    case 'update':
      return update_(req.sheet, req.id, req.record);
    case 'remove':
      return remove_(req.sheet, req.id);
    default:
      throw new Error('Unknown action: ' + req.action);
  }
}

/* ---------------- config (key / JSON value rows) ---------------- */

function configSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(CONFIG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(CONFIG_SHEET);
    sh.getRange(1, 1, 1, 2).setValues([['key', 'value']]).setFontWeight('bold');
    sh.getRange('A:B').setNumberFormat('@');
    sh.setFrozenRows(1);
  }
  return sh;
}

function getConfig_() {
  var values = configSheet_().getDataRange().getValues();
  var out = {};
  for (var i = 1; i < values.length; i++) {
    var key = values[i][0];
    if (!key) continue;
    try {
      out[key] = JSON.parse(values[i][1]);
    } catch (err) {
      out[key] = values[i][1];
    }
  }
  return out;
}

function setConfig_(key, value) {
  if (!key) throw new Error('Config key required');
  var text = JSON.stringify(value);
  if (text.length > MAX_CELL_CHARS) throw new Error('Value for "' + key + '" is too large for one cell');
  var sh = configSheet_();
  var row = findRow_(sh, 1, key);
  if (row) sh.getRange(row, 2).setValue(text);
  else sh.appendRow([key, text]);
  return true;
}

function deleteConfig_(key) {
  var sh = configSheet_();
  var row = findRow_(sh, 1, key);
  if (row) sh.deleteRow(row);
  return true;
}

/* ---------------- data sheets (header row = column names) ---------------- */

function dataSheet_(name, create) {
  if (!name || name === CONFIG_SHEET) throw new Error('Invalid sheet name');
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(name);
  if (!sh && create) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, 2).setValues([[ID_COL, CREATED_COL]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function headerRow_(sh) {
  if (sh.getLastColumn() === 0) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

/** Adds any missing columns to the header row and returns the full header. */
function ensureHeaders_(sh, keys) {
  var header = headerRow_(sh);
  [ID_COL, CREATED_COL].concat(keys).forEach(function (k) {
    if (k && header.indexOf(k) === -1) {
      header.push(k);
      sh.getRange(1, header.length).setValue(k).setFontWeight('bold');
    }
  });
  return header;
}

function headers_(name) {
  var sh = dataSheet_(name, false);
  return sh ? headerRow_(sh).filter(function (h) { return h && h.charAt(0) !== '_'; }) : [];
}

function list_(name) {
  var sh = dataSheet_(name, false);
  if (!sh || sh.getLastRow() < 2) return [];
  var header = ensureHeaders_(sh, []);
  var range = sh.getRange(1, 1, sh.getLastRow(), header.length);
  var values = range.getValues();
  var idIdx = header.indexOf(ID_COL);
  var tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  var out = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (row.every(function (v) { return v === '' || v === null; })) continue;
    // Rows typed in by hand have no id yet — give them one so they can be edited from the app.
    if (!row[idIdx]) {
      row[idIdx] = Utilities.getUuid();
      sh.getRange(r + 1, idIdx + 1).setValue(row[idIdx]);
    }
    var obj = {};
    for (var c = 0; c < header.length; c++) {
      if (header[c]) obj[header[c]] = cellOut_(row[c], tz, header[c]);
    }
    out.push(obj);
  }
  return out;
}

function append_(name, record) {
  var sh = dataSheet_(name, true);
  var header = ensureHeaders_(sh, Object.keys(record || {}));
  var rec = Object.assign({}, record);
  rec[ID_COL] = rec[ID_COL] || Utilities.getUuid();
  rec[CREATED_COL] = new Date().toISOString();
  sh.appendRow(header.map(function (h) { return cellIn_(rec[h]); }));
  return rec;
}

function update_(name, id, record) {
  var sh = dataSheet_(name, false);
  if (!sh) throw new Error('Sheet not found: ' + name);
  var header = ensureHeaders_(sh, Object.keys(record || {}));
  var row = findRow_(sh, header.indexOf(ID_COL) + 1, id);
  if (!row) throw new Error('Record not found — it may have been deleted in the Sheet');
  var range = sh.getRange(row, 1, 1, header.length);
  var current = range.getValues()[0];
  header.forEach(function (h, i) {
    if (h !== ID_COL && h !== CREATED_COL && Object.prototype.hasOwnProperty.call(record, h)) {
      current[i] = cellIn_(record[h]);
    }
  });
  range.setValues([current]);
  return true;
}

function remove_(name, id) {
  var sh = dataSheet_(name, false);
  if (!sh) return true;
  var row = findRow_(sh, headerRow_(sh).indexOf(ID_COL) + 1, id);
  if (row) sh.deleteRow(row);
  return true;
}

/* ---------------- helpers ---------------- */

function findRow_(sh, col, value) {
  if (col < 1 || sh.getLastRow() < 2) return 0;
  var values = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(value)) return i + 2;
  }
  return 0;
}

/** Keeps phone numbers / PINs with a leading 0 or + as text instead of numbers. */
function cellIn_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && /^[+0]\d+$/.test(v)) return "'" + v;
  return v;
}

function cellOut_(v, tz, header) {
  if (v instanceof Date) {
    return header === CREATED_COL
      ? v.toISOString()
      : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  return v === null || v === undefined ? '' : String(v);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

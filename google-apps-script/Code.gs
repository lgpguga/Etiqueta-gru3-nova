/**
 * Etiqueta GRU3 + CDL GRU3 — Google Apps Script unificado
 * Planilha: https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/edit
 *
 * APOS COLAR: Salve > Implantar > Gerencie implantações > Editar > Nova versão > Implantar
 *
 * === GET (doGet) ===
 *   getIataList      → etiqueta-gru3 ANTIGO   [{ iata, hubVinculado }]
 *   getNovaBase      → etiqueta-gru3-nova     [{ grid, hubVinculado, iatas }]
 *   getCdlGru3IataList → Etiqueta CDL GRU3    [{ iata, grid, hubVinculado }]
 *   (sem action)     → igual a getIataList
 *
 * === POST (doPost) ===
 *   gerarLoteCdlGru3 → CDL GRU3 (serial prefixo D)
 *     params: mac, iata, quantity
 *     → { serials, computador, grid }
 */

var PLANILHA_URL = 'https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/edit';
var ABA_IATA = 'IATA';
var ABA_NOVA = 'Nova Base de Dados';
var ABA_COMPUTADORES = 'COMPUTADORES';
var ABA_GERADOS = 'GERADOS';
var CDL_GRU3_PREFIX = 'D';

function doGet(e) {
  var action = '';
  try {
    if (e && e.parameter && e.parameter.action) {
      action = String(e.parameter.action).trim();
    }
  } catch (ignore) {}

  if (action === 'getNovaBase') {
    return jsonOutput(getNovaBaseList());
  }
  if (action === 'getCdlGru3IataList') {
    return jsonOutput(getCdlGru3IataList());
  }
  return jsonOutput(getIataList());
}

function doPost(e) {
  var params = {};
  try {
    if (e && e.parameter) {
      params = e.parameter;
    }
  } catch (ignore) {}
  // Alguns ambientes enviam o body JSON
  try {
    if (e && e.postData && e.postData.contents) {
      var raw = String(e.postData.contents);
      if (raw.charAt(0) === '{') {
        var parsed = JSON.parse(raw);
        for (var k in parsed) {
          if (parsed.hasOwnProperty(k) && (params[k] == null || params[k] === '')) {
            params[k] = parsed[k];
          }
        }
      }
    }
  } catch (ignore2) {}

  var action = params.action || '';
  if (action === 'gerarLoteCdlGru3' || action === 'gerarLote') {
    return jsonOutput(gerarLoteCdlGru3(params));
  }
  return jsonOutput({ status: 'error', message: 'Ação não reconhecida: ' + action });
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function openSpreadsheet() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    ss = null;
  }
  if (!ss) {
    try {
      ss = SpreadsheetApp.openByUrl(PLANILHA_URL);
    } catch (e2) {
      return null;
    }
  }
  return ss;
}

function ensureCdlSheets(ss) {
  var sheetComp = ss.getSheetByName(ABA_COMPUTADORES);
  if (!sheetComp) {
    sheetComp = ss.insertSheet(ABA_COMPUTADORES);
    sheetComp.getRange(1, 1, 1, 2).setValues([['CODE', 'MAC']]);
  } else if (sheetComp.getLastRow() < 1) {
    sheetComp.getRange(1, 1, 1, 2).setValues([['CODE', 'MAC']]);
  }
  var sheetGer = ss.getSheetByName(ABA_GERADOS);
  if (!sheetGer) {
    sheetGer = ss.insertSheet(ABA_GERADOS);
    sheetGer.getRange(1, 1, 1, 5).setValues([['SERIAL', 'IATA', 'COMPUTADOR', 'DATA', 'GRID']]);
  } else {
    // Garante cabeçalho da coluna E = GRID
    var headerE = String(sheetGer.getRange(1, 5).getValue() || '').trim().toUpperCase();
    if (headerE !== 'GRID') {
      sheetGer.getRange(1, 5).setValue('GRID');
    }
    if (sheetGer.getLastRow() < 1) {
      sheetGer.getRange(1, 1, 1, 5).setValues([['SERIAL', 'IATA', 'COMPUTADOR', 'DATA', 'GRID']]);
    }
  }
  return { computadores: sheetComp, gerados: sheetGer };
}

/* ========== etiqueta-gru3 ANTIGO ========== */

function getIataList() {
  var ss = openSpreadsheet();
  if (!ss) {
    return {
      status: 'error',
      message: 'Sem acesso à planilha. Crie o script em Extensões > Apps Script na planilha e use a mesma conta Google para implantar.'
    };
  }
  try {
    var sheetIata = ss.getSheetByName(ABA_IATA);
    if (sheetIata) {
      var fromIata = readAbaIataLegacy(sheetIata);
      if (fromIata.length > 0) {
        return { status: 'success', data: fromIata, versao: 'gru3-2026-tri-iata', fonte: ABA_IATA };
      }
    }
    var sheetNova = ss.getSheetByName(ABA_NOVA);
    if (sheetNova) {
      var fromNova = flattenIatasFromNovaBase(sheetNova, false);
      return { status: 'success', data: fromNova, versao: 'gru3-2026-tri-iata', fonte: ABA_NOVA };
    }
    return { status: 'error', message: 'Nenhuma aba "IATA" ou "Nova Base de Dados" encontrada' };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/* ========== etiqueta-gru3-nova ========== */

function getNovaBaseList() {
  var ss = openSpreadsheet();
  if (!ss) {
    return {
      status: 'error',
      message: 'Sem acesso à planilha. Crie o script em Extensões > Apps Script na planilha e use a mesma conta Google para implantar.'
    };
  }
  try {
    var sheet = ss.getSheetByName(ABA_NOVA);
    if (!sheet) {
      return { status: 'error', message: 'Aba "' + ABA_NOVA + '" não encontrada' };
    }
    var parsed = parseNovaBaseSheet(sheet);
    return { status: 'success', data: parsed.rows, versao: 'gru3-2026-tri-nova', fonte: ABA_NOVA };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/* ========== Etiqueta CDL GRU3 ========== */

function getCdlGru3IataList() {
  var ss = openSpreadsheet();
  if (!ss) {
    return {
      status: 'error',
      message: 'Sem acesso à planilha.'
    };
  }
  try {
    var sheetNova = ss.getSheetByName(ABA_NOVA);
    if (!sheetNova) {
      return { status: 'error', message: 'Aba "' + ABA_NOVA + '" não encontrada' };
    }
    // Lista por GRID (uma linha = um GRID)
    var parsed = parseNovaBaseSheet(sheetNova);
    return {
      status: 'success',
      data: parsed.rows,
      versao: 'gru3-2026-tri-cdl-grid',
      fonte: ABA_NOVA
    };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

function lookupRowByGrid(ss, gridCode) {
  var sheetNova = ss.getSheetByName(ABA_NOVA);
  if (!sheetNova) return null;
  var parsed = parseNovaBaseSheet(sheetNova);
  var key = String(gridCode || '').trim().toUpperCase();
  for (var i = 0; i < parsed.rows.length; i++) {
    if (String(parsed.rows[i].grid).trim().toUpperCase() === key) {
      return parsed.rows[i];
    }
  }
  return null;
}

function lookupGridForIata(ss, iataCode) {
  var sheetNova = ss.getSheetByName(ABA_NOVA);
  if (!sheetNova) return '';
  var list = flattenIatasFromNovaBase(sheetNova, true);
  var key = String(iataCode || '').trim().toUpperCase();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].iata).trim().toUpperCase() === key) {
      return list[i].grid || '';
    }
  }
  return '';
}

function getOrRegisterComputerCdl(ss, mac) {
  ensureCdlSheets(ss);
  var sheet = ss.getSheetByName(ABA_COMPUTADORES);
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var macCol = sheet.getRange(2, 2, lastRow, 2).getValues();
    for (var i = 0; i < macCol.length; i++) {
      if (String(macCol[i][0]).trim() === String(mac).trim()) {
        var code = sheet.getRange(i + 2, 1).getValue();
        return { status: 'success', code: Number(code) };
      }
    }
  }
  var nextCode = 1;
  if (lastRow >= 2) {
    var codes = sheet.getRange(2, 1, lastRow, 1).getValues();
    for (var j = 0; j < codes.length; j++) {
      var c = Number(codes[j][0]);
      if (!isNaN(c) && c >= nextCode) nextCode = c + 1;
    }
  }
  sheet.appendRow([nextCode, String(mac).trim()]);
  return { status: 'success', code: nextCode };
}

function getMaxSerialSeqCdl(ss, computadorCode) {
  var sheet = ss.getSheetByName(ABA_GERADOS);
  if (!sheet) return 0;
  var prefix = CDL_GRU3_PREFIX + String(Number(computadorCode));
  var lastRow = sheet.getLastRow();
  var maxSeq = 0;
  if (lastRow >= 2) {
    var serials = sheet.getRange(2, 1, lastRow, 1).getValues();
    for (var i = 0; i < serials.length; i++) {
      var s = String(serials[i][0]).trim();
      if (s.indexOf(prefix) === 0) {
        var num = parseInt(s.substring(prefix.length), 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    }
  }
  return maxSeq;
}

function formatSerialCdl(computadorCode, seq) {
  var prefix = CDL_GRU3_PREFIX + String(Number(computadorCode));
  var tailLen = 8 - prefix.length;
  var pad = '';
  for (var p = 0; p < tailLen; p++) pad += '0';
  return prefix + (pad + seq).slice(-tailLen);
}

function gerarLoteCdlGru3(params) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    return { status: 'error', message: 'Sistema ocupado. Tente novamente em alguns segundos.' };
  }
  try {
    var ss = openSpreadsheet();
    if (!ss) {
      return { status: 'error', message: 'Sem acesso à planilha' };
    }
    ensureCdlSheets(ss);
    var mac = params.mac || '';
    var gridParam = String(params.grid || '').trim();
    var iataParam = String(params.iata || '').trim();
    var quantity = parseInt(params.quantity, 10) || 1;
    if (!mac || (!gridParam && !iataParam)) {
      return { status: 'error', message: 'mac e grid (ou iata) são obrigatórios' };
    }
    quantity = Math.min(100, Math.max(1, quantity));
    var computerResult = getOrRegisterComputerCdl(ss, mac);
    if (computerResult.status !== 'success') {
      return computerResult;
    }
    var code = computerResult.code;
    var sheetGerados = ss.getSheetByName(ABA_GERADOS);
    var maxSeq = getMaxSerialSeqCdl(ss, code);
    var dataStr = new Date().toLocaleString('pt-BR');

    var grid = gridParam;
    var hub = '';
    if (grid) {
      var rowByGrid = lookupRowByGrid(ss, grid);
      if (rowByGrid) {
        hub = rowByGrid.hubVinculado || '';
      }
    } else {
      grid = lookupGridForIata(ss, iataParam);
      var row2 = grid ? lookupRowByGrid(ss, grid) : null;
      hub = row2 ? (row2.hubVinculado || '') : '';
    }
    // Coluna B (IATA) = HUB vinculado; coluna E (GRID) = GRID impresso
    var iataColVal = hub || iataParam || '';
    var gridColVal = grid || '';

    var serials = [];
    var rows = [];
    for (var q = 1; q <= quantity; q++) {
      var seq = maxSeq + q;
      var serial = formatSerialCdl(code, seq);
      serials.push(serial);
      rows.push([serial, String(iataColVal), Number(code), dataStr, String(gridColVal)]);
    }
    if (rows.length > 0) {
      var startRow = sheetGerados.getLastRow() + 1;
      sheetGerados.getRange(startRow, 1, rows.length, 5).setValues(rows);
    }
    return {
      status: 'success',
      serials: serials,
      computador: code,
      grid: grid,
      hubVinculado: hub
    };
  } catch (err) {
    return { status: 'error', message: String(err) };
  } finally {
    lock.releaseLock();
  }
}

/* ========== helpers compartilhados ========== */

function readAbaIataLegacy(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var row0 = values[0];
  var iataCol = -1;
  var hubCol = -1;
  for (var c = 0; c < row0.length; c++) {
    var h = String(row0[c] || '').trim().toUpperCase();
    if (h === 'IATA') iataCol = c;
    if (h === 'HUB VINCULADO') hubCol = c;
  }
  var startRow = 0;
  if (iataCol >= 0 || hubCol >= 0) startRow = 1;
  if (iataCol < 0) iataCol = 0;
  if (hubCol < 0) hubCol = lastCol >= 2 ? 1 : -1;
  if (startRow === 0 && String(values[0][iataCol]).trim().toUpperCase() === 'IATA') {
    startRow = 1;
  }
  var list = [];
  for (var r = startRow; r < values.length; r++) {
    var cell = values[r][iataCol];
    if (!cell || !String(cell).trim()) continue;
    var iataVal = String(cell).trim();
    if (iataVal.toUpperCase() === 'IATA') continue;
    var hubVal = '';
    if (hubCol >= 0 && hubCol < values[r].length) {
      var hubCell = values[r][hubCol];
      if (hubCell != null && String(hubCell).trim()) {
        hubVal = String(hubCell).trim();
      }
    }
    list.push({ iata: iataVal, hubVinculado: hubVal });
  }
  return list;
}

/**
 * @param {boolean} includeGrid — se true, inclui campo grid (CDL GRU3)
 */
function flattenIatasFromNovaBase(sheet, includeGrid) {
  var parsed = parseNovaBaseSheet(sheet);
  var seen = {};
  var list = [];
  for (var i = 0; i < parsed.rows.length; i++) {
    var row = parsed.rows[i];
    var hub = row.hubVinculado || '';
    var grid = row.grid || '';
    for (var j = 0; j < row.iatas.length; j++) {
      var code = row.iatas[j];
      if (!code) continue;
      var parts = String(code).split(/[\n\r]+/);
      for (var p = 0; p < parts.length; p++) {
        var one = parts[p].trim();
        if (!one) continue;
        var key = one.toUpperCase();
        if (seen[key]) continue;
        seen[key] = true;
        if (includeGrid) {
          list.push({ iata: one, hubVinculado: hub, grid: grid });
        } else {
          list.push({ iata: one, hubVinculado: hub });
        }
      }
    }
  }
  return list;
}

function parseNovaBaseSheet(sheet) {
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var values = sheet.getRange(1, 1, lastRow, 18).getValues();
  var row0 = values[0];
  var hubCol = 1;
  var gridCol = 0;
  var iataStart = 2;
  var iataEnd = 17;
  for (var c = 0; c < row0.length; c++) {
    var h = String(row0[c] || '').trim().toUpperCase();
    if (h === 'GRID') gridCol = c;
    if (h === 'HUB VINCULADO') hubCol = c;
    if (h === 'IATA 1') iataStart = c;
    if (h.indexOf('IATA ') === 0) iataEnd = c;
  }
  var rows = [];
  for (var r = 1; r < values.length; r++) {
    var gridVal = '';
    if (values[r][gridCol] != null && String(values[r][gridCol]).trim()) {
      gridVal = String(values[r][gridCol]).trim();
    }
    if (!gridVal) continue;
    var hubVal = '';
    if (values[r][hubCol] != null && String(values[r][hubCol]).trim()) {
      hubVal = String(values[r][hubCol]).trim();
    }
    var iatas = [];
    for (var ic = iataStart; ic <= iataEnd; ic++) {
      if (ic >= values[r].length) {
        iatas.push('');
        continue;
      }
      var cell = values[r][ic];
      iatas.push(cell != null && String(cell).trim() ? String(cell).trim() : '');
    }
    rows.push({
      grid: gridVal,
      hubVinculado: hubVal,
      iatas: iatas
    });
  }
  return { rows: rows };
}

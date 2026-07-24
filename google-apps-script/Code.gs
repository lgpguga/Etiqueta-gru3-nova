/**
 * Etiqueta GRU3 — Google Apps Script (compatível com as DUAS versões)
 *
 * APOS COLAR: Salve > Implantar > Gerencie implantações > Editar > Nova versão > Implantar
 *
 * Ações (query ?action=):
 *   getIataList  → programa ANTIGO (aba "IATA" ou fallback pela Nova Base)
 *                  data: [{ iata, hubVinculado }, ...]
 *   getNovaBase  → programa NOVO (aba "Nova Base de Dados")
 *                  data: [{ grid, hubVinculado, iatas: string[16] }, ...]
 *
 * Sem action: comporta-se como getIataList (retrocompatível).
 */

var PLANILHA_URL = 'https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/edit';
var ABA_IATA = 'IATA';
var ABA_NOVA = 'Nova Base de Dados';

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
  // getIataList (default) — programa antigo
  return jsonOutput(getIataList());
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

/**
 * PROGRAMA ANTIGO
 * Preferência: aba "IATA" (coluna IATA + HUB VINCULADO).
 * Fallback: deriva códigos únicos das colunas IATA 1–16 da "Nova Base de Dados".
 */
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
        return { status: 'success', data: fromIata, versao: 'gru3-2026-dual-iata', fonte: ABA_IATA };
      }
    }
    var sheetNova = ss.getSheetByName(ABA_NOVA);
    if (sheetNova) {
      var fromNova = flattenIatasFromNovaBase(sheetNova);
      return { status: 'success', data: fromNova, versao: 'gru3-2026-dual-iata', fonte: ABA_NOVA };
    }
    return { status: 'error', message: 'Nenhuma aba "IATA" ou "Nova Base de Dados" encontrada' };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/**
 * PROGRAMA NOVO — aba Nova Base de Dados
 */
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
    return { status: 'success', data: parsed.rows, versao: 'gru3-2026-dual-nova', fonte: ABA_NOVA };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

/** Lê aba clássica IATA: { iata, hubVinculado } */
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
 * A partir da Nova Base: lista plana para o programa antigo
 * (cada célula preenchida em IATA 1–16 vira um item { iata, hubVinculado }).
 */
function flattenIatasFromNovaBase(sheet) {
  var parsed = parseNovaBaseSheet(sheet);
  var seen = {};
  var list = [];
  for (var i = 0; i < parsed.rows.length; i++) {
    var row = parsed.rows[i];
    var hub = row.hubVinculado || '';
    for (var j = 0; j < row.iatas.length; j++) {
      var code = row.iatas[j];
      if (!code) continue;
      // Células com várias linhas → um código por linha
      var parts = String(code).split(/[\n\r]+/);
      for (var p = 0; p < parts.length; p++) {
        var one = parts[p].trim();
        if (!one) continue;
        var key = one.toUpperCase();
        if (seen[key]) continue;
        seen[key] = true;
        list.push({ iata: one, hubVinculado: hub });
      }
    }
  }
  return list;
}

/** Parse da aba Nova Base de Dados → { rows: [{ grid, hubVinculado, iatas }] } */
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

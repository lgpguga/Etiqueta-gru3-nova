/**
 * Etiqueta GRU3 (SP-RR-002) - Google Apps Script
 * Crie em Extensões > Apps Script NA planilha Base Etiquetas GRU3
 *
 * APOS COLAR: Salve > Implantar > Gerencie implantações > Editar > Nova versão > Implantar
 *
 * Aba: "Nova Base de Dados"
 * Colunas A–R: GRID | HUB VINCULADO | IATA 1 … IATA 16
 */

var PLANILHA_URL = 'https://docs.google.com/spreadsheets/d/1-K5l5D0K3MhRto6dHfaVEvkXP-WFOalkgNjSSRQ2kE4/edit';
var ABA_NOME = 'Nova Base de Dados';

function doGet(e) {
  return jsonOutput(getIataList());
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Retorna linhas da aba Nova Base de Dados:
 * { grid, hubVinculado, iatas: string[] }
 */
function getIataList() {
  var ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    try {
      ss = SpreadsheetApp.openByUrl(PLANILHA_URL);
    } catch (e2) {
      return { status: 'error', message: 'Sem acesso à planilha. Crie o script em Extensões > Apps Script na planilha e use a mesma conta Google para implantar.' };
    }
  }
  try {
    if (!ss) {
      ss = SpreadsheetApp.openByUrl(PLANILHA_URL);
    }
    var sheet = ss.getSheetByName(ABA_NOME);
    if (!sheet) {
      return { status: 'error', message: 'Aba "' + ABA_NOME + '" não encontrada' };
    }
    var lastRow = Math.max(sheet.getLastRow(), 1);
    // A–R = 18 colunas
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
    var list = [];
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
      // Colunas C–R (IATA 1…16) na ordem; inclui vazios para preservar a sequência
      var iatas = [];
      for (var ic = iataStart; ic <= iataEnd; ic++) {
        if (ic >= values[r].length) {
          iatas.push('');
          continue;
        }
        var cell = values[r][ic];
        iatas.push(cell != null && String(cell).trim() ? String(cell).trim() : '');
      }
      list.push({
        grid: gridVal,
        hubVinculado: hubVal,
        iatas: iatas
      });
    }
    return { status: 'success', data: list, versao: 'gru3-2026-nova-base' };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

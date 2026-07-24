"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type HubRow = {
  grid: string;
  hubVinculado: string;
  /** Valores das colunas C–R (IATA 1…16), na ordem; vazios omitidos na exibição */
  iatas: string[];
};

function normalizePayload(data: unknown): HubRow[] {
  if (!Array.isArray(data)) return [];
  const rows: HubRow[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const grid = String(o.grid ?? "").trim();
    if (!grid) continue;
    const hubVinculado = String(
      o.hubVinculado ?? o.hub_vinculado ?? ""
    ).trim();
    let iatas: string[] = [];
    if (Array.isArray(o.iatas)) {
      // Mantém a ordem C→R; só remove células vazias para a grade
      iatas = o.iatas
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
    }
    rows.push({ grid, hubVinculado, iatas });
  }
  return rows;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const T = {
  appTitle: "标签 GRU3 新版 — 网格 Etiqueta GRU3 Nova — GRID",
  appSubtitle:
    "安骏快递 — 新数据库（网格 / 枢纽 / 机场代码） Anjun Express — Nova Base de Dados (GRID / HUB / IATAs)",
  panelTitle: "标签控制 Controles da Etiqueta",
  gridSelectLabel: "网格 GRID",
  quantityLabel: "标签数量 Quantidade de etiquetas",
  loading: "加载中... Carregando...",
  noGrid: "表格中无网格 Nenhum GRID na planilha",
  configError: "请配置 Apps Script。请参阅 README。 Configure o Apps Script. Veja o README.",
  printZebra: "打印（热敏斑马） Imprimir (Zebra térmica)",
  printPdf: "打印PDF Imprimir em PDF",
  labelTitle: "运输标签 ETIQUETA DE TRANSPORTE GRU3",
  generateToPreview: "请选择网格以预览 Selecione um GRID para visualizar",
  errorSelectGrid: "请选择网格。 Selecione um GRID.",
  errorLoadIata: "无法加载列表。请检查 .env.local Não foi possível carregar a lista. Verifique .env.local",
  placeholder: "输入或选择网格 Digite ou selecione o GRID",
  hubLabel: "关联枢纽 HUB VINCULADO",
  gridLabel: "分拣滑槽 SAÍDA",
  iatasLabel: "派送点 PONTOS DE ENTREGA",
  loadMock: "使用示例数据 Usar dados de exemplo",
  loadReal: "重新加载表格 Recarregar planilha",
  mockHint:
    "正在使用示例数据。点击“重新加载表格”以使用真实数据。 Usando dados de exemplo. Clique em Recarregar planilha para a base real.",
  dataSource:
    "数据来源：标签基础 GRU3 — 工作表“新数据库”。按网格选择。 Dados: Base Etiquetas GRU3 — aba Nova Base de Dados. Seleção por GRID.",
};

function LabelHalfPreview({
  hub,
  grid,
  iatas,
  dataFormatada,
  mirrored,
}: {
  hub: string;
  grid: string;
  iatas: string[];
  dataFormatada: string;
  mirrored?: boolean;
}) {
  return (
    <div
      className={`flex-1 min-h-0 flex flex-col p-2 ${mirrored ? "rotate-180" : ""}`}
    >
      <div className="flex justify-start mb-0.5">
        <img
          src="/logo-anjun.png"
          alt={mirrored ? "" : "Anjun Express"}
          className="h-5 w-auto max-w-[50%] object-contain"
        />
      </div>
      <div className="text-center text-xs font-bold text-gray-700 mb-0.5">
        {T.labelTitle}
      </div>

      {/* GRID (menor) + HUB na mesma linha */}
      <div className="shrink-0 flex w-full gap-1 [-webkit-print-color-adjust:exact] [print-color-adjust:exact]">
        <div className="w-[28%] box-border border-2 border-black bg-white text-black px-1 py-1 text-center flex flex-col justify-center">
          <div className="text-[8px] font-bold leading-tight">{T.gridLabel}</div>
          <div className="text-3xl font-bold leading-tight mt-0.5 tracking-wide break-all">
            {grid || "—"}
          </div>
        </div>
        <div className="flex-1 box-border bg-black text-white px-2 py-1 text-center flex flex-col justify-center">
          <div className="text-[9px] font-bold leading-tight opacity-90">
            {T.hubLabel}
          </div>
          <div className="text-3xl font-bold leading-tight mt-0.5 tracking-wide break-all">
            {hub || "—"}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-1 flex flex-col">
        <div className="text-[8px] font-bold text-gray-600 mb-0.5 text-center leading-none shrink-0">
          {T.iatasLabel}
        </div>
        <div className="grid grid-cols-4 gap-0.5 flex-1 min-h-0 content-stretch auto-rows-fr">
          {(iatas.length ? iatas : ["—"]).map((code, i) => (
            <div
              key={`${code}-${i}`}
              className="border border-black text-center text-[12px] font-bold flex items-center justify-center px-0.5 leading-none"
            >
              {code}
            </div>
          ))}
        </div>
      </div>
      <div
        className="text-right text-[10px] text-gray-600 mt-auto pt-0.5"
        suppressHydrationWarning
      >
        {dataFormatada}
      </div>
    </div>
  );
}

export default function Home() {
  const [hubRows, setHubRows] = useState<HubRow[]>([]);
  const [selectedGrid, setSelectedGrid] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [loadingIata, setLoadingIata] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const loadData = (mock: boolean) => {
    setLoadingIata(true);
    setError("");
    const url = mock ? "/api/iata?mock=1" : "/api/iata";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const rows = normalizePayload(data);
          setHubRows(rows);
          setUsingMock(mock);
          setSelectedGrid((prev) => {
            if (prev && rows.some((r) => r.grid === prev)) return prev;
            return rows[0]?.grid ?? "";
          });
        } else if (data?.error) {
          setError(data.error);
        }
      })
      .catch(() => setError(T.errorLoadIata))
      .finally(() => setLoadingIata(false));
  };

  useEffect(() => {
    loadData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRow = useMemo(() => {
    const q = selectedGrid.trim();
    if (!q) return null;
    return (
      hubRows.find(
        (r) => r.grid === q || r.grid.toUpperCase() === q.toUpperCase()
      ) ?? null
    );
  }, [selectedGrid, hubRows]);

  const gridCode = selectedRow?.grid || selectedGrid.trim();
  const hubCode = selectedRow?.hubVinculado ?? "";
  const iatasList = selectedRow?.iatas ?? [];

  const handleImprimir = () => {
    if (!gridCode || !selectedRow) {
      setError(T.errorSelectGrid);
      return;
    }
    setError("");
    const dataStr = new Date().toLocaleString("pt-BR");
    const logoUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/logo-anjun.png`
        : "";

    const hubEsc = escapeHtml(hubCode || "—");
    const gridEsc = escapeHtml(gridCode);
    const iatasHtml =
      iatasList.length > 0
        ? iatasList
            .map(
              (c) => `<div class="iata-cell">${escapeHtml(c)}</div>`
            )
            .join("")
        : `<div class="iata-cell">—</div>`;

    const labelHalfHtml = (cssClass = "") => `
      <div class="label-half ${cssClass}">
        <div class="label-logo"><img src="${logoUrl}" alt="Anjun Express" class="logo-img" /></div>
        <div class="header">${T.labelTitle}</div>
        <div class="hub-row">
          <div class="grid-wrap">
            <div class="grid-title">${T.gridLabel}</div>
            <div class="grid-code">${gridEsc}</div>
          </div>
          <div class="hub-wrap">
            <div class="hub-title">${T.hubLabel}</div>
            <div class="hub-code">${hubEsc}</div>
          </div>
        </div>
        <div class="iatas-wrap">
          <div class="iatas-title">${T.iatasLabel}</div>
          <div class="iatas-grid">${iatasHtml}</div>
        </div>
        <div class="footer">${dataStr}</div>
      </div>
    `;

    const labelsHtml = Array.from({ length: quantity }, () => `
      <div class="label">
        ${labelHalfHtml("label-top")}
        <div class="label-divider"></div>
        ${labelHalfHtml("label-bottom")}
      </div>
    `).join("");

    const win = window.open(
      "",
      "_blank",
      "width=400,height=600,left=-2500,top=100,scrollbars=no,menubar=no,toolbar=no,location=no,status=no"
    );
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>运输标签 Etiqueta GRU3 - 网格 GRID ${gridEsc}</title>
          <style>
            @page { size: 100mm 150mm; margin: 0; }
            body { margin: 0; padding: 0; font-family: Arial, "Microsoft YaHei", "PingFang SC", "SimSun", sans-serif; }
            .label { width: 100mm; height: 150mm; padding: 0; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; position: relative; }
            .label:last-child { page-break-after: auto; }
            .label-half { flex: 1; min-height: 0; padding: 2mm; display: flex; flex-direction: column; box-sizing: border-box; }
            .label-top { }
            .label-bottom { transform: rotate(180deg); }
            .label-divider { height: 2px; background: #000; flex-shrink: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .label-logo { text-align: left; margin-bottom: 1px; }
            .label-logo .logo-img { height: 8mm; width: auto; max-width: 40mm; object-fit: contain; display: block; }
            .header { text-align: center; margin-bottom: 2px; font-size: 11px; font-weight: bold; }
            .hub-row { display: flex; gap: 2px; flex-shrink: 0; width: 100%; }
            .grid-wrap { width: 28%; text-align: center; box-sizing: border-box; border: 2px solid #000; background: #fff; color: #000; padding: 3px 4px; display: flex; flex-direction: column; justify-content: center; }
            .grid-title { font-size: 7px; font-weight: bold; line-height: 1.15; }
            .grid-code { font-size: 28px; font-weight: bold; margin-top: 1px; line-height: 1.1; word-break: break-all; letter-spacing: 0.3px; }
            .hub-wrap { flex: 1; text-align: center; box-sizing: border-box; background: #000; color: #fff; padding: 3px 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: flex; flex-direction: column; justify-content: center; }
            .hub-title { font-size: 8px; font-weight: bold; line-height: 1.15; color: #fff; }
            .hub-code { font-size: 28px; font-weight: bold; margin-top: 1px; line-height: 1.1; color: #fff; letter-spacing: 0.3px; word-break: break-all; }
            .iatas-wrap { flex: 1; min-height: 0; margin-top: 2px; display: flex; flex-direction: column; }
            .iatas-title { font-size: 8px; font-weight: bold; text-align: center; margin-bottom: 1px; line-height: 1; flex-shrink: 0; }
            .iatas-grid { display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: 2px; flex: 1; min-height: 0; }
            .iata-cell { border: 1px solid #000; text-align: center; font-size: 11px; font-weight: 700; padding: 2px 1px; line-height: 1.05; box-sizing: border-box; display: flex; align-items: center; justify-content: center; }
            .footer { text-align: right; font-size: 8px; margin-top: auto; padding-top: 1px; }
          </style>
        </head>
        <body>
          ${labelsHtml}
        </body>
      </html>
    `);
    win.document.close();
    let printed = false;
    const doPrint = () => {
      if (printed) return;
      printed = true;
      try {
        win.print();
      } catch (_) {}
      setTimeout(() => {
        try {
          win.close();
        } catch (_) {}
      }, 600);
    };
    win.onload = () => setTimeout(doPrint, 500);
    setTimeout(doPrint, 2500);
  };

  const handleImprimirPDF = () => {
    handleImprimir();
  };

  const [dataFormatada, setDataFormatada] = useState("");

  useEffect(() => {
    setDataFormatada(new Date().toLocaleString("pt-BR"));
  }, []);

  const canPrint = Boolean(selectedRow && gridCode);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {T.appTitle}
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {T.appSubtitle}
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-[var(--bg-secondary)] rounded-xl p-6 border border-[var(--bg-tertiary)]">
            <h2 className="text-lg font-semibold text-white mb-4">
              {T.panelTitle}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {T.gridSelectLabel}
                </label>
                <input
                  type="text"
                  list="grid-list"
                  value={selectedGrid}
                  onChange={(e) => setSelectedGrid(e.target.value)}
                  onBlur={(e) => setSelectedGrid(e.target.value.trim())}
                  placeholder={
                    loadingIata
                      ? T.loading
                      : error
                        ? T.configError
                        : hubRows.length === 0
                          ? T.noGrid
                          : T.placeholder
                  }
                  disabled={loadingIata}
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-white placeholder-[var(--text-secondary)] placeholder-opacity-70 focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-60"
                  autoComplete="off"
                />
                <datalist id="grid-list">
                  {hubRows.map((row) => (
                    <option key={row.grid} value={row.grid} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                  {T.quantityLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.min(100, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  className="w-full px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] text-white focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {usingMock && (
                <p className="text-amber-300/90 text-xs">{T.mockHint}</p>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleImprimir}
                  disabled={loadingIata || !canPrint}
                  className="w-full py-3 rounded-lg font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {T.printZebra}
                </button>
                <button
                  onClick={handleImprimirPDF}
                  disabled={loadingIata || !canPrint}
                  className="w-full py-3 rounded-lg font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {T.printPdf}
                </button>
                <button
                  type="button"
                  onClick={() => loadData(false)}
                  disabled={loadingIata}
                  className="w-full py-2 rounded-lg font-medium bg-[var(--bg-tertiary)] hover:opacity-90 disabled:opacity-50 text-sm"
                >
                  {T.loadReal}
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              {T.dataSource}
            </p>
          </div>

          <div className="bg-white text-black rounded-xl overflow-hidden border border-[var(--bg-tertiary)] shadow-xl">
            <div
              ref={printRef}
              className="w-full aspect-[100/150] max-w-[100mm] mx-auto flex flex-col box-border overflow-hidden"
              style={{ maxHeight: "150mm" }}
            >
              <LabelHalfPreview
                hub={hubCode}
                grid={gridCode}
                iatas={iatasList}
                dataFormatada={dataFormatada}
              />
              <div className="h-0.5 bg-black shrink-0" />
              <LabelHalfPreview
                hub={hubCode}
                grid={gridCode}
                iatas={iatasList}
                dataFormatada={dataFormatada}
                mirrored
              />
            </div>
            {canPrint && quantity > 1 && (
              <p className="text-center text-sm text-gray-500 mt-2 p-2">
                + {quantity - 1} 张额外标签 etiqueta(s) adicionais
              </p>
            )}
            {!canPrint && (
              <p className="text-center text-gray-400 text-sm mt-4 p-2">
                {T.generateToPreview}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

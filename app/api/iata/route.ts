import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const APP_SCRIPT_URL = process.env.APP_SCRIPT_URL || "";

async function loadMockData() {
  const filePath = path.join(process.cwd(), "data", "mock-base.json");
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function GET(req: NextRequest) {
  const useMock =
    req.nextUrl.searchParams.get("mock") === "1" ||
    process.env.USE_MOCK_DATA === "1" ||
    process.env.USE_MOCK_DATA === "true";

  if (useMock) {
    try {
      const data = await loadMockData();
      return NextResponse.json(data);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Erro ao ler mock-base.json";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (!APP_SCRIPT_URL) {
    return NextResponse.json(
      {
        error:
          "APP_SCRIPT_URL não configurada. Use ?mock=1 para testar o layout localmente.",
      },
      { status: 500 }
    );
  }
  try {
    const url = `${APP_SCRIPT_URL}${APP_SCRIPT_URL.includes("?") ? "&" : "?"}action=getIataList`;
    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          error:
            "Resposta inválida do Apps Script. Verifique se o script está implantado corretamente.",
        },
        { status: 502 }
      );
    }
    if (data.status !== "success") {
      return NextResponse.json(
        { error: data.message || "Erro ao carregar base" },
        { status: 502 }
      );
    }
    return NextResponse.json(data.data || []);
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao conectar com a planilha";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

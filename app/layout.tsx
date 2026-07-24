import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "标签 GRU3 新版 Etiqueta GRU3 Nova - Anjun Express",
  description:
    "安骏快递 GRU3 标签系统 — 按网格识别  Sistema de etiquetas GRU3 — identificação por GRID",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" dir="ltr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

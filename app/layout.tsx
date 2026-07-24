import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Etiqueta GRU3 (SP-RR-002) - Anjun Express",
  description: "Sistema de etiquetas GRU3 para sacas - identificação por região",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" dir="ltr">
      <body className="antialiased">{children}</body>
    </html>
  );
}

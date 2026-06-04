import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Control DICA-MX",
  description: "Plataforma de gestión documental segura y auditable",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

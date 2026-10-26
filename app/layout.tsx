import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "CVSEND — Búsqueda de empleo remoto",
  description:
    "Panel local para encontrar ofertas remotas, adaptar el CV y aprobar postulaciones.",
};

const NAV_ITEMS = [
  { href: "/", label: "Ofertas" },
  { href: "/perfil", label: "Perfil y CV" },
  { href: "/fuentes", label: "Fuentes" },
  { href: "/postulaciones", label: "Postulaciones" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight">CVSEND</span>
              <span className="text-xs font-medium uppercase tracking-widest text-slate-500">
                empleo remoto
              </span>
            </Link>
            <nav className="flex flex-wrap gap-1 text-sm">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500">
          CVSEND se ejecuta solo en tu equipo. Las ofertas se obtienen de APIs
          públicas y se muestran con su atribución.
        </footer>
      </body>
    </html>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useRef } from "react";

const navItems = [
  { href: "/", label: "Visão geral" },
  { href: "/dashboard", label: "Painel" },
  { href: "/table", label: "Tabela" },
  { href: "/details", label: "Detalhes" },
  { href: "/status", label: "Status" },
  { href: "/settings", label: "Configurações" },
  { href: "/profile", label: "Perfil" },
  { href: "/activity", label: "Atividade" },
];

type LayoutProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function Layout({
  title,
  subtitle,
  actions,
  children,
}: LayoutProps) {
  const router = useRouter();
  const prefetchedRoutes = useRef<Set<string>>(new Set());

  const prefetchRoute = useCallback(
    (href: string) => {
      if (!href || prefetchedRoutes.current.has(href)) return;
      prefetchedRoutes.current.add(href);
      router.prefetch(href).catch(() => {});
    },
    [router],
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>Guincho Na Hora</strong>
          <span>Fretes & cargas em tempo real</span>
        </div>
        <nav className="nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={router.pathname === item.href ? "active" : ""}
              onMouseEnter={() => prefetchRoute(item.href)}
              onFocus={() => prefetchRoute(item.href)}
            >
              <span>{item.label}</span>
              <span>{"->"}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="main">
        <div className="content">
          <div className="topbar">
            <div>
              <div className="chip">Operacional</div>
              <h1>{title}</h1>
              {subtitle ? <p className="muted">{subtitle}</p> : null}
            </div>
            <div className="topbar-actions">{actions}</div>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useRef } from "react";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/table", label: "Table View" },
  { href: "/details", label: "Details" },
  { href: "/status", label: "Status" },
  { href: "/settings", label: "Settings" },
  { href: "/profile", label: "Profile" },
  { href: "/activity", label: "Activity" },
];

export default function Layout({ title, subtitle, actions, children }) {
  const router = useRouter();
  const prefetchedRoutes = useRef(new Set());

  const prefetchRoute = useCallback(
    (href) => {
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
        <nav className="nav" aria-label="Main navigation">
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
              <span>→</span>
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

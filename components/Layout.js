import Link from "next/link";
import { useRouter } from "next/router";

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
              className={router.pathname === item.href ? "active" : ""}
            >
              <span>{item.label}</span>
              <span>→</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main>
        <div className="topbar">
          <div>
            <div className="chip">Operacional</div>
            <h1>{title}</h1>
            {subtitle ? <p className="muted">{subtitle}</p> : null}
          </div>
          <div className="topbar-actions">{actions}</div>
        </div>
        {children}
      </main>
    </div>
  );
}

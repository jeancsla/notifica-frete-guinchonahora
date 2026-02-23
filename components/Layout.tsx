import type { ReactNode } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import BottomNav from "./BottomNav";

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

const mobileNavItems = [
  { href: "/dashboard", label: "Painel", icon: "📊" },
  { href: "/table", label: "Tabela", icon: "📋" },
  { href: "/status", label: "Status", icon: "🟢" },
  { href: "/activity", label: "Ativ", icon: "⚡" },
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
  const pageTitle = `${title} | Notifica Frete`;
  const pageDescription =
    subtitle ||
    "Painel operacional para monitoramento de cargas e notificacoes em tempo real.";
  const router = useRouter();
  const reducedMotion = useReducedMotion();
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
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      <a className="skip-link" href="#main-content">
        Pular para conteudo principal
      </a>
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
      <main id="main-content" className="main">
        <AnimatePresence mode="wait">
          <motion.div
            key={router.asPath}
            className="content page-transition"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <header className="topbar">
              <div>
                <div className="chip">Operacional</div>
                <h1>{title}</h1>
                {subtitle ? <p className="muted">{subtitle}</p> : null}
              </div>
              <div className="topbar-actions">{actions}</div>
            </header>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav
        currentPath={router.pathname}
        items={mobileNavItems}
        onPrefetch={prefetchRoute}
      />
    </div>
  );
}

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
    <div className="grid min-h-screen grid-cols-[260px_1fr] max-lg:grid-cols-1 max-lg:pb-16">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Head>
      <a
        className="absolute left-3 top-[-48px] z-[500] rounded-xl bg-[#f6f3ea] px-3.5 py-2.5 text-sm font-bold text-[#0a0d13] transition-all hover:top-3 focus:top-3"
        href="#main-content"
      >
        Pular para conteudo principal
      </a>
      <aside className="flex min-w-0 flex-col gap-6 border-r border-white/[0.08] bg-[rgba(14,19,27,0.7)] p-6 backdrop-blur-[16px] max-lg:hidden">
        <div className="flex flex-col gap-2">
          <strong className="text-lg tracking-tight">Guincho Na Hora</strong>
          <span className="text-xs text-[#a7afbe]">
            Fretes & cargas em tempo real
          </span>
        </div>
        <nav
          className="flex min-w-0 flex-col gap-2.5"
          aria-label="Navegação principal"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex items-center justify-between rounded-xl border border-transparent px-3.5 py-2.5 font-medium text-[#a7afbe] transition-all duration-200 hover:bg-[#151a23] hover:text-[#f6f3ea] hover:shadow-[0_10px_40px_rgba(0,0,0,0.35)] hover:border-[#2b3445] ${router.pathname === item.href ? "bg-[#151a23] text-[#f6f3ea] border-[#2b3445] shadow-[0_10px_40px_rgba(0,0,0,0.35)]" : ""}`}
              onMouseEnter={() => prefetchRoute(item.href)}
              onFocus={() => prefetchRoute(item.href)}
            >
              <span>{item.label}</span>
              <span>{"->"}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main id="main-content" className="min-w-0 p-8 max-md:p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={router.asPath}
            className="mx-auto w-full max-w-[1200px]"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <header className="mb-7 flex items-center justify-between gap-4 max-md:mb-5 max-md:flex-col max-md:items-start">
              <div>
                <div className="inline-flex items-center rounded-full bg-[rgba(255,122,0,0.15)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#ff7a00]">
                  Operacional
                </div>
                <h1 className="text-3xl font-bold tracking-tight max-md:text-2xl">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1 text-[#a7afbe]">{subtitle}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-3 max-md:w-full max-md:justify-start">
                {actions}
              </div>
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

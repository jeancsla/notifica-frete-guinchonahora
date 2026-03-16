import Link from "next/link";

type BottomNavItem = {
  href: string;
  label: string;
  icon: string;
};

type BottomNavProps = {
  currentPath: string;
  items: BottomNavItem[];
  onPrefetch: (href: string) => void;
};

export default function BottomNav({
  currentPath,
  items,
  onPrefetch,
}: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 hidden h-16 items-center justify-around border-t border-white/[0.08] bg-[rgba(14,19,27,0.95)] px-4 backdrop-blur-[16px] max-lg:flex"
      aria-label="Navegação mobile"
      role="navigation"
    >
      {items.map((item) => {
        const isActive = currentPath === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={`flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff7a00] focus-visible:ring-inset rounded-lg ${isActive ? "text-[#ff7a00]" : "text-[#a7afbe] hover:text-[#f6f3ea]"}`}
            onMouseEnter={() => onPrefetch(item.href)}
            onFocus={() => onPrefetch(item.href)}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${item.label}${isActive ? " (página atual)" : ""}`}
          >
            <span className="text-xl leading-none" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

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
      className="fixed bottom-0 left-0 right-0 z-[1000] hidden h-16 items-center justify-around border-t border-white/[0.08] bg-[rgba(14,19,27,0.85)] px-4 backdrop-blur-[16px] max-lg:flex"
      aria-label="Navegação móvel"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          className={`flex h-full flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#a7afbe] transition-colors duration-200 hover:text-[#f6f3ea] ${currentPath === item.href ? "text-[#ff7a00] hover:text-[#ff7a00]" : ""}`}
          onMouseEnter={() => onPrefetch(item.href)}
          onFocus={() => onPrefetch(item.href)}
        >
          <span className="text-xl leading-none" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

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
    <nav className="mobile-bottom-nav" aria-label="Navegação móvel">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          prefetch={false}
          className={`mobile-nav-item ${currentPath === item.href ? "active" : ""}`}
          onMouseEnter={() => onPrefetch(item.href)}
          onFocus={() => onPrefetch(item.href)}
        >
          <span className="icon" aria-hidden="true">
            {item.icon}
          </span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

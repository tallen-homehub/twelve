"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: React.ReactNode };

/** Fixed bottom tab bar, sized for thumbs. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-charcoal-2 bg-ink/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-between px-2 pt-2">
        {items.map((it) => {
          const active = path === it.href || path.startsWith(`${it.href}/`);
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                className={`flex min-h-12 flex-col items-center gap-1 rounded-lg py-1 text-xs font-semibold ${active ? "text-tan" : "text-muted"}`}
              >
                {it.icon}
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

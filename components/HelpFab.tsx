"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Floating help button on the rep side. A dot shows when leadership has replied. */
export function HelpFab({ unread }: { unread: boolean }) {
  const path = usePathname();
  if (path.startsWith("/help") || path.startsWith("/practice/session") || path.startsWith("/recordings/record")) return null;
  return (
    <Link
      href="/help"
      aria-label={unread ? "Help chat, new reply" : "Help chat"}
      className="fixed right-4 bottom-24 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-tan font-display text-2xl font-black text-ink shadow-lg shadow-ink/60"
    >
      ?
      {unread && <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red ring-2 ring-ink" />}
    </Link>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshThemes } from "@/app/actions/themes";

export function RefreshThemes({ leaderId, label = "Refresh now" }: { leaderId: string | null; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await refreshThemes(leaderId);
            setMsg({ ok: r.ok, text: r.message });
            router.refresh();
          })
        }
        className="flex min-h-11 items-center rounded-sm border border-bone/40 bg-ink/60 px-4 text-sm font-bold"
      >
        {pending ? "Reading the week… (~30s)" : label}
      </button>
      {msg && <p className={`text-xs ${msg.ok ? "text-muted" : "text-red"}`}>{msg.text}</p>}
    </div>
  );
}

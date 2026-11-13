"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDay } from "@/app/actions/content";

export function AddDay({ trackId }: { trackId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await addDay(trackId);
            if (r.ok && r.id) router.push(`/content/track/day/${r.id}`);
            else setErr(r.message);
          })
        }
        className="min-h-12 rounded-sm border border-dashed border-muted-light font-semibold text-tan disabled:opacity-50"
      >
        {pending ? "Adding…" : "+ Add the next day"}
      </button>
      {err && <p className="text-sm text-red">{err}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Retries scoring for a call that ended but wasn't scored. The saved transcript is reused. */
export function RescoreButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rescore() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/roleplay/${sessionId}/end`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (!res.ok) {
      setBusy(false);
      return setError((await res.json().catch(() => ({}))).error ?? "Scoring failed. Try again.");
    }
    router.push(`/practice/session/${sessionId}/results`);
  }

  return (
    <div className="flex flex-col gap-3">
      <Button onClick={rescore} disabled={busy}>{busy ? "Scoring…" : "Get my score"}</Button>
      {error && <p className="rounded-xl bg-charcoal p-4 text-sm text-bone">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { rebuildBrain } from "./actions";

export function BrainButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            try {
              const r = await rebuildBrain();
              setMsg(`Done: ${r.docs} sources, ${r.chunks} pieces.`);
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Rebuild failed.");
            }
          })
        }
      >
        {pending ? "Rebuilding… (up to a minute)" : "Rebuild the brain"}
      </Button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

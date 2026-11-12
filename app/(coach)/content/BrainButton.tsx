"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { rebuildBrain, syncDriveNow } from "./actions";

export function BrainButton({ kind }: { kind: "app" | "drive" }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = kind === "app" ? rebuildBrain : syncDriveNow;
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant={kind === "drive" ? "primary" : "ghost"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            try {
              setMsg(await run());
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "That didn't work.");
            }
          })
        }
      >
        {pending ? "Working… (up to a minute)" : kind === "app" ? "Rebuild from the app" : "Sync Google Drive now"}
      </Button>
      {msg && <p className="text-sm text-muted">{msg}</p>}
    </div>
  );
}

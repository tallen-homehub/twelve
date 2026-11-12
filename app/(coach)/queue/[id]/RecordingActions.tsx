"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { confirmConsent, deleteRecording, rerunRecording } from "../actions";

/** Buttons for recordings that stopped: confirm consent, re-run, or delete. */
export function RecordingActions({ recordingId, kind }: { recordingId: string; kind: "consent" | "failed" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<void>, then?: string) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        if (then) router.push(then);
        else router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      {kind === "consent" ? (
        <Button onClick={() => run(() => confirmConsent(recordingId))} disabled={pending}>
          I heard them agree. Coach it.
        </Button>
      ) : (
        <Button onClick={() => run(() => rerunRecording(recordingId))} disabled={pending}>
          Try again
        </Button>
      )}
      {!confirmDelete ? (
        <Button variant="ghost" onClick={() => setConfirmDelete(true)} disabled={pending}>
          Delete recording
        </Button>
      ) : (
        <Button variant="ghost" className="ring-2 ring-red" onClick={() => run(() => deleteRecording(recordingId), "/queue")} disabled={pending}>
          Tap again to delete the audio and transcript for good
        </Button>
      )}
      {error && <p className="text-red">{error}</p>}
    </div>
  );
}

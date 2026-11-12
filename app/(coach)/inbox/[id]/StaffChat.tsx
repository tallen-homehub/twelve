"use client";

import { useCallback, useState, useTransition } from "react";
import { Chat } from "@/components/Chat";
import type { ChatMessage } from "@/lib/help";
import { handBack, pollThread, sendStaffMessage } from "../actions";

export function StaffChat({ threadId, initial, status: startStatus }: { threadId: string; initial: ChatMessage[]; status: "ai" | "escalated" }) {
  const [status, setStatus] = useState(startStatus);
  const [pending, start] = useTransition();
  const poll = useCallback(async () => {
    const r = await pollThread(threadId);
    setStatus(r.status);
    return r;
  }, [threadId]);
  const send = useCallback((body: string) => sendStaffMessage(threadId, body), [threadId]);

  return (
    <Chat
      viewer="staff"
      initial={initial}
      send={send}
      poll={poll}
      placeholder="Reply as TWELVE leadership"
      footer={
        <p className="text-center text-xs text-muted">
          {status === "escalated" ? (
            <button type="button" disabled={pending} onClick={() => start(async () => void (await handBack(threadId), await poll()))} className="min-h-12 px-3 font-semibold text-tan">
              Done here, hand back to the help bot
            </button>
          ) : (
            "The help bot is answering. Your reply takes over the conversation."
          )}
        </p>
      }
    />
  );
}

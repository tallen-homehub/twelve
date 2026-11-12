"use client";

import { useCallback, useState, useTransition } from "react";
import { Chat } from "@/components/Chat";
import type { ChatMessage } from "@/lib/help";
import { askForPerson, pollHelp, sendHelpMessage } from "./actions";

export function HelpChat({ initial, greeting, escalated: startEscalated }: { initial: ChatMessage[]; greeting: ChatMessage; escalated: boolean }) {
  const [escalated, setEscalated] = useState(startEscalated);
  const [pending, start] = useTransition();
  // Stable so the chat's polling timer isn't restarted on every render.
  const poll = useCallback(async () => {
    const r = await pollHelp();
    setEscalated(r.status === "escalated");
    return { messages: r.messages.length ? r.messages : [greeting] };
  }, [greeting]);

  return (
    <Chat
      viewer="rep"
      initial={initial.length ? initial : [greeting]}
      send={sendHelpMessage}
      poll={poll}
      placeholder={escalated ? "Message the TWELVE leadership team" : "Ask anything about the app or your training"}
      footer={
        !escalated && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await askForPerson();
                await poll();
              })
            }
            className="min-h-12 self-center rounded-xl px-4 text-sm font-semibold text-tan"
          >
            Talk to a person
          </button>
        )
      }
    />
  );
}

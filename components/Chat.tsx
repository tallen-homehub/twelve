"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ChatMessage } from "@/lib/help";

/**
 * Chat window shared by the rep's help chat and leadership's inbox.
 * New messages arrive by polling every few seconds while the screen is open.
 */
export function Chat({
  viewer,
  initial,
  send,
  poll,
  placeholder = "Type a message",
  footer,
}: {
  viewer: "rep" | "staff";
  initial: ChatMessage[];
  send: (body: string) => Promise<void>;
  poll: () => Promise<{ messages: ChatMessage[] }>;
  placeholder?: string;
  footer?: React.ReactNode;
}) {
  const [messages, setMessages] = useState(initial);
  const [draft, setDraft] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length, waiting]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { messages: fresh } = await poll();
        if (alive) setMessages(fresh);
      } catch {}
    };
    const t = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [poll]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || waiting) return;
    setDraft("");
    setError(null);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, sender_type: viewer, body, created_at: new Date().toISOString(), sender_name: null }]);
    setWaiting(viewer === "rep");
    start(async () => {
      try {
        await send(body);
        const { messages: fresh } = await poll();
        setMessages(fresh);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Didn't send. Try again.");
        setDraft(body);
      } finally {
        setWaiting(false);
      }
    });
  };

  const mine = (m: ChatMessage) => m.sender_type === viewer;
  const who = (m: ChatMessage) =>
    m.sender_type === "ai" ? "Twelve help" : m.sender_type === "staff" ? `${m.sender_name ?? "Leadership"} · TWELVE` : m.sender_type === "rep" ? (m.sender_name ?? "Rep") : null;

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3">
        {messages.map((m) =>
          m.sender_type === "system" ? (
            <li key={m.id} className="px-4 text-center text-xs font-semibold text-tan">
              {m.body}
            </li>
          ) : (
            <li key={m.id} className={`flex flex-col ${mine(m) ? "items-end" : "items-start"}`}>
              {!mine(m) && <span className="mb-1 px-1 text-xs text-muted">{who(m)}</span>}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 whitespace-pre-wrap ${mine(m) ? "rounded-br-md bg-tan text-ink" : m.sender_type === "staff" ? "rounded-bl-md bg-charcoal-2 ring-1 ring-tan" : "rounded-bl-md bg-charcoal"}`}>
                {m.body}
              </div>
              {m.sources && m.sources.length > 0 && (
                <span className="mt-1 px-1 text-[11px] text-muted">From: {m.sources.map((s) => s.title).join(" · ")}</span>
              )}
            </li>
          ),
        )}
        {waiting && (
          <li className="flex items-start">
            <div className="rounded-2xl rounded-bl-md bg-charcoal px-4 py-3 text-muted">…</div>
          </li>
        )}
      </ol>
      <div ref={end} />
      {footer}
      <form onSubmit={submit} className="sticky bottom-24 flex items-end gap-2 bg-ink/95 py-2 backdrop-blur">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) submit(e);
          }}
          rows={1}
          maxLength={4000}
          placeholder={placeholder}
          className="max-h-40 min-h-12 flex-1 resize-none rounded-2xl bg-charcoal px-4 py-3 text-base outline-none ring-tan focus:ring-2"
        />
        <button type="submit" disabled={!draft.trim() || waiting} className="min-h-12 rounded-2xl bg-tan px-5 font-bold text-ink disabled:opacity-40">
          Send
        </button>
      </form>
      {error && <p className="text-red">{error}</p>}
    </div>
  );
}

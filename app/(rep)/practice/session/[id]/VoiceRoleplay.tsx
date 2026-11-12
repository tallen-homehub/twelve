"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Turn } from "@/lib/roleplay";
import { Button } from "@/components/ui";

type Status = "idle" | "connecting" | "live" | "scoring" | "error";

/** Live voice role play over WebRTC, straight from the phone to OpenAI with a short-lived key from our server. */
export function VoiceRoleplay({ sessionId, personaName, setting }: { sessionId: string; personaName: string; setting: "door" | "table" }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [maxSeconds, setMaxSeconds] = useState(setting === "door" ? 360 : 1200);

  const pc = useRef<RTCPeerConnection | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const started = useRef(0);
  const turnsRef = useRef<Turn[]>([]);
  const ending = useRef(false);

  const addTurn = (role: Turn["role"], text: string) => {
    if (!text?.trim()) return;
    const turn = { role, text: text.trim(), t: Math.round((Date.now() - started.current) / 1000) };
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  };

  async function start() {
    setError(null);
    setStatus("connecting");
    try {
      const tokenRes = await fetch(`/api/roleplay/${sessionId}/token`, { method: "POST" });
      const token = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(token.error ?? "Couldn't connect.");
      setMaxSeconds(token.maxSeconds);

      const conn = new RTCPeerConnection();
      pc.current = conn;
      const el = new Audio();
      el.autoplay = true;
      audio.current = el;
      conn.ontrack = (e) => (el.srcObject = e.streams[0]);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
        throw new Error("Microphone blocked. Allow mic access for this site, then try again.");
      });
      mic.current = stream;
      conn.addTrack(stream.getTracks()[0]);

      const dc = conn.createDataChannel("oai-events");
      dc.addEventListener("open", () => {
        started.current = Date.now();
        setStatus("live");
        // The homeowner speaks first, with their opening line.
        dc.send(JSON.stringify({ type: "response.create" }));
      });
      dc.addEventListener("message", (e) => {
        const ev = JSON.parse(e.data);
        if (ev.type === "conversation.item.input_audio_transcription.completed") addTurn("rep", ev.transcript);
        if (ev.type === "response.output_audio_transcript.done" || ev.type === "response.audio_transcript.done") addTurn("homeowner", ev.transcript);
        if (ev.type === "error") setError(ev.error?.message ?? "Voice error");
      });

      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      const sdp = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${token.value}`, "Content-Type": "application/sdp" },
      });
      if (!sdp.ok) {
        const raw = await sdp.text();
        let reason = raw.slice(0, 200);
        try { reason = JSON.parse(raw).error?.message ?? reason; } catch {}
        throw new Error(`Voice call failed (OpenAI ${sdp.status}): ${reason}`);
      }
      await conn.setRemoteDescription({ type: "answer", sdp: await sdp.text() });
    } catch (e) {
      cleanup();
      setStatus("error");
      setError(e instanceof Error ? e.message : "Couldn't start voice.");
    }
  }

  function cleanup() {
    mic.current?.getTracks().forEach((t) => t.stop());
    pc.current?.close();
    if (audio.current) audio.current.srcObject = null;
  }

  async function finish() {
    if (ending.current) return;
    ending.current = true;
    const voiceSeconds = started.current ? Math.round((Date.now() - started.current) / 1000) : 0;
    // Give the last transcript a moment to arrive before hanging up.
    await new Promise((r) => setTimeout(r, 1200));
    cleanup();
    setStatus("scoring");
    const res = await fetch(`/api/roleplay/${sessionId}/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turns: turnsRef.current, voiceSeconds }),
    });
    if (!res.ok) {
      ending.current = false;
      setStatus("error");
      return setError((await res.json().catch(() => ({}))).error ?? "Scoring failed.");
    }
    router.push(`/practice/session/${sessionId}/results`);
  }

  // Clock and time cap
  useEffect(() => {
    if (status !== "live") return;
    const timer = setInterval(() => {
      const s = Math.round((Date.now() - started.current) / 1000);
      setElapsed(s);
      if (s >= maxSeconds) finish();
    }, 500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, maxSeconds]);

  useEffect(() => () => cleanup(), []);

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-6">
      <header>
        <p className="text-xs font-bold tracking-widest text-tan uppercase">Role play · voice</p>
        <h1 className="font-display text-3xl font-black lowercase">{personaName}</h1>
      </header>

      <div className="flex flex-col items-center gap-4 py-6">
        <div
          aria-hidden="true"
          className={`flex h-36 w-36 items-center justify-center rounded-full ${status === "live" ? "animate-pulse bg-tan/20 ring-4 ring-tan" : "bg-charcoal"}`}
        >
          <span className="font-display text-3xl font-black">{status === "live" ? mmss(elapsed) : "●"}</span>
        </div>
        <p className="text-sm text-muted">
          {status === "idle" && (setting === "door" ? "You're at the door. Tap start, then knock." : "You're at the table. Tap start.")}
          {status === "connecting" && "Connecting…"}
          {status === "live" && `Talk normally. Ends at ${mmss(maxSeconds)}.`}
          {status === "scoring" && "Scoring on Chase's rubric…"}
        </p>
      </div>

      {error && <p className="rounded-xl bg-red/15 px-4 py-3">{error}</p>}

      <div className="flex flex-1 flex-col gap-2">
        {turns.slice(-4).map((t, i) => (
          <p key={i} className={`text-sm ${t.role === "rep" ? "text-right text-tan" : "text-muted"}`}>
            {t.text}
          </p>
        ))}
      </div>

      <div className="sticky bottom-24 bg-ink pt-2">
        {status === "idle" || status === "error" ? (
          <Button onClick={start}>{status === "error" ? "Try again" : "Start"}</Button>
        ) : status === "live" ? (
          <Button onClick={finish}>End and score</Button>
        ) : (
          <Button disabled>{status === "connecting" ? "Connecting…" : "Scoring…"}</Button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mmss } from "@/lib/format";
import { Button, Field } from "@/components/ui";
import { uploadRecording } from "../upload-client";

/**
 * In-app recorder. Audio is saved to the phone (IndexedDB) every few seconds while recording,
 * so a lost signal, a closed tab or a crash doesn't lose the conversation. The screen is kept awake.
 * Limit: a web app can't record in the background; leaving the app or locking the phone stops it.
 */

type Phase = "ready" | "recording" | "review" | "uploading";
type Setting = "door" | "table";
type Pending = { sid: string; mime: string; setting: Setting; startedAt: number; seconds: number };

const DB = "twelve-recorder";
const STORE = "chunks";
const PENDING_KEY = "twelve-recorder-pending";
const input = "w-full rounded-xl bg-charcoal px-4 py-4 text-lg outline-none ring-tan focus:ring-2";

// ───────────── tiny IndexedDB helpers ─────────────
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { autoIncrement: true }).createIndex("sid", "sid");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function saveChunk(sid: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ sid, blob });
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function loadChunks(sid: string): Promise<Blob[]> {
  const db = await openDb();
  return new Promise((res, rej) => {
    const req = db.transaction(STORE).objectStore(STORE).index("sid").getAll(sid);
    req.onsuccess = () => res((req.result as { blob: Blob }[]).map((r) => r.blob));
    req.onerror = () => rej(req.error);
  });
}
async function clearChunks(sid: string) {
  const db = await openDb();
  await new Promise<void>((res) => {
    const tx = db.transaction(STORE, "readwrite");
    const idx = tx.objectStore(STORE).index("sid");
    const req = idx.openCursor(IDBKeyRange.only(sid));
    req.onsuccess = () => {
      const c = req.result;
      if (c) {
        c.delete();
        c.continue();
      }
    };
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}
const readPending = (): Pending | null => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "null");
  } catch {
    return null;
  }
};
const writePending = (p: Pending | null) => {
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else localStorage.removeItem(PENDING_KEY);
  } catch {}
};

function pickMime() {
  const options = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return options.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}
const extFor = (mime: string) => (mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm");

export function Recorder({ profileId, today, consentScript }: { profileId: string; today: string; consentScript: { ask: string; confirm: string } }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("ready");
  const [setting, setSetting] = useState<Setting>("door");
  const [seconds, setSeconds] = useState(0);
  const [consent, setConsent] = useState(false);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leftover, setLeftover] = useState<Pending | null>(null);

  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const session = useRef<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const finished = useRef<Blob | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());

  // A recording that never got uploaded (app closed, phone died) is offered back.
  useEffect(() => {
    const p = readPending();
    if (p) setLeftover(p);
    return () => stopEverything();
  }, []);

  // If the rep leaves the app, the phone stops the mic. Wrap up what we have.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && rec.current?.state === "recording") {
        rec.current.requestData();
      }
    };
    const onShow = () => {
      if (document.visibilityState === "visible" && phase === "recording" && rec.current && rec.current.state !== "recording") {
        setNote("Recording stopped when you left the app. Everything up to then is saved.");
        void stop();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("visibilitychange", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function stopEverything() {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    void wake.current?.release().catch(() => {});
    wake.current = null;
  }

  async function start() {
    setError(null);
    setNote(null);
    if (typeof MediaRecorder === "undefined") return setError("This browser can't record. Use your voice memo app and upload the file instead.");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true, autoGainControl: true } });
    } catch {
      return setError("Microphone blocked. Allow mic access for this site in your phone's settings, then try again.");
    }
    const mime = pickMime();
    const r = new MediaRecorder(stream.current, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 48000 });
    const sid = crypto.randomUUID();
    session.current = { sid, mime: r.mimeType || mime || "audio/mp4", setting, startedAt: Date.now(), seconds: 0 };
    writePending(session.current);
    r.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) writes.current = writes.current.then(() => saveChunk(sid, e.data)).catch(() => {});
    };
    rec.current = r;
    r.start(5000); // a chunk every 5 seconds goes to the phone's storage

    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wake.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {}

    setSeconds(0);
    timer.current = setInterval(() => {
      const s = Math.round((Date.now() - (session.current?.startedAt ?? Date.now())) / 1000);
      setSeconds(s);
      if (session.current) writePending({ ...session.current, seconds: s });
    }, 1000);
    setPhase("recording");
  }

  async function stop() {
    const r = rec.current;
    if (r && r.state !== "inactive") {
      await new Promise<void>((res) => {
        r.addEventListener("stop", () => res(), { once: true });
        r.stop();
      });
    }
    stopEverything();
    await writes.current;
    const s = session.current;
    if (!s) return;
    const chunks = await loadChunks(s.sid);
    finished.current = new Blob(chunks, { type: s.mime.split(";")[0] });
    if (!finished.current.size) {
      setError("Nothing was recorded. Check the mic and try again.");
      await discard();
      return;
    }
    setPhase("review");
  }

  async function resumeLeftover() {
    if (!leftover) return;
    const chunks = await loadChunks(leftover.sid);
    if (!chunks.length) {
      writePending(null);
      setLeftover(null);
      return;
    }
    session.current = leftover;
    setSetting(leftover.setting);
    setSeconds(leftover.seconds);
    finished.current = new Blob(chunks, { type: leftover.mime.split(";")[0] });
    setLeftover(null);
    setNote("Recovered your last recording. It was saved up to where it stopped.");
    setPhase("review");
  }

  async function discard() {
    const s = session.current ?? leftover;
    if (s) await clearChunks(s.sid);
    writePending(null);
    session.current = null;
    finished.current = null;
    setLeftover(null);
    setConsent(false);
    setLabel("");
    setSeconds(0);
    setPhase("ready");
  }

  async function upload() {
    const s = session.current;
    const blob = finished.current;
    if (!s || !blob) return;
    if (!consent) return setError("Check the consent box. We can't coach a recording without it.");
    setError(null);
    setPhase("uploading");
    try {
      const id = await uploadRecording(profileId, blob, extFor(s.mime), {
        setting: s.setting,
        recordedOn: today,
        label,
        consent,
        consentAt: "",
      });
      await clearChunks(s.sid);
      writePending(null);
      router.push(`/recordings/${id}`);
    } catch (e) {
      // The recording stays on the phone; they can retry.
      setPhase("review");
      setError(e instanceof Error ? e.message : "Upload failed. It's still saved on your phone. Try again.");
    }
  }

  if (leftover && phase === "ready") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-charcoal p-5">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">Unfinished recording</p>
        <p>
          You have a {leftover.setting} recording ({mmss(leftover.seconds)}) from {new Date(leftover.startedAt).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })} that never uploaded.
        </p>
        <Button onClick={resumeLeftover}>Upload it</Button>
        <Button variant="ghost" onClick={discard}>
          Delete it
        </Button>
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          {(["door", "table"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSetting(s)} className={`min-h-12 rounded-xl px-4 py-3 font-bold ${setting === s ? "bg-tan text-ink" : "bg-charcoal"}`}>
              {s === "door" ? "At the door" : "At the table"}
            </button>
          ))}
        </div>
        {setting === "table" && (
          <p className="rounded-xl bg-charcoal p-4 text-sm text-muted">
            Long appointment? If you&apos;ll switch apps or lock your phone, use your voice memo app or Plaud and upload the file instead. This recorder stops if you leave the app.
          </p>
        )}
        <div className="rounded-2xl bg-charcoal-2 p-5">
          <p className="text-xs font-bold tracking-widest text-tan uppercase">Ask first</p>
          <p className="mt-2 text-lg">&ldquo;{consentScript.ask}&rdquo;</p>
        </div>
        <button
          type="button"
          onClick={start}
          className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-full bg-red font-display text-2xl font-black text-ink transition active:scale-95"
        >
          <span className="mb-1 h-6 w-6 rounded-full bg-ink" />
          record
        </button>
        <p className="text-center text-sm text-muted">Keep the app open while you record.</p>
        {error && <p className="text-red">{error}</p>}
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2 text-sm font-bold tracking-widest text-red uppercase">
          <span className="h-3 w-3 animate-pulse rounded-full bg-red" /> Recording · {setting}
        </div>
        <p className="font-display text-7xl font-black tabular-nums">{mmss(seconds)}</p>
        <div className="w-full rounded-2xl bg-charcoal-2 p-5">
          <p className="text-xs font-bold tracking-widest text-tan uppercase">Say this now</p>
          <p className="mt-2 text-lg">&ldquo;{consentScript.confirm}&rdquo;</p>
        </div>
        <button type="button" onClick={stop} className="flex h-32 w-32 items-center justify-center rounded-full bg-bone transition active:scale-95" aria-label="Stop recording">
          <span className="h-10 w-10 rounded-lg bg-ink" />
        </button>
        <p className="text-center text-sm text-muted">Don&apos;t lock your phone or switch apps until you stop.</p>
      </div>
    );
  }

  // review + uploading
  return (
    <div className="flex flex-col gap-5">
      {note && <p className="rounded-xl bg-charcoal p-4 text-sm">{note}</p>}
      <div className="rounded-2xl bg-charcoal p-5 text-center">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">{session.current?.setting ?? setting} recording</p>
        <p className="font-display text-5xl font-black">{mmss(seconds)}</p>
      </div>
      <Field label="Short label (no homeowner names)">
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} placeholder="Corona door, Tue" className={input} />
      </Field>
      <label className="flex min-h-12 items-start gap-3 rounded-xl bg-charcoal p-4">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-tan" />
        <span>The homeowner agreed to be recorded, and that agreement is on this recording.</span>
      </label>
      <Button onClick={upload} disabled={phase === "uploading"}>
        {phase === "uploading" ? "Uploading… keep this screen open" : "Send for coaching"}
      </Button>
      <Button variant="ghost" onClick={discard} disabled={phase === "uploading"}>
        Delete without sending
      </Button>
      {error && <p className="text-red">{error}</p>}
    </div>
  );
}

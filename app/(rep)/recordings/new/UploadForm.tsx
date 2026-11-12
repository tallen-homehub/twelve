"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadRecording } from "../upload-client";
import { Button, Field } from "@/components/ui";

const input = "w-full rounded-xl bg-charcoal px-4 py-4 text-lg outline-none ring-tan focus:ring-2";
const MAX_BYTES = 500 * 1024 * 1024;
const ACCEPT = ".m4a,.mp3,.wav,.aac,.mp4,.mov,audio/*,video/mp4,video/quicktime";

export function UploadForm({ profileId, today, consentScript }: { profileId: string; today: string; consentScript: { ask: string; confirm: string } }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [setting, setSetting] = useState<"door" | "table">("table");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<null | "uploading">(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Pick the recording first.");
    if (file.size > MAX_BYTES) return setError("That file is over 500 MB. Trim it or export it as m4a.");
    if (!consent) return setError("Check the consent box. We can't coach a recording without it.");
    const fd = new FormData(e.currentTarget);

    setBusy("uploading");
    try {
      const id = await uploadRecording(profileId, file, file.name.split(".").pop() || "m4a", {
        setting,
        recordedOn: String(fd.get("recorded_on") || ""),
        label: String(fd.get("label") || ""),
        consent,
        consentAt: String(fd.get("consent_at") || ""),
      });
      router.push(`/recordings/${id}`);
    } catch (err) {
      setBusy(null);
      setError(err instanceof Error ? err.message : "Couldn't save the recording.");
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="Recording">
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded-xl bg-charcoal px-4 py-4 text-base file:mr-3 file:rounded-lg file:border-0 file:bg-tan file:px-3 file:py-2 file:font-bold file:text-ink"
        />
        {file && <span className="text-sm text-muted">{(file.size / 1024 / 1024).toFixed(1)} MB</span>}
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-muted">Where was it?</span>
        <div className="grid grid-cols-2 gap-3">
          {(["door", "table"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSetting(s)}
              className={`min-h-12 rounded-xl px-4 py-3 font-bold ${setting === s ? "bg-tan text-ink" : "bg-charcoal"}`}
            >
              {s === "door" ? "At the door" : "At the table"}
            </button>
          ))}
        </div>
      </div>

      <Field label="Date">
        <input name="recorded_on" type="date" defaultValue={today} max={today} className={input} />
      </Field>

      <Field label="Short label (no homeowner names)">
        <input name="label" maxLength={60} placeholder="Corona table, Tue" className={input} />
      </Field>

      <div className="rounded-2xl bg-charcoal-2 p-4 text-sm">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">Get consent on the recording</p>
        <p className="mt-2">Before you hit record: &ldquo;{consentScript.ask}&rdquo;</p>
        <p className="mt-1">Once it&apos;s recording: &ldquo;{consentScript.confirm}&rdquo;</p>
      </div>

      <label className="flex min-h-12 items-start gap-3 rounded-xl bg-charcoal p-4">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-6 w-6 shrink-0 accent-tan" />
        <span>The homeowner agreed to be recorded, and that agreement is on this recording.</span>
      </label>

      <Field label="When do they agree? (optional, e.g. 0:45)">
        <input name="consent_at" inputMode="numeric" placeholder="0:45" className={input} />
      </Field>

      <Button type="submit" disabled={busy !== null}>
        {busy ? "Uploading… keep this screen open" : "Upload for coaching"}
      </Button>
      {error && <p className="text-red">{error}</p>}
    </form>
  );
}

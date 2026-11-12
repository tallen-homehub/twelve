"use server";

import { after } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { startTranscription } from "@/lib/recordings";
import { appBaseUrl } from "@/lib/url";

/** Called after the browser finishes uploading the file to storage. Creates the row and starts transcription. */
export async function createRecording(input: { path: string; setting: string; recordedOn: string; label: string; consent: boolean; consentAt: string }) {
  const profile = await requireProfile();
  if (!input.consent) throw new Error("Check the consent box first.");
  if (!input.path.startsWith(`${profile.id}/`)) throw new Error("That upload isn't yours.");
  const setting = input.setting === "table" ? "table" : "door";
  const label = input.label.trim().slice(0, 60) || null;
  const consentAt = input.consentAt.trim() ? parseClock(input.consentAt) : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recordings")
    .insert({
      profile_id: profile.id,
      setting,
      recorded_at: input.recordedOn ? `${input.recordedOn}T12:00:00-08:00` : new Date().toISOString(),
      storage_path: input.path,
      consent_attested: true,
      consent_at_seconds: consentAt,
      label,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Couldn't save the recording.");

  const base = await appBaseUrl();
  after(() => startTranscription(data.id, base));
  return data.id as string;
}

/** "1:30" or "90" → 90 seconds. */
function parseClock(v: string): number | null {
  const parts = v.split(":").map((p) => Number(p.trim()));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

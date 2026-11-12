"use client";

import { createClient } from "@/lib/supabase/client";
import { createRecording } from "./actions";

export type UploadMeta = { setting: "door" | "table"; recordedOn: string; label: string; consent: boolean; consentAt: string };

/** Uploads audio to the rep's private folder, then creates the recording row (which starts transcription). Returns the recording id. */
export async function uploadRecording(profileId: string, file: Blob, ext: string, meta: UploadMeta): Promise<string> {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "m4a";
  const path = `${profileId}/${crypto.randomUUID()}.${safeExt}`;
  const { error } = await createClient().storage.from("recordings").upload(path, file, { contentType: file.type || undefined });
  if (error) {
    const tooBig = /size|exceed|too large|413/i.test(error.message);
    throw new Error(
      tooBig
        ? "That file is bigger than storage allows right now. Export a shorter or smaller file (m4a works best) and try again."
        : `Upload failed: ${error.message}. Check your signal and try again.`,
    );
  }
  return createRecording({ path, ...meta });
}

"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { rebuildAppBrain } from "@/lib/brain";
import { syncDrive } from "@/lib/brain/drive";
import { createAdminClient } from "@/lib/supabase/admin";

/** Re-reads the app guide, lessons, skills and homeowners into the help bot's brain. */
export async function rebuildBrain() {
  const me = await requireProfile({ roles: ["coach", "admin"] });
  const result = await rebuildAppBrain();
  await createAdminClient().from("audit_log").insert({ actor: me.id, action: "brain.rebuild", detail: result });
  revalidatePath("/content");
  return `Done: ${result.docs} sources, ${result.chunks} pieces.`;
}

/** Pulls new and changed files from the Google Drive "Twelve Brain" folder. */
export async function syncDriveNow() {
  const me = await requireProfile({ roles: ["coach", "admin"] });
  const r = await syncDrive();
  await createAdminClient().from("audit_log").insert({ actor: me.id, action: "brain.drive_sync", detail: r });
  revalidatePath("/content");
  const parts = [`${r.files} files in the folder`, `${r.updated} updated`];
  if (r.removed) parts.push(`${r.removed} removed`);
  if (r.skipped) parts.push(`${r.skipped} without readable text`);
  if (r.errors.length) parts.push(`${r.errors.length} failed`);
  return parts.join(", ") + ".";
}

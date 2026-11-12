"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listMessages } from "@/lib/help";

const staff = () => requireProfile({ roles: ["coach", "admin"] });

/** Leadership replies. Jumping into a bot conversation takes it over (the bot goes quiet). */
export async function sendStaffMessage(threadId: string, body: string) {
  const me = await staff();
  const text = body.trim().slice(0, 4000);
  if (!text) return;
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ thread_id: threadId, sender_type: "staff", sender_id: me.id, body: text });
  if (error) throw new Error("Didn't send. Try again.");
  const admin = createAdminClient();
  const { data: t } = await admin.from("threads").select("status").eq("id", threadId).single();
  const now = new Date().toISOString();
  if (t?.status === "ai") await admin.from("threads").update({ status: "escalated", escalated_at: now, escalation_reason: "Leadership joined", staff_read_at: now }).eq("id", threadId);
  else await admin.from("threads").update({ staff_read_at: now }).eq("id", threadId);
}

/** Hands the conversation back to the help bot. */
export async function handBack(threadId: string) {
  await staff();
  const admin = createAdminClient();
  await admin.from("threads").update({ status: "ai", escalation_reason: null }).eq("id", threadId);
  await admin.from("messages").insert({ thread_id: threadId, sender_type: "system", body: "Back to Twelve help. Ask for a person any time." });
}

export async function pollThread(threadId: string) {
  await staff();
  const supabase = await createClient();
  await supabase.rpc("mark_thread_read", { p_thread: threadId });
  const { data: t } = await supabase.from("threads").select("status").eq("id", threadId).single();
  return { messages: await listMessages(threadId), status: (t?.status ?? "ai") as "ai" | "escalated" };
}

/** Opens (or starts) a conversation with a rep from leadership's side. */
export async function openThreadForRep(profileId: string) {
  await staff();
  const admin = createAdminClient();
  const { data: existing } = await admin.from("threads").select("id").eq("profile_id", profileId).maybeSingle();
  const id = existing?.id ?? (await admin.from("threads").insert({ profile_id: profileId }).select("id").single()).data?.id;
  if (!id) throw new Error("Couldn't open the chat.");
  redirect(`/inbox/${id}`);
}

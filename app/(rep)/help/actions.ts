"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { agentReply, escalate, getOrCreateThread, listMessages } from "@/lib/help";

export async function sendHelpMessage(body: string) {
  const profile = await requireProfile();
  const text = body.trim().slice(0, 4000);
  if (!text) return;
  const thread = await getOrCreateThread(profile.id);
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ thread_id: thread.id, sender_type: "rep", sender_id: profile.id, body: text });
  if (error) throw new Error("Didn't send. Try again.");
  // While leadership has the thread, the bot stays quiet.
  if (thread.status === "ai") await agentReply(profile, thread.id);
}

export async function askForPerson() {
  const profile = await requireProfile();
  const thread = await getOrCreateThread(profile.id);
  await escalate(thread.id, "Rep tapped “Talk to a person”.");
}

export async function pollHelp() {
  const profile = await requireProfile();
  const thread = await getOrCreateThread(profile.id);
  const supabase = await createClient();
  await supabase.rpc("mark_thread_read", { p_thread: thread.id });
  return { messages: await listMessages(thread.id), status: thread.status };
}

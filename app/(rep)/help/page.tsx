import { firstName, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateThread, listMessages, type ChatMessage } from "@/lib/help";
import { PageHeader } from "@/components/ui";
import { HelpChat } from "./HelpChat";

export const metadata = { title: "Help" };
// The help bot answers inside the send action; give it time.
export const maxDuration = 60;

export default async function HelpPage() {
  const profile = await requireProfile();
  const thread = await getOrCreateThread(profile.id);
  const supabase = await createClient();
  await supabase.rpc("mark_thread_read", { p_thread: thread.id });
  const messages = await listMessages(thread.id);
  const greeting: ChatMessage = {
    id: "greeting",
    sender_type: "ai",
    body: `Hey ${firstName(profile)}. Ask me anything about the app or your training. If I can't help, I'll bring in the TWELVE leadership team.`,
    created_at: new Date(0).toISOString(),
  };
  return (
    <>
      <PageHeader eyebrow="Help" title="ask away." />
      <HelpChat initial={messages} greeting={greeting} escalated={thread.status === "escalated"} />
    </>
  );
}

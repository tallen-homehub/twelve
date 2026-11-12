import { BottomNav } from "@/components/BottomNav";
import { HelpFab } from "@/components/HelpFab";
import { IconMe, IconPractice, IconRecordings, IconToday, IconTrack } from "@/components/icons";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile(); // any active user; staff can view the rep side too
  const supabase = await createClient();
  const { data: thread } = await supabase.from("threads").select("last_sender, last_message_at, rep_read_at").eq("profile_id", profile.id).maybeSingle();
  const unread = Boolean(thread && thread.last_sender === "staff" && thread.last_message_at > thread.rep_read_at);
  return (
    <>
      <main className="safe-top mx-auto max-w-md px-5 pt-6 pb-28">{children}</main>
      <HelpFab unread={unread} />
      <BottomNav
        items={[
          { href: "/today", label: "Today", icon: <IconToday /> },
          { href: "/track", label: "Track", icon: <IconTrack /> },
          { href: "/practice", label: "Practice", icon: <IconPractice /> },
          { href: "/recordings", label: "Recordings", icon: <IconRecordings /> },
          { href: "/me", label: "Me", icon: <IconMe /> },
        ]}
      />
    </>
  );
}

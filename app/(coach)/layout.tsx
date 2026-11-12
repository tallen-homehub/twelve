import { BottomNav } from "@/components/BottomNav";
import { IconContent, IconInbox, IconQueue, IconReps, IconThemes } from "@/components/icons";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const [{ data: waiting }, { count: drafts }] = await Promise.all([
    supabase.from("threads").select("last_sender, last_message_at, staff_read_at").eq("status", "escalated"),
    supabase.from("coaching_notes").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  const unread = (waiting ?? []).filter((t) => t.last_sender !== "staff" && t.last_message_at > t.staff_read_at).length;
  return (
    <>
      <main className="safe-top mx-auto max-w-md px-5 pt-6 pb-28 md:max-w-3xl">{children}</main>
      <BottomNav
        items={[
          { href: "/queue", label: "Queue", icon: <IconQueue />, badge: drafts ?? 0 },
          { href: "/inbox", label: "Inbox", icon: <IconInbox />, badge: unread },
          { href: "/reps", label: "Reps", icon: <IconReps /> },
          { href: "/themes", label: "Themes", icon: <IconThemes /> },
          { href: "/content", label: "Content", icon: <IconContent /> },
        ]}
      />
    </>
  );
}

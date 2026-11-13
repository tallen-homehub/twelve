import { BottomNav } from "@/components/BottomNav";
import { IconContent, IconInbox, IconMe, IconQueue, IconReps, IconThemes, IconToday } from "@/components/icons";
import type { Role } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Bottom tabs for leadership. Staff (Chase, admins) get the full coach set; team leaders get their team plus their own training. */
export async function LeadNav({ role }: { role: Role }) {
  if (role === "leader") {
    return (
      <BottomNav
        items={[
          { href: "/team", label: "My team", icon: <IconReps /> },
          { href: "/team/themes", label: "Themes", icon: <IconThemes /> },
          { href: "/today", label: "Training", icon: <IconToday /> },
          { href: "/me", label: "Me", icon: <IconMe /> },
        ]}
      />
    );
  }
  const supabase = await createClient();
  const [{ data: waiting }, { count: drafts }] = await Promise.all([
    supabase.from("threads").select("last_sender, last_message_at, staff_read_at").eq("status", "escalated"),
    supabase.from("coaching_notes").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  const unread = (waiting ?? []).filter((t) => t.last_sender !== "staff" && t.last_message_at > t.staff_read_at).length;
  return (
    <BottomNav
      items={[
        { href: "/dashboard", label: "Dashboard", icon: <IconReps /> },
        { href: "/queue", label: "Queue", icon: <IconQueue />, badge: drafts ?? 0 },
        { href: "/inbox", label: "Inbox", icon: <IconInbox />, badge: unread },
        { href: "/themes", label: "Themes", icon: <IconThemes /> },
        { href: "/content", label: "Content", icon: <IconContent /> },
      ]}
    />
  );
}

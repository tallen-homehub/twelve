import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Card } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Inbox" };

type Row = { id: string; status: string; escalation_reason: string | null; last_message_at: string; last_sender: string | null; staff_read_at: string; profile: { full_name: string } | null };

export default async function InboxPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select("id, status, escalation_reason, last_message_at, last_sender, staff_read_at, profile:profiles(full_name)")
    .order("last_message_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];
  const needs = rows.filter((r) => r.status === "escalated");
  const bot = rows.filter((r) => r.status !== "escalated" && r.last_sender);
  const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });

  const item = (r: Row) => {
    const unread = r.last_sender === "rep" && r.last_message_at > r.staff_read_at;
    return (
      <Link key={r.id} href={`/inbox/${r.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-charcoal p-4">
        <div className="min-w-0">
          <p className="truncate font-bold">{r.profile?.full_name ?? "Rep"}</p>
          <p className="truncate text-sm text-muted">{r.status === "escalated" ? (r.escalation_reason ?? "Needs a reply") : "Help bot handled it"}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-xs text-muted">{when(r.last_message_at)}</span>
          {unread && <span className="h-3 w-3 rounded-full bg-red" />}
        </div>
      </Link>
    );
  };

  return (
    <>
      <PageHeader eyebrow="Inbox" title="rep questions." />
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-widest text-tan uppercase">Needs leadership · {needs.length}</h2>
          {needs.length ? needs.map(item) : <Card><p className="text-muted">Nobody waiting on you. When the help bot can&apos;t answer, or a rep asks for a person, it lands here.</p></Card>}
        </section>
        {bot.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-bold tracking-widest text-tan uppercase">Handled by the help bot</h2>
            {bot.map(item)}
          </section>
        )}
      </div>
      <AutoRefresh seconds={20} />
    </>
  );
}

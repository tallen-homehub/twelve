import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listMessages } from "@/lib/help";
import { StaffChat } from "./StaffChat";

export const metadata = { title: "Conversation" };

export default async function InboxThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data: t } = await supabase.from("threads").select("id, status, escalation_reason, profile:profiles(full_name, rep_type, phone)").eq("id", id).maybeSingle();
  if (!t) notFound();
  await supabase.rpc("mark_thread_read", { p_thread: id });
  const rep = t.profile as unknown as { full_name: string; rep_type: string | null } | null;
  const messages = await listMessages(id);
  return (
    <>
      <Link href="/inbox" className="py-2 text-sm text-muted">
        ← Inbox
      </Link>
      <header className="flex flex-col gap-1 pb-4">
        <p className="text-xs font-bold tracking-widest text-tan uppercase">
          {rep?.rep_type?.replace("_", "-") ?? "rep"} · {t.status === "escalated" ? "needs leadership" : "help bot answering"}
        </p>
        <h1 className="font-display text-3xl font-black uppercase">{rep?.full_name ?? "rep"}</h1>
        {t.status === "escalated" && t.escalation_reason && <p className="text-sm text-muted">Why: {t.escalation_reason}</p>}
      </header>
      <StaffChat threadId={id} initial={messages} status={t.status as "ai" | "escalated"} />
    </>
  );
}

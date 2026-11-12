import Link from "next/link";
import { firstName, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mmss } from "@/lib/format";
import { STAFF_STATUS } from "@/lib/recording-status";
import { Card, PageHeader } from "@/components/ui";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata = { title: "Coaching queue" };

type Rec = { id: string; setting: string; label: string | null; status: string; duration_s: number | null; created_at: string; profile: { full_name: string } | null };

export default async function QueuePage() {
  const p = await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const [{ data: drafts }, { data: attention }, { data: working }] = await Promise.all([
    supabase
      .from("coaching_notes")
      .select("id, overall_score, ai_output, created_at, recording:recordings(id, setting, label, duration_s), profile:profiles(full_name)")
      .eq("status", "draft")
      .order("created_at", { ascending: true }),
    supabase.from("recordings").select("id, setting, label, status, duration_s, created_at, profile:profiles(full_name)").in("status", ["needs_consent_review", "failed"]).order("created_at"),
    supabase.from("recordings").select("id, setting, label, status, duration_s, created_at, profile:profiles(full_name)").in("status", ["uploaded", "transcribing", "analyzing"]).order("created_at"),
  ]);

  return (
    <>
      <PageHeader eyebrow="Coaching queue" title={`what's up, ${firstName(p).toLowerCase()}.`} />
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-widest text-tan uppercase">Ready for review · {drafts?.length ?? 0}</h2>
          {!drafts?.length && (
            <Card>
              <p className="text-muted">Nothing waiting. When a rep uploads a recording, the AI drafts notes here for you to approve.</p>
            </Card>
          )}
          {drafts?.map((d) => {
            const rec = d.recording as unknown as { id: string; setting: string; label: string | null; duration_s: number | null };
            const reds = ((d.ai_output as { moments?: { severity: string }[] }).moments ?? []).filter((m) => m.severity === "red").length;
            return (
              <Link key={d.id} href={`/queue/${rec.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-charcoal p-4">
                <div className="min-w-0">
                  <p className="truncate font-bold">{(d.profile as unknown as { full_name: string }).full_name}</p>
                  <p className="text-sm text-muted">
                    {rec.setting} · {rec.duration_s ? mmss(rec.duration_s) : "?"} {rec.label ? `· ${rec.label}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {reds > 0 && <span className="rounded-full bg-red px-2 py-0.5 text-xs font-bold text-ink">{reds} red</span>}
                  <span className="font-display text-3xl font-black text-tan">{d.overall_score}</span>
                </div>
              </Link>
            );
          })}
        </section>

        <RecList title="Needs you" recs={(attention ?? []) as unknown as Rec[]} />
        <RecList title="Processing" recs={(working ?? []) as unknown as Rec[]} />
        {(working?.length ?? 0) > 0 && <AutoRefresh seconds={20} />}

        <Link href="/today" className="rounded-xl bg-charcoal px-5 py-4 text-center font-bold">
          See the rep view
        </Link>
      </div>
    </>
  );
}

function RecList({ title, recs }: { title: string; recs: Rec[] }) {
  if (!recs.length) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-bold tracking-widest text-tan uppercase">
        {title} · {recs.length}
      </h2>
      {recs.map((r) => (
        <Link key={r.id} href={`/queue/${r.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-charcoal p-4">
          <div className="min-w-0">
            <p className="truncate font-bold">{r.profile?.full_name ?? "Rep"}</p>
            <p className="text-sm text-muted">
              {r.setting}
              {r.label ? ` · ${r.label}` : ""}
            </p>
          </div>
          <span className={`shrink-0 text-sm font-semibold ${r.status === "failed" || r.status === "needs_consent_review" ? "text-red" : "text-muted"}`}>{STAFF_STATUS[r.status]}</span>
        </Link>
      ))}
    </section>
  );
}

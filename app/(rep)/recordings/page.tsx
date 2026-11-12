import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mmss } from "@/lib/format";
import { REP_STATUS } from "@/lib/recording-status";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Recordings" };

export default async function RecordingsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: recs }, { data: notes }] = await Promise.all([
    supabase.from("recordings").select("id, setting, label, status, duration_s, recorded_at, created_at").eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("coaching_notes").select("recording_id, overall_score").eq("profile_id", profile.id).eq("status", "released"),
  ]);
  const score = new Map((notes ?? []).map((n) => [n.recording_id, n.overall_score]));

  return (
    <>
      <PageHeader eyebrow="Field recordings" title="recordings." />
      <div className="flex flex-col gap-4">
        <ButtonLink href="/recordings/new">Upload a recording</ButtonLink>
        {!recs?.length ? (
          <Card>
            <p className="text-muted">Record a real door or table conversation (with the homeowner&apos;s okay), upload it here, and Chase sends back timestamped coaching.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {recs.map((r) => {
              const s = score.get(r.id);
              return (
                <li key={r.id}>
                  <Link href={`/recordings/${r.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-charcoal p-4">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{r.label || (r.setting === "door" ? "Door" : "Table")}</p>
                      <p className="text-sm text-muted">
                        {new Date(r.recorded_at ?? r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" })}
                        {r.duration_s ? ` · ${mmss(r.duration_s)}` : ""} · {r.setting}
                      </p>
                    </div>
                    {s != null ? (
                      <span className="font-display text-3xl font-black text-tan">{s}</span>
                    ) : (
                      <span className={`shrink-0 text-sm font-semibold ${r.status === "failed" ? "text-red" : "text-muted"}`}>{REP_STATUS[r.status] ?? r.status}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

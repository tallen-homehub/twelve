import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { driveConfigured } from "@/lib/brain/drive";
import { Card, PageHeader } from "@/components/ui";
import { BrainButton } from "./BrainButton";

export const metadata = { title: "Content" };
// Syncing embeds every new or changed file; give it time.
export const maxDuration = 300;

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });

export default async function ContentPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  // Staff checked above; the service role reads counts and file names only.
  const admin = createAdminClient();
  const [{ count: chunks }, { data: sources }, l, q, p, s, d] = await Promise.all([
    admin.from("content_chunks").select("id", { count: "exact", head: true }),
    admin.from("brain_sources").select("source_key, title, url, status, error, chunks, synced_at").order("title"),
    supabase.from("lessons").select("is_draft_content"),
    supabase.from("quizzes").select("id", { count: "exact", head: true }),
    supabase.from("personas").select("id", { count: "exact", head: true }),
    supabase.from("skills").select("id", { count: "exact", head: true }),
    supabase.from("tracks").select("name, total_days").eq("published", true),
  ]);
  const drafts = (l.data ?? []).filter((x) => x.is_draft_content).length;
  const tiles = [
    { href: "/content/track", label: "Tracks", big: String((d.data ?? []).length), sub: "Weeks, days and what's on each day" },
    { href: "/content/lessons", label: "Lessons", big: String((l.data ?? []).length), sub: drafts ? `${drafts} still placeholder drafts` : "All yours" },
    { href: "/content/quizzes", label: "Quizzes", big: String(q.count ?? 0), sub: "Questions, answers, pass marks" },
    { href: "/content/homeowners", label: "Homeowners", big: String(p.count ?? 0), sub: "AI role play personas" },
    { href: "/content/rubric", label: "Rubric", big: String(s.count ?? 0), sub: "The skills every score uses" },
  ];

  return (
    <>
      <PageHeader eyebrow="Content" title="Build the track." />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {tiles.map((t) => (
            <Link key={t.href} href={t.href} className="flex flex-col gap-1 rounded-sm bg-charcoal p-4">
              <span className="label">{t.label}</span>
              <span className="font-cond text-5xl">{t.big}</span>
              <span className="text-xs text-muted">{t.sub}</span>
            </Link>
          ))}
        </div>

        <Card>
          <p className="eyebrow">The brain · {chunks ?? 0} pieces</p>
          <p className="mt-2">What the help bot answers from: the Google Drive &ldquo;Twelve Brain&rdquo; folder, plus the app guide, lessons, skills and practice homeowners. It rebuilds itself when you save content here.</p>
          {driveConfigured() ? (
            <div className="mt-4 flex flex-col gap-3">
              <BrainButton kind="drive" />
              <BrainButton kind="app" />
            </div>
          ) : (
            <div className="mt-4">
              <BrainButton kind="app" />
            </div>
          )}
        </Card>

        {sources && sources.length > 0 && (
          <Card>
            <p className="label mb-3">From Drive · {sources.length} files</p>
            <ul className="flex flex-col gap-3 text-sm">
              {sources.map((x) => (
                <li key={x.source_key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {x.url ? (
                      <a href={x.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                        {x.title}
                      </a>
                    ) : (
                      <span className="font-semibold">{x.title}</span>
                    )}
                    {x.status !== "ok" && <p className={x.status === "error" ? "text-red" : "text-muted"}>{x.error}</p>}
                  </div>
                  <span className="shrink-0 text-muted">{x.status === "ok" ? `${x.chunks} pcs · ${when(x.synced_at)}` : x.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { driveConfigured } from "@/lib/brain/drive";
import { Card, ComingSoon, PageHeader } from "@/components/ui";
import { BrainButton } from "./BrainButton";

export const metadata = { title: "Content" };
// Syncing embeds every new or changed file; give it time.
export const maxDuration = 300;

const when = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" });

export default async function ContentPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  // Staff checked above; the service role reads counts and file names only.
  const admin = createAdminClient();
  const [{ count }, { data: sources }] = await Promise.all([
    admin.from("content_chunks").select("id", { count: "exact", head: true }),
    admin.from("brain_sources").select("source_key, title, url, status, error, chunks, synced_at").order("title"),
  ]);
  const connected = driveConfigured();

  return (
    <>
      <PageHeader eyebrow="Content" title="build the track." />
      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">The brain · {count ?? 0} pieces</p>
          <p className="mt-2">What the help bot answers from: the Google Drive &ldquo;Twelve Brain&rdquo; folder, plus the app guide, lessons, skills and practice homeowners.</p>
          {connected ? (
            <>
              <p className="mt-2 text-sm text-muted">
                Drop Google Docs, Slides, Sheets, PDFs or Word files in the folder. It syncs every morning, or tap sync. Images, audio and video aren&apos;t read yet.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <BrainButton kind="drive" />
                <BrainButton kind="app" />
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">Google Drive isn&apos;t connected yet. The app content is in the brain already.</p>
              <div className="mt-4">
                <BrainButton kind="app" />
              </div>
            </>
          )}
        </Card>

        {sources && sources.length > 0 && (
          <Card>
            <p className="mb-3 text-xs font-bold tracking-widest text-tan uppercase">From Drive · {sources.length} files</p>
            <ul className="flex flex-col gap-3 text-sm">
              {sources.map((s) => (
                <li key={s.source_key} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold underline-offset-2 hover:underline">
                        {s.title}
                      </a>
                    ) : (
                      <span className="font-semibold">{s.title}</span>
                    )}
                    {s.status !== "ok" && <p className={s.status === "error" ? "text-red" : "text-muted"}>{s.error}</p>}
                  </div>
                  <span className="shrink-0 text-muted">{s.status === "ok" ? `${s.chunks} pcs · ${when(s.synced_at)}` : s.status}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <ComingSoon day="later this week" what="Tracks, lessons, quizzes, homeowner personas and your scoring rubric." />
      </div>
    </>
  );
}

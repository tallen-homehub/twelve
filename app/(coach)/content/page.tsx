import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, ComingSoon, PageHeader } from "@/components/ui";
import { BrainButton } from "./BrainButton";

export const metadata = { title: "Content" };
// Rebuilding the brain embeds every source; give it time.
export const maxDuration = 120;

export default async function ContentPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  // Counts only (no content), so the service role here is safe after the staff check.
  const admin = createAdminClient();
  const [{ count }, { data: latest }] = await Promise.all([
    admin.from("content_chunks").select("id", { count: "exact", head: true }),
    admin.from("content_chunks").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Content" title="build the track." />
      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">The brain</p>
          <p className="mt-2">
            What the help bot answers from: the app guide, lessons, skills and practice homeowners. {count ? `${count} pieces` : "Empty"}
            {latest?.created_at ? `, last rebuilt ${new Date(latest.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })}` : ""}.
          </p>
          <p className="mt-2 text-sm text-muted">Google Drive &ldquo;Twelve Brain&rdquo; folder sync is next. Rebuild after changing lessons.</p>
          <div className="mt-4">
            <BrainButton />
          </div>
        </Card>
        <ComingSoon day="later this week" what="Tracks, lessons, quizzes, homeowner personas and your scoring rubric." />
      </div>
    </>
  );
}

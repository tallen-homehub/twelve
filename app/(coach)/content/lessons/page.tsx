import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Lessons" };

export default async function LessonsPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data: lessons } = await supabase.from("lessons").select("id, title, module, is_draft_content, published, video_url").order("title");
  return (
    <>
      <Link href="/content" className="flex min-h-12 items-center text-sm text-muted">
        ← Content
      </Link>
      <PageHeader eyebrow="Content" title="Lessons." />
      <Link href="/content/lessons/new" className="mb-4 flex min-h-12 items-center justify-center rounded-sm bg-bone font-display text-[15px] font-extrabold tracking-[0.28em] text-ink uppercase">
        + New lesson
      </Link>
      <ul className="flex flex-col gap-2">
        {(lessons ?? []).map((l) => (
          <li key={l.id}>
            <Link href={`/content/lessons/${l.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-sm bg-charcoal px-4 py-3">
              <span className="min-w-0 truncate font-semibold">{l.title}</span>
              <span className="flex shrink-0 gap-1.5 text-[10px] font-bold tracking-widest uppercase">
                {l.video_url && <span className="rounded-sm bg-charcoal-2 px-2 py-1 text-tan">Video</span>}
                {l.is_draft_content && <span className="rounded-sm bg-charcoal-2 px-2 py-1 text-muted">Draft</span>}
                {!l.published && <span className="rounded-sm bg-red/30 px-2 py-1">Hidden</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

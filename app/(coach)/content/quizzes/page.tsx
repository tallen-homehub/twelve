import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Quizzes" };

export default async function QuizzesPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data: quizzes } = await supabase.from("quizzes").select("id, title, kind, pass_pct, published, quiz_questions(count)").order("kind").order("title");
  return (
    <>
      <Link href="/content" className="flex min-h-12 items-center text-sm text-muted">
        ← Content
      </Link>
      <PageHeader eyebrow="Content" title="Quizzes." />
      <Link href="/content/quizzes/new" className="mb-4 flex min-h-12 items-center justify-center rounded-sm bg-bone font-display text-[15px] font-extrabold tracking-[0.28em] text-ink uppercase">
        + New quiz
      </Link>
      <ul className="flex flex-col gap-2">
        {(quizzes ?? []).map((q) => (
          <li key={q.id}>
            <Link href={`/content/quizzes/${q.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-sm bg-charcoal px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{q.title}</span>
                <span className="text-xs text-muted">
                  {(q.quiz_questions as unknown as { count: number }[])[0]?.count ?? 0} questions · pass {q.pass_pct}%
                </span>
              </span>
              <span className="flex shrink-0 gap-1.5 text-[10px] font-bold tracking-widest uppercase">
                {q.kind === "assessment" && <span className="rounded-sm bg-tan px-2 py-1 text-ink">Weekly test</span>}
                {!q.published && <span className="rounded-sm bg-red/30 px-2 py-1">Hidden</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

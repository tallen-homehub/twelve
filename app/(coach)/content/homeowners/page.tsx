import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Homeowners" };

export default async function HomeownersPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data: personas } = await supabase.from("personas").select("id, name, setting, difficulty, published").order("setting").order("difficulty");
  return (
    <>
      <Link href="/content" className="flex min-h-12 items-center text-sm text-muted">
        ← Content
      </Link>
      <PageHeader eyebrow="Content" title="Homeowners." />
      <p className="-mt-2 mb-4 text-sm text-muted">The people reps practice on. Each one has a story, an opening line and the objections they throw.</p>
      <Link href="/content/homeowners/new" className="mb-4 flex min-h-12 items-center justify-center rounded-sm bg-bone font-display text-[15px] font-extrabold tracking-[0.28em] text-ink uppercase">
        + New homeowner
      </Link>
      <ul className="flex flex-col gap-2">
        {(personas ?? []).map((p) => (
          <li key={p.id}>
            <Link href={`/content/homeowners/${p.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-sm bg-charcoal px-4 py-3">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.name}</span>
                <span className="text-xs text-muted">
                  {p.setting === "door" ? "At the door" : "At the table"} · {"●".repeat(p.difficulty)}
                  {"○".repeat(5 - p.difficulty)}
                </span>
              </span>
              {!p.published && <span className="shrink-0 rounded-sm bg-red/30 px-2 py-1 text-[10px] font-bold tracking-widest uppercase">Hidden</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

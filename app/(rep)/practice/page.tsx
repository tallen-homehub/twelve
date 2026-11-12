import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Practice" };

export default async function PracticePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const [{ data: personas }, { data: recent }] = await Promise.all([
    supabase.from("personas").select("slug, name, setting, difficulty, opening_line").eq("published", true).order("setting").order("difficulty"),
    supabase
      .from("roleplay_sessions")
      .select("id, started_at, status, persona:personas(name), score:roleplay_scores(overall)")
      .eq("profile_id", profile.id)
      .in("status", ["scored"])
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const groups = [
    { key: "door", label: "At the door" },
    { key: "table", label: "At the table" },
  ];

  return (
    <>
      <PageHeader eyebrow="Role play" title="practice." />
      <div className="flex flex-col gap-8">
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="mb-3 text-xs font-bold tracking-widest text-tan uppercase">{g.label}</h2>
            <div className="flex flex-col gap-3">
              {(personas ?? [])
                .filter((p) => p.setting === g.key)
                .map((p) => (
                  <Link key={p.slug} href={`/practice/${p.slug}`} className="block rounded-2xl bg-charcoal p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{p.name}</p>
                      <span className="text-sm text-tan" aria-label={`Difficulty ${p.difficulty} of 5`}>
                        {"●".repeat(p.difficulty)}
                        <span className="text-charcoal-2">{"●".repeat(5 - p.difficulty)}</span>
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted italic">&ldquo;{p.opening_line}&rdquo;</p>
                  </Link>
                ))}
            </div>
          </section>
        ))}

        {recent && recent.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-bold tracking-widest text-tan uppercase">Your recent runs</h2>
            <div className="flex flex-col gap-2">
              {recent.map((r) => {
                const score = (r.score as unknown as { overall: number } | null)?.overall;
                return (
                  <Link key={r.id} href={`/practice/session/${r.id}/results`} className="flex items-center justify-between rounded-xl bg-charcoal px-4 py-3">
                    <span className="truncate">{(r.persona as unknown as { name: string })?.name}</span>
                    <span className="font-display text-xl font-black text-tan">{score ?? "–"}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

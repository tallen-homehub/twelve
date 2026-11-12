import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";
import { startSession } from "../actions";

export default async function PersonaBriefPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ task?: string }> }) {
  const [{ slug }, { task }] = await Promise.all([params, searchParams]);
  await requireProfile();
  const supabase = await createClient();
  const { data: p } = await supabase.from("personas").select("id, name, setting, difficulty, backstory, success_condition").eq("slug", slug).single();
  if (!p) notFound();

  const { data: skills } = await supabase.from("skills").select("name").in("stage", [p.setting, "compliance"]).order("position");

  return (
    <>
      <Link href="/practice" className="mb-4 inline-block py-2 text-sm text-muted">
        ← Practice
      </Link>
      <PageHeader eyebrow={`${p.setting === "door" ? "At the door" : "At the table"} · difficulty ${p.difficulty}/5`} title={p.name.toLowerCase()} />
      <div className="flex flex-col gap-4">
        <Card>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">What you know</p>
          {/* Only the first sentence: the rest is what the rep has to uncover. */}
          <p className="mt-2">{(p.backstory ?? "").split(/(?<=\.)\s/)[0]}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">You win if you get them to</p>
          <p className="mt-2">{p.success_condition}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold tracking-widest text-tan uppercase">You&apos;ll be scored on</p>
          <p className="mt-2 text-sm text-muted">{(skills ?? []).map((s) => s.name).join(" · ")}</p>
        </Card>

        <form action={startSession} className="flex flex-col gap-3 pt-2">
          <input type="hidden" name="persona_id" value={p.id} />
          {task && <input type="hidden" name="task_id" value={task} />}
          <button name="mode" value="voice" className="min-h-14 rounded-xl bg-tan px-5 py-4 text-lg font-bold text-ink">
            Start by voice
          </button>
          <button name="mode" value="text" className="min-h-12 rounded-xl bg-charcoal px-5 py-4 font-bold">
            Type instead
          </button>
        </form>
        <p className="text-center text-xs text-muted">Voice needs your microphone. Find a quiet spot.</p>
      </div>
    </>
  );
}

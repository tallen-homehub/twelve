import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { SkillsForm, type Skill } from "./SkillsForm";

export const metadata = { title: "Rubric" };

export default async function RubricPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const { data } = await supabase.from("skills").select("id, name, stage, description, what_good_sounds_like").order("position");
  const skills: Skill[] = (data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    stage: s.stage as Skill["stage"],
    description: s.description ?? "",
    what_good_sounds_like: s.what_good_sounds_like ?? "",
  }));
  return (
    <>
      <Link href="/content" className="flex min-h-12 items-center text-sm text-muted">
        ← Content
      </Link>
      <PageHeader eyebrow="Content" title="Rubric." />
      <p className="-mt-2 mb-4 text-sm text-muted">The skills every roleplay and recording gets scored on. Change the wording and the next score uses it.</p>
      <SkillsForm skills={skills} />
    </>
  );
}

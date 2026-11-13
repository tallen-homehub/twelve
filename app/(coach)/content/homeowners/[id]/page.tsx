import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { PersonaForm, type Persona } from "./PersonaForm";

export const metadata = { title: "Homeowner" };

export default async function HomeownerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["coach", "admin"] });
  const isNew = id === "new";
  const supabase = await createClient();
  const { data: p } = isNew
    ? { data: null }
    : await supabase.from("personas").select("slug, name, setting, difficulty, backstory, opening_line, objections, success_condition, start_trust, voice_id, published").eq("id", id).maybeSingle();
  if (!isNew && !p) notFound();
  const persona: Persona = {
    name: p?.name ?? "",
    setting: (p?.setting as Persona["setting"]) ?? "door",
    difficulty: p?.difficulty ?? 2,
    backstory: p?.backstory ?? "",
    opening_line: p?.opening_line ?? "",
    objections: Array.isArray(p?.objections) ? (p.objections as unknown[]).map(String) : [""],
    success_condition: p?.success_condition ?? "",
    start_trust: p?.start_trust ?? 4,
    voice_id: (p?.voice_id as Persona["voice_id"]) ?? null,
    published: p?.published ?? true,
  };
  return (
    <>
      <Link href="/content/homeowners" className="flex min-h-12 items-center text-sm text-muted">
        ← Homeowners
      </Link>
      <PageHeader eyebrow={isNew ? "New homeowner" : "Homeowner"} title={isNew ? "New homeowner." : `${persona.name}.`} />
      <PersonaForm id={isNew ? null : id} slug={p?.slug ?? null} persona={persona} />
    </>
  );
}

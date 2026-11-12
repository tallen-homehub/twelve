import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { prettyPhone } from "@/lib/phone";
import { PageHeader } from "@/components/ui";
import { EditPerson } from "./EditPerson";

export const metadata = { title: "Edit" };

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const [{ data: person }, { data: leaders }, { data: tracks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, rep_type, role, leader_id, track_id, status").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, full_name").eq("role", "leader").in("status", ["active", "invited"]).order("full_name"),
    supabase.from("tracks").select("id, name").eq("published", true).order("name"),
  ]);
  if (!person) notFound();
  return (
    <>
      <Link href={`/reps/${id}`} className="flex min-h-12 items-center text-sm text-muted">
        ← Back
      </Link>
      <PageHeader eyebrow={person.phone ? prettyPhone(person.phone) : "Roster"} title={person.full_name || "Edit"} />
      <EditPerson
        person={person}
        leaders={(leaders ?? []).map((l) => ({ id: l.id, name: l.full_name }))}
        tracks={(tracks ?? []).map((t) => ({ id: t.id, name: t.name }))}
        isAdmin={me.role === "admin"}
      />
    </>
  );
}

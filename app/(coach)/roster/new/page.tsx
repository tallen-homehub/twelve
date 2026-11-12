import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui";
import { AddPeople } from "./AddPeople";

export const metadata = { title: "Add to the team" };

export default async function AddPeoplePage() {
  const me = await requireProfile({ roles: ["coach", "admin"] });
  const supabase = await createClient();
  const [{ data: leaders }, { data: tracks }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "leader").eq("status", "active").order("full_name"),
    supabase.from("tracks").select("id, name").eq("published", true).order("name"),
  ]);
  return (
    <>
      <Link href="/dashboard" className="flex min-h-12 items-center text-sm text-muted">
        ← Dashboard
      </Link>
      <PageHeader eyebrow="Roster" title="Add to the team." />
      <p className="-mt-3 mb-6 text-muted">Only invited phone numbers can get into the app. Add someone here, then send them the link. They log in with a text code.</p>
      <AddPeople leaders={(leaders ?? []).map((l) => ({ id: l.id, name: l.full_name }))} tracks={(tracks ?? []).map((t) => ({ id: t.id, name: t.name }))} isAdmin={me.role === "admin"} />
    </>
  );
}

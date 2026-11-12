"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePerson } from "@/app/(coach)/roster/actions";
import { Button, Field } from "@/components/ui";

type Opt = { id: string; name: string };
type Person = { id: string; full_name: string; rep_type: string | null; role: string; leader_id: string | null; track_id: string | null; status: string };
const input = "w-full rounded-sm border border-charcoal-2 bg-charcoal px-4 py-3 text-base outline-none ring-tan focus:ring-2";

export function EditPerson({ person, leaders, tracks, isAdmin }: { person: Person; leaders: Opt[]; tracks: Opt[]; isAdmin: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({
    fullName: person.full_name,
    repType: person.rep_type ?? "setter",
    role: person.role,
    leaderId: person.leader_id ?? "",
    trackId: person.track_id ?? "",
    status: person.status === "invited" ? "active" : person.status,
    restartTrack: false,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  return (
    <div className="flex flex-col gap-4">
      <Field label="Full name">
        <input value={f.fullName} onChange={set("fullName")} className={input} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rep type">
          <select value={f.repType} onChange={set("repType")} className={input}>
            <option value="setter">Setter</option>
            <option value="closer">Closer</option>
            <option value="self_gen">Self-gen</option>
          </select>
        </Field>
        <Field label="Role">
          <select value={f.role} onChange={set("role")} className={input} disabled={!isAdmin && (person.role === "coach" || person.role === "admin")}>
            <option value="rep">Rep</option>
            <option value="leader">Team leader</option>
            {(isAdmin || person.role === "coach") && <option value="coach">Coach</option>}
            {(isAdmin || person.role === "admin") && <option value="admin">Admin</option>}
          </select>
        </Field>
        <Field label="Team leader">
          <select value={f.leaderId} onChange={set("leaderId")} className={input} disabled={f.role !== "rep"}>
            <option value="">None</option>
            {leaders
              .filter((l) => l.id !== person.id)
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Track">
          <select value={f.trackId} onChange={set("trackId")} className={input}>
            <option value="">No track</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Status">
        <select value={f.status} onChange={set("status")} className={input}>
          <option value="active">Active</option>
          <option value="paused">Paused (can&apos;t log in, data kept)</option>
          <option value="left">Left the team (can&apos;t log in, data kept)</option>
        </select>
      </Field>
      <label className="flex min-h-12 items-center gap-3 rounded-sm bg-charcoal px-4">
        <input type="checkbox" checked={f.restartTrack} onChange={set("restartTrack")} className="h-5 w-5 accent-tan" />
        <span>Restart their track at day 1 today</span>
      </label>
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await updatePerson(person.id, f);
            setMsg({ ok: r.ok, text: r.message });
            if (r.ok) router.refresh();
          })
        }
      >
        {pending ? "Saving…" : "Save"}
      </Button>
      {msg && <p className={msg.ok ? "text-good" : "text-red"}>{msg.text}</p>}
    </div>
  );
}

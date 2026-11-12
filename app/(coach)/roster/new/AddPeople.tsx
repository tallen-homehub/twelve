"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { invitePeople, type RosterResult } from "../actions";
import { Button, Field } from "@/components/ui";

type Opt = { id: string; name: string };
const input = "w-full rounded-sm border border-charcoal-2 bg-charcoal px-4 py-3 text-base outline-none ring-tan focus:ring-2";
const TYPES = [
  { v: "setter", label: "Setter" },
  { v: "closer", label: "Closer" },
  { v: "self_gen", label: "Self-gen" },
];

/** Add one person, or paste a list ("Name, phone" per line). Shared settings apply to everyone pasted. */
export function AddPeople({ leaders, tracks, isAdmin }: { leaders: Opt[]; tracks: Opt[]; isAdmin: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"one" | "list">("one");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [list, setList] = useState("");
  const [repType, setRepType] = useState("setter");
  const [role, setRole] = useState("rep");
  const [leaderId, setLeaderId] = useState("");
  const [trackId, setTrackId] = useState("");
  const [result, setResult] = useState<RosterResult | null>(null);
  const [pending, start] = useTransition();

  const parsed = list
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const parts = l.split(/\t|,|;/).map((x) => x.trim());
      const ph = parts.find((x) => x.replace(/\D/g, "").length >= 10) ?? "";
      const nm = parts.filter((x) => x !== ph).join(" ").trim();
      return { name: nm, phone: ph };
    });

  const submit = () =>
    start(async () => {
      const people = (mode === "one" ? [{ name, phone }] : parsed).map((p) => ({ ...p, repType, role, leaderId, trackId }));
      const r = await invitePeople(people);
      setResult(r);
      if (r.ok && r.added) {
        setName("");
        setPhone("");
        setList("");
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-2 rounded-sm bg-charcoal p-1">
        {(["one", "list"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} className={`min-h-12 rounded-sm text-sm font-bold ${mode === m ? "bg-bone text-ink" : "text-muted"}`}>
            {m === "one" ? "One person" : "Paste a list"}
          </button>
        ))}
      </div>

      {mode === "one" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Jordan Pike" autoComplete="off" />
          </Field>
          <Field label="Cell phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="(951) 555-0142" inputMode="tel" autoComplete="off" />
          </Field>
        </div>
      ) : (
        <Field label="One person per line: name, phone">
          <textarea
            rows={8}
            value={list}
            onChange={(e) => setList(e.target.value)}
            className={`${input} font-mono text-sm`}
            placeholder={"Jordan Pike, 951-555-0142\nKayla Nguyen, (714) 555-0199"}
          />
          {parsed.length > 0 && <span className="text-sm text-muted">{parsed.length} people · copied straight from a spreadsheet works too</span>}
        </Field>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-muted">Rep type</span>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map((t) => (
            <button key={t.v} type="button" onClick={() => setRepType(t.v)} className={`min-h-12 rounded-sm text-sm font-bold ${repType === t.v ? "bg-tan text-ink" : "bg-charcoal"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value)} className={input}>
            <option value="rep">Rep</option>
            <option value="leader">Team leader</option>
            {isAdmin && <option value="coach">Coach (full leadership access)</option>}
            {isAdmin && <option value="admin">Admin</option>}
          </select>
        </Field>
        <Field label="Team leader">
          <select value={leaderId} onChange={(e) => setLeaderId(e.target.value)} className={input} disabled={role !== "rep"}>
            <option value="">None yet</option>
            {leaders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Track">
          <select value={trackId} onChange={(e) => setTrackId(e.target.value)} className={input}>
            <option value="">Default for their type</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Button onClick={submit} disabled={pending || (mode === "one" ? !name || !phone : !parsed.length)}>
        {pending ? "Adding…" : mode === "one" ? "Add to the team" : `Add ${parsed.length || ""} to the team`}
      </Button>

      {result && (
        <div className={`rounded-sm p-4 text-sm ${result.ok ? "bg-good/15" : "bg-red/20"}`}>
          <p className="font-semibold">{result.message}</p>
          {result.ok && !!result.added && <p className="mt-1 text-muted">They can log in now with their phone number. Text them the link: twelve-hazel.vercel.app</p>}
          {!!result.skipped?.length && (
            <ul className="mt-2 ml-4 list-disc text-muted">
              {result.skipped.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

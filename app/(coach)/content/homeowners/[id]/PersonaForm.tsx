"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePersona } from "@/app/actions/content";
import { inputCls, L, RowButtons, SaveBar, Toggle } from "@/components/content/kit";

const VOICES = ["coral", "shimmer", "ash", "marin", "cedar", "sage", "verse", "ballad"] as const;
export type Persona = {
  name: string;
  setting: "door" | "table";
  difficulty: number;
  backstory: string;
  opening_line: string;
  objections: string[];
  success_condition: string;
  start_trust: number;
  voice_id: (typeof VOICES)[number] | null;
  published: boolean;
};

export function PersonaForm({ id, slug, persona }: { id: string | null; slug: string | null; persona: Persona }) {
  const router = useRouter();
  const [f, setF] = useState<Persona>(persona);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const r = await savePersona(id, { ...f, objections: f.objections.map((o) => o.trim()).filter(Boolean) });
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok && !id && r.id) router.replace(`/content/homeowners/${r.id}`);
      else if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5 pb-4">
      <L label="Name" hint='How reps will see them, e.g. "Busy Brenda".'>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
      </L>
      <div className="grid grid-cols-2 gap-4">
        <L label="Where">
          <select value={f.setting} onChange={(e) => setF({ ...f, setting: e.target.value as Persona["setting"] })} className={inputCls}>
            <option value="door">At the door (setters)</option>
            <option value="table">At the table (closers)</option>
          </select>
        </L>
        <L label="Voice">
          <select value={f.voice_id ?? ""} onChange={(e) => setF({ ...f, voice_id: (e.target.value || null) as Persona["voice_id"] })} className={inputCls}>
            <option value="">Default</option>
            {VOICES.map((v) => (
              <option key={v} value={v}>
                {v[0].toUpperCase() + v.slice(1)}
              </option>
            ))}
          </select>
        </L>
      </div>
      <L label={`Difficulty: ${f.difficulty} of 5`}>
        <input type="range" min={1} max={5} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: Number(e.target.value) })} className="h-12 accent-tan" />
      </L>
      <L label={`Starting trust: ${f.start_trust} of 10`} hint="Lower means colder at the start.">
        <input type="range" min={0} max={10} value={f.start_trust} onChange={(e) => setF({ ...f, start_trust: Number(e.target.value) })} className="h-12 accent-tan" />
      </L>
      <L label="Who they are" hint="Job, family, bills, mood today, what they care about. The AI plays this person.">
        <textarea rows={6} value={f.backstory} onChange={(e) => setF({ ...f, backstory: e.target.value })} className={inputCls} />
      </L>
      <L label="First thing they say">
        <input value={f.opening_line} onChange={(e) => setF({ ...f, opening_line: e.target.value })} className={inputCls} />
      </L>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-muted">Objections they throw</span>
        {f.objections.map((o, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={o} onChange={(e) => setF({ ...f, objections: f.objections.map((x, j) => (j === i ? e.target.value : x)) })} className={inputCls} placeholder={'e.g. "We already looked into solar."'} />
            <RowButtons onRemove={() => setF({ ...f, objections: f.objections.filter((_, j) => j !== i) })} />
          </div>
        ))}
        {f.objections.length < 12 && (
          <button type="button" onClick={() => setF({ ...f, objections: [...f.objections, ""] })} className="min-h-10 self-start px-1 text-sm font-semibold text-tan">
            + Objection
          </button>
        )}
      </div>

      <L label="What counts as a win" hint='e.g. "Agrees to a time for the consultation."'>
        <input value={f.success_condition} onChange={(e) => setF({ ...f, success_condition: e.target.value })} className={inputCls} />
      </L>
      <Toggle checked={f.published} onChange={(v) => setF({ ...f, published: v })} label="Show in Practice" />
      <SaveBar pending={pending} onSave={save} msg={msg} viewHref={slug ? `/practice/${slug}` : undefined} viewLabel="Try it" />
    </div>
  );
}

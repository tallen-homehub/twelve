"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSkills } from "@/app/actions/content";
import { inputCls, L, move, RowButtons, SaveBar } from "@/components/content/kit";

export type Skill = { id: string | null; name: string; stage: "door" | "table" | "mindset" | "compliance"; description: string; what_good_sounds_like: string };
const STAGES: { v: Skill["stage"]; label: string }[] = [
  { v: "door", label: "Door" },
  { v: "table", label: "Table" },
  { v: "mindset", label: "Mindset" },
  { v: "compliance", label: "Compliance" },
];

export function SkillsForm({ skills }: { skills: Skill[] }) {
  const router = useRouter();
  const [list, setList] = useState<Skill[]>(skills);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<Skill>) => setList(list.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const save = () =>
    start(async () => {
      const r = await saveSkills(list);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-4 pb-4">
      {list.map((s, i) => (
        <section key={s.id ?? `new-${i}`} className="flex flex-col gap-3 rounded-sm bg-charcoal p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="font-cond text-3xl text-tan">{String(i + 1).padStart(2, "0")}</span>
            <RowButtons
              onUp={i > 0 ? () => setList(move(list, i, -1)) : undefined}
              onDown={i < list.length - 1 ? () => setList(move(list, i, 1)) : undefined}
              onRemove={() => {
                if (s.id) setMsg({ ok: false, text: "Saved skills can't be removed here (old scores use them). Rename it instead." });
                else setList(list.filter((_, j) => j !== i));
              }}
            />
          </div>
          <input value={s.name} onChange={(e) => set(i, { name: e.target.value })} className={inputCls} placeholder="Skill name" />
          <div className="flex flex-wrap gap-2">
            {STAGES.map((st) => (
              <button key={st.v} type="button" onClick={() => set(i, { stage: st.v })} className={`min-h-10 rounded-sm px-3 text-sm font-semibold ${s.stage === st.v ? "bg-bone text-ink" : "bg-ink"}`}>
                {st.label}
              </button>
            ))}
          </div>
          <L label="What it is">
            <textarea rows={2} value={s.description} onChange={(e) => set(i, { description: e.target.value })} className={inputCls} />
          </L>
          <L label="What good sounds like" hint="The scorer compares the rep to this. Real lines work best.">
            <textarea rows={3} value={s.what_good_sounds_like} onChange={(e) => set(i, { what_good_sounds_like: e.target.value })} className={inputCls} />
          </L>
        </section>
      ))}
      <button type="button" onClick={() => setList([...list, { id: null, name: "", stage: "door", description: "", what_good_sounds_like: "" }])} className="min-h-12 rounded-sm border border-dashed border-muted-light font-semibold text-tan">
        + Add a skill
      </button>
      <SaveBar pending={pending} onSave={save} msg={msg} />
    </div>
  );
}

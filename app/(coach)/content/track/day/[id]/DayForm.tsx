"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDayTasks } from "@/app/actions/content";
import { inputCls, L, move, RowButtons, SaveBar, Toggle } from "@/components/content/kit";

export type Kind = "lesson" | "quiz" | "roleplay" | "field_task" | "reflection" | "workbook";
export type Task = { id: string | null; kind: Kind; ref_id: string | null; title: string; instructions: string; est_minutes: number | null; required: boolean };
export type Option = { id: string; title: string };

const KINDS: { v: Kind; label: string }[] = [
  { v: "lesson", label: "Lesson" },
  { v: "quiz", label: "Quiz" },
  { v: "roleplay", label: "Role play" },
  { v: "field_task", label: "Field task" },
  { v: "reflection", label: "Reflection" },
  { v: "workbook", label: "Workbook" },
];
const EDIT: Partial<Record<Kind, string>> = { lesson: "/content/lessons", quiz: "/content/quizzes", roleplay: "/content/homeowners" };

export function DayForm({ dayId, title, tasks, options }: { dayId: string; title: string; tasks: Task[]; options: Record<"lesson" | "quiz" | "roleplay", Option[]> }) {
  const router = useRouter();
  const [dayTitle, setDayTitle] = useState(title);
  const [list, setList] = useState<Task[]>(tasks);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (i: number, patch: Partial<Task>) => setList(list.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const pick = (i: number, refId: string) => {
    const t = list[i];
    const opts = options[t.kind as "lesson" | "quiz" | "roleplay"] ?? [];
    const prevTitle = opts.find((o) => o.id === t.ref_id)?.title;
    const nextTitle = opts.find((o) => o.id === refId)?.title ?? "";
    // Follow the picked item's name unless Chase typed his own task title.
    set(i, { ref_id: refId || null, title: !t.title || t.title === prevTitle ? (t.kind === "roleplay" ? `Role play: ${nextTitle}` : nextTitle) : t.title });
  };

  const save = () =>
    start(async () => {
      const r = await saveDayTasks(dayId, dayTitle, list);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-4 pb-4">
      <L label="Day title">
        <input value={dayTitle} onChange={(e) => setDayTitle(e.target.value)} className={inputCls} />
      </L>
      {list.map((t, i) => {
        const opts = (options as Record<string, Option[]>)[t.kind];
        return (
          <section key={t.id ?? `new-${i}`} className="flex flex-col gap-3 rounded-sm bg-charcoal p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="font-cond text-3xl text-tan">{i + 1}</span>
              <RowButtons
                onUp={i > 0 ? () => setList(move(list, i, -1)) : undefined}
                onDown={i < list.length - 1 ? () => setList(move(list, i, 1)) : undefined}
                onRemove={() => setList(list.filter((_, j) => j !== i))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button key={k.v} type="button" onClick={() => set(i, { kind: k.v, ref_id: k.v === t.kind ? t.ref_id : null })} className={`min-h-10 rounded-sm px-3 text-sm font-semibold ${t.kind === k.v ? "bg-bone text-ink" : "bg-ink"}`}>
                  {k.label}
                </button>
              ))}
            </div>
            {opts && (
              <L label={t.kind === "roleplay" ? "Which homeowner" : `Which ${t.kind}`}>
                <div className="flex gap-2">
                  <select value={t.ref_id ?? ""} onChange={(e) => pick(i, e.target.value)} className={inputCls}>
                    <option value="">Pick one…</option>
                    {opts.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.title}
                      </option>
                    ))}
                  </select>
                  {t.ref_id && EDIT[t.kind] && (
                    <Link href={`${EDIT[t.kind]}/${t.ref_id}`} className="flex min-h-12 shrink-0 items-center px-2 text-sm font-semibold text-tan">
                      Edit
                    </Link>
                  )}
                </div>
              </L>
            )}
            <L label="Task title (what reps see)">
              <input value={t.title} onChange={(e) => set(i, { title: e.target.value })} className={inputCls} />
            </L>
            {!opts && (
              <L label="Instructions">
                <textarea rows={3} value={t.instructions} onChange={(e) => set(i, { instructions: e.target.value })} className={inputCls} />
              </L>
            )}
            <div className="grid grid-cols-2 items-end gap-3">
              <L label="Minutes">
                <input type="number" min={0} value={t.est_minutes ?? ""} onChange={(e) => set(i, { est_minutes: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} className={inputCls} />
              </L>
              <Toggle checked={t.required} onChange={(v) => set(i, { required: v })} label="Required" />
            </div>
          </section>
        );
      })}
      {list.length < 15 && (
        <button type="button" onClick={() => setList([...list, { id: null, kind: "lesson", ref_id: null, title: "", instructions: "", est_minutes: 10, required: true }])} className="min-h-12 rounded-sm border border-dashed border-muted-light font-semibold text-tan">
          + Add a task
        </button>
      )}
      <SaveBar pending={pending} onSave={save} msg={msg} />
    </div>
  );
}

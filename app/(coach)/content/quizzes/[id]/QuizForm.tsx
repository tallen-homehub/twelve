"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveQuiz } from "@/app/actions/content";
import { inputCls, L, move, RowButtons, SaveBar, Toggle } from "@/components/content/kit";

export type Q = { prompt: string; qtype: "single" | "multi"; options: string[]; correct: number[]; explanation: string; skill_slug: string };
type Quiz = { title: string; kind: "quiz" | "assessment"; pass_pct: number; published: boolean; questions: Q[] };
const blank = (): Q => ({ prompt: "", qtype: "single", options: ["", "", "", ""], correct: [0], explanation: "", skill_slug: "" });

export function QuizForm({ id, quiz, skills }: { id: string | null; quiz: Quiz; skills: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState<Quiz>(quiz.questions.length ? quiz : { ...quiz, questions: [blank()] });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const setQ = (i: number, patch: Partial<Q>) => setF({ ...f, questions: f.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });

  const save = () =>
    start(async () => {
      const clean = { ...f, questions: f.questions.map((q) => ({ ...q, options: q.options.map((o) => o.trim()).filter(Boolean) })) };
      const r = await saveQuiz(id, clean);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok && !id && r.id) router.replace(`/content/quizzes/${r.id}`);
      else if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5 pb-4">
      <L label="Title">
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} />
      </L>
      <div className="grid grid-cols-2 gap-4">
        <L label="Type">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Quiz["kind"] })} className={inputCls}>
            <option value="quiz">Daily quiz</option>
            <option value="assessment">Weekly test (unlocks next week)</option>
          </select>
        </L>
        <L label="Pass mark (%)">
          <input type="number" min={0} max={100} value={f.pass_pct} onChange={(e) => setF({ ...f, pass_pct: Number(e.target.value) || 0 })} className={inputCls} />
        </L>
      </div>

      {f.questions.map((q, i) => (
        <section key={i} className="flex flex-col gap-3 rounded-sm bg-charcoal p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-cond text-3xl text-tan">Q{i + 1}</span>
            <RowButtons
              onUp={i > 0 ? () => setF({ ...f, questions: move(f.questions, i, -1) }) : undefined}
              onDown={i < f.questions.length - 1 ? () => setF({ ...f, questions: move(f.questions, i, 1) }) : undefined}
              onRemove={() => setF({ ...f, questions: f.questions.filter((_, j) => j !== i) })}
            />
          </div>
          <textarea rows={2} value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} className={inputCls} placeholder="The question" />
          <div className="flex gap-2 text-sm">
            {(["single", "multi"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setQ(i, { qtype: t, correct: t === "single" ? [q.correct[0] ?? 0] : q.correct })} className={`min-h-10 rounded-sm px-3 font-semibold ${q.qtype === t ? "bg-bone text-ink" : "bg-ink"}`}>
                {t === "single" ? "One right answer" : "Several right answers"}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Tap the circle next to the right answer{q.qtype === "multi" ? "s" : ""}.</p>
          {q.options.map((o, k) => {
            const right = q.correct.includes(k);
            return (
              <div key={k} className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={right ? "Right answer" : "Mark as right answer"}
                  onClick={() => setQ(i, { correct: q.qtype === "single" ? [k] : right ? q.correct.filter((c) => c !== k) : [...q.correct, k].sort() })}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${right ? "border-good bg-good text-ink" : "border-muted-light"}`}
                >
                  {right ? "✓" : ""}
                </button>
                <input value={o} onChange={(e) => setQ(i, { options: q.options.map((x, j) => (j === k ? e.target.value : x)) })} className={inputCls} placeholder={`Answer ${k + 1}`} />
                {q.options.length > 2 && (
                  <button
                    type="button"
                    aria-label="Remove answer"
                    onClick={() => setQ(i, { options: q.options.filter((_, j) => j !== k), correct: q.correct.filter((c) => c !== k).map((c) => (c > k ? c - 1 : c)) })}
                    className="h-10 w-10 shrink-0 text-muted"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
          {q.options.length < 6 && (
            <button type="button" onClick={() => setQ(i, { options: [...q.options, ""] })} className="min-h-10 self-start px-1 text-sm font-semibold text-tan">
              + Answer
            </button>
          )}
          <L label="Why (shown after they answer)">
            <input value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} className={inputCls} />
          </L>
          <L label="Skill">
            <select value={q.skill_slug} onChange={(e) => setQ(i, { skill_slug: e.target.value })} className={inputCls}>
              <option value="">None</option>
              {skills.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </L>
        </section>
      ))}
      <button type="button" onClick={() => setF({ ...f, questions: [...f.questions, blank()] })} className="min-h-12 rounded-sm border border-dashed border-muted-light font-semibold text-tan">
        + Add a question
      </button>
      <Toggle checked={f.published} onChange={(v) => setF({ ...f, published: v })} label="Published" />
      <SaveBar pending={pending} onSave={save} msg={msg} />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitQuiz, type QuizResult } from "./actions";
import { Button } from "@/components/ui";

export type QuizQuestion = { id: string; position: number; prompt: string; qtype: "single" | "multi" | "short"; options: string[] | null; skill_slug: string | null };

/** One question per screen, then results with the right answer and why. */
export function QuizRunner({ taskId, questions, passPct, isAssessment }: { taskId: string; questions: QuizQuestion[]; passPct: number; isAssessment: boolean }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (questions.length === 0) return <p className="text-muted">No questions yet.</p>;

  if (result) {
    return (
      <div className="flex flex-col gap-5">
        <div className={`rounded-2xl p-6 text-center ${result.passed ? "bg-tan text-ink" : "bg-charcoal"}`}>
          <p className="font-display text-6xl font-black">{result.score_pct}%</p>
          {/* TODO-VOICE */}
          <p className="mt-2 font-semibold">
            {result.passed ? (isAssessment ? "Passed. Next week is unlocked." : "Passed.") : `Not yet. You need ${result.pass_pct}%. Review and run it again.`}
          </p>
        </div>
        {questions.map((q, n) => {
          const r = result.results.find((x) => x.question_id === q.id);
          const answerText =
            q.qtype === "single" && typeof r?.answer === "number" ? q.options?.[r.answer] : q.qtype === "short" ? String(r?.answer ?? "") : JSON.stringify(r?.answer);
          return (
            <div key={q.id} className="rounded-2xl bg-charcoal p-4">
              <p className="text-xs font-bold tracking-wider uppercase">
                <span className={r?.correct ? "text-tan" : "text-red"}>{r?.correct ? "Right" : "Missed"}</span>
                <span className="text-muted"> · Question {n + 1}</span>
              </p>
              <p className="mt-1 font-semibold">{q.prompt}</p>
              {!r?.correct && answerText && <p className="mt-2 text-sm">Answer: {answerText}</p>}
              {r?.explanation && <p className="mt-1 text-sm text-muted">{r.explanation}</p>}
            </div>
          );
        })}
        {result.passed ? (
          <Button onClick={() => router.push("/today")}>Back to today</Button>
        ) : (
          <Button
            onClick={() => {
              setResult(null);
              setAnswers({});
              setI(0);
            }}
          >
            Try again
          </Button>
        )}
      </div>
    );
  }

  const q = questions[i];
  const value = answers[q.id];
  const answered = q.qtype === "multi" ? Array.isArray(value) && value.length > 0 : q.qtype === "short" ? Boolean(String(value ?? "").trim()) : value !== undefined;
  const last = i === questions.length - 1;

  const choose = (idx: number) => {
    if (q.qtype === "multi") {
      const cur = Array.isArray(value) ? (value as number[]) : [];
      setAnswers({ ...answers, [q.id]: cur.includes(idx) ? cur.filter((x) => x !== idx) : [...cur, idx] });
    } else setAnswers({ ...answers, [q.id]: idx });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="h-2 overflow-hidden rounded-full bg-charcoal" aria-hidden="true">
        <div className="h-full bg-tan transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
      </div>
      <p className="text-sm text-muted">
        Question {i + 1} of {questions.length} · pass mark {passPct}%
      </p>
      <p className="text-xl font-semibold">{q.prompt}</p>
      {q.qtype === "short" ? (
        <textarea
          rows={4}
          value={String(value ?? "")}
          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          className="w-full rounded-xl bg-charcoal px-4 py-4 text-lg outline-none ring-tan focus:ring-2"
        />
      ) : (
        <div className="flex flex-col gap-3" role={q.qtype === "multi" ? "group" : "radiogroup"}>
          {(q.options ?? []).map((opt, idx) => {
            const selected = q.qtype === "multi" ? Array.isArray(value) && (value as number[]).includes(idx) : value === idx;
            return (
              <button
                key={idx}
                type="button"
                role={q.qtype === "multi" ? "checkbox" : "radio"}
                aria-checked={selected}
                onClick={() => choose(idx)}
                className={`min-h-14 rounded-xl px-4 py-3 text-left text-lg ${selected ? "bg-tan font-semibold text-ink" : "bg-charcoal"}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-3">
        {i > 0 && (
          <Button variant="ghost" className="w-1/3" onClick={() => setI(i - 1)}>
            Back
          </Button>
        )}
        <Button
          disabled={!answered || pending}
          onClick={() => {
            if (!last) return setI(i + 1);
            start(async () => {
              setError(null);
              try {
                setResult(await submitQuiz(taskId, answers));
                router.refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Couldn't submit. Try again.");
              }
            });
          }}
        >
          {last ? (pending ? "Grading…" : "Submit") : "Next"}
        </Button>
      </div>
      {error && <p className="text-red">{error}</p>}
    </div>
  );
}

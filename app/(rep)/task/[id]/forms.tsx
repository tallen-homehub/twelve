"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeTask } from "./actions";
import { Button, Field } from "@/components/ui";

const input = "w-full rounded-xl bg-charcoal px-4 py-4 text-lg outline-none ring-tan focus:ring-2";

function useSave() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const save = (taskId: string, data: Record<string, unknown> | null) =>
    start(async () => {
      setError(null);
      try {
        await completeTask(taskId, data);
        router.push("/today");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  return { pending, error, save };
}

export function CompleteButton({ taskId, done, label }: { taskId: string; done: boolean; label: string }) {
  const { pending, error, save } = useSave();
  if (done) return <p className="rounded-xl bg-tan/15 px-4 py-3 text-center font-semibold">Done ✓</p>;
  return (
    <>
      <Button onClick={() => save(taskId, null)} disabled={pending}>
        {pending ? "Saving…" : label}
      </Button>
      {error && <p className="mt-3 text-red">{error}</p>}
    </>
  );
}

const NUMBERS = [
  { key: "doors", label: "Doors knocked" },
  { key: "conversations", label: "Conversations" },
  { key: "bills", label: "Bills collected" },
  { key: "appointments", label: "Appointments set" },
] as const;

export function FieldTaskForm({ taskId, done, saved }: { taskId: string; done: boolean; saved?: Record<string, unknown> }) {
  const { pending, error, save } = useSave();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data: Record<string, unknown> = {};
        NUMBERS.forEach(({ key }) => (data[key] = Number(fd.get(key) || 0)));
        data.note = String(fd.get("note") || "");
        save(taskId, data);
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        {NUMBERS.map(({ key, label }) => (
          <Field key={key} label={label}>
            <input name={key} type="number" inputMode="numeric" min={0} defaultValue={(saved?.[key] as number) ?? ""} className={input} />
          </Field>
        ))}
      </div>
      <Field label="Anything worth noting?">
        <textarea name="note" rows={3} defaultValue={(saved?.note as string) ?? ""} className={input} />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : done ? "Update my numbers" : "Log it"}
      </Button>
      {error && <p className="text-red">{error}</p>}
    </form>
  );
}

export function ReflectionForm({ taskId, prompts, done, saved }: { taskId: string; prompts: string[]; done: boolean; saved?: Record<string, unknown> }) {
  const { pending, error, save } = useSave();
  const answers = (saved?.answers as string[]) ?? [];
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        save(taskId, { prompts, answers: prompts.map((_, i) => String(fd.get(`a${i}`) || "")) });
      }}
    >
      {prompts.map((p, i) => (
        <Field key={i} label={p}>
          <textarea name={`a${i}`} rows={4} required defaultValue={answers[i] ?? ""} className={input} />
        </Field>
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : done ? "Update" : "Save"}
      </Button>
      {error && <p className="text-red">{error}</p>}
    </form>
  );
}

import Link from "next/link";
import { KIND_LABEL, isLive, type DayState, type Task } from "@/lib/curriculum";

export function ProgressRing({ done, total, size = 76 }: { done: number; total: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = total === 0 ? 0 : done / total;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${done} of ${total} tasks done`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-charcoal-2)" strokeWidth="8" fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--color-tan)"
        strokeWidth="8"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="var(--color-bone)" fontSize="18" fontWeight="700">
        {done}/{total}
      </text>
    </svg>
  );
}

export function TaskRow({ task, done }: { task: Task; done: boolean }) {
  const live = isLive(task);
  const body = (
    <div className={`flex min-h-16 items-center gap-4 rounded-2xl px-4 py-3 ${live ? "bg-charcoal" : "bg-charcoal/50"}`}>
      <span
        aria-hidden="true"
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-tan bg-tan text-ink" : "border-muted-light"}`}
      >
        {done ? "✓" : ""}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wider text-tan uppercase">
          {KIND_LABEL[task.kind]}
          {task.est_minutes ? ` · ${task.est_minutes >= 60 ? `${Math.round(task.est_minutes / 60)} hr` : `${task.est_minutes} min`}` : ""}
          {!task.required ? " · optional" : ""}
        </p>
        <p className={`truncate font-semibold ${done ? "text-muted line-through" : ""}`}>{task.title}</p>
        {!live && <p className="text-xs text-muted">Opens Friday with the practice engine</p>}
      </div>
      {done && <span className="sr-only">Done</span>}
    </div>
  );
  return live ? (
    <Link href={`/task/${task.id}`} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

const STATE_STYLE: Record<DayState, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-tan text-ink" },
  today: { label: "Today", cls: "bg-bone text-ink" },
  open: { label: "Open", cls: "bg-charcoal-2 text-bone" },
  missed: { label: "Catch up", cls: "bg-red/20 text-bone" },
  upcoming: { label: "Upcoming", cls: "bg-charcoal text-muted" },
  locked: { label: "Locked", cls: "bg-charcoal text-muted" },
};

export function DayChip({ state }: { state: DayState }) {
  const s = STATE_STYLE[state];
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.cls}`}>{s.label}</span>;
}

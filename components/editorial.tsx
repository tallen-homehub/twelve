import Image from "next/image";

/**
 * TWELVE editorial pieces, matching the @sunrunxii look:
 * black-and-white photo heroes with thin grid lines, glowing Whoop-style rings, stat-sheet strips.
 * Photos live in /public/photos (TWELVE's own shots, cleaned and toned). TODO: swap for Chase's originals.
 */

export const PHOTOS = {
  cap: "/photos/login-cap.jpg",
  profile: "/photos/today-profile.jpg",
  runner: "/photos/practice-runner.jpg",
  crew: "/photos/score-crew.jpg",
  team: "/photos/dash-team.jpg",
} as const;

/** Full-bleed photo with grid lines and a fade to ink at the bottom. Children sit on top. */
export function PhotoHero({
  src,
  className = "h-[420px]",
  position = "50% 30%",
  fade = "bottom",
  priority = false,
  children,
}: {
  src: string;
  className?: string;
  position?: string;
  fade?: "bottom" | "left";
  priority?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`relative -mx-5 -mt-6 overflow-hidden ${className}`}>
      <Image src={src} alt="" fill priority={priority} sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" style={{ objectPosition: position }} />
      <div className="grid-lines" aria-hidden="true" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink/70 to-transparent" />
      {fade === "bottom" ? (
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-b from-transparent via-ink/85 to-ink" />
      ) : (
        <>
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink/95 via-ink/55 to-ink/10" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-ink" />
        </>
      )}
      <div className="absolute inset-0 px-5">{children}</div>
    </div>
  );
}

const RING_COLOR = { tan: "#cdbfa6", good: "#8fb08a", warn: "#d9a441", red: "#d9534f" } as const; // brand tokens, used inside SVG strokes

/** Whoop-style progress ring. value 0–1. */
export function Ring({ value, size = 96, stroke = 9, tone = "tan", children }: { value: number; size?: number; stroke?: number; tone?: keyof typeof RING_COLOR; children?: React.ReactNode }) {
  const r = 50 - stroke / 2 - 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const glow = tone === "good" ? "glow-good" : tone === "warn" ? "glow-warn" : "glow-tan";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={`-rotate-90 ${v > 0 ? glow : ""}`}>
        <circle cx="50" cy="50" r={r} stroke="#2a2622" strokeWidth={stroke} fill="none" />
        {v > 0 && <circle cx="50" cy="50" r={r} stroke={RING_COLOR[tone]} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} />}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** A row of stat cells with hairline dividers, like the daily posters (DAY 18 | TRACK | TEAM). */
export function StatStrip({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid border-t border-bone/35" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it, i) => (
        <div key={it.label} className={`pt-2 ${i ? "border-l border-bone/35 pl-3" : ""}`}>
          <p className="label">{it.label}</p>
          <div className="mt-1">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

/** Tiny line chart for stat tiles. */
export function Sparkline({ values, className = "text-tan" }: { values: number[]; className?: string }) {
  if (values.length < 2 || values.every((v) => v === 0)) return <div className="h-8" />;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 120},${30 - (v / max) * 26}`).join(" ");
  return (
    <svg viewBox="0 0 120 32" className={`h-8 w-full ${className}`} aria-hidden="true" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

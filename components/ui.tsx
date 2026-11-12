import Link from "next/link";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

/** Big, thumb-friendly button. Primary = tan on ink. */
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "min-h-12 w-full rounded-sm px-5 py-4 font-display text-[15px] font-extrabold tracking-[0.28em] uppercase transition active:scale-[0.98] disabled:opacity-50";
  const look = variant === "primary" ? "bg-bone text-ink" : "border border-muted-light bg-ink text-bone";
  return <button {...props} className={`${base} ${look} ${className}`} />;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
  const look = variant === "primary" ? "bg-bone text-ink" : "border border-muted-light bg-ink text-bone";
  return (
    <Link href={href} className={`flex min-h-12 w-full items-center justify-center rounded-sm px-5 py-4 text-center font-display text-[15px] font-extrabold tracking-[0.28em] uppercase ${look}`}>
      {children}
    </Link>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-charcoal p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <header className="flex flex-col gap-2 pb-6">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="font-cond text-6xl">{title}</h1>
    </header>
  );
}

/** Placeholder used for screens that are scheduled later in the build week. */
export function ComingSoon({ day, what }: { day: string; what: string }) {
  return (
    <Card>
      <p className="eyebrow">Coming {day}</p>
      <p className="mt-2 text-muted">{what}</p>
    </Card>
  );
}

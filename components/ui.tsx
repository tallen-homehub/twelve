import Link from "next/link";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" };

/** Big, thumb-friendly button. Primary = tan on ink. */
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base = "min-h-12 w-full rounded-xl px-5 py-4 text-lg font-bold transition active:scale-[0.98] disabled:opacity-50";
  const look = variant === "primary" ? "bg-tan text-ink" : "bg-charcoal text-bone";
  return <button {...props} className={`${base} ${look} ${className}`} />;
}

export function ButtonLink({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
  const look = variant === "primary" ? "bg-tan text-ink" : "bg-charcoal text-bone";
  return (
    <Link href={href} className={`flex min-h-12 w-full items-center justify-center rounded-xl px-5 py-4 text-lg font-bold ${look}`}>
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
    <header className="flex flex-col gap-1 pb-6">
      {eyebrow && <p className="text-xs font-bold tracking-widest text-tan uppercase">{eyebrow}</p>}
      <h1 className="font-display text-4xl font-black leading-none lowercase">{title}</h1>
    </header>
  );
}

/** Placeholder used for screens that are scheduled later in the build week. */
export function ComingSoon({ day, what }: { day: string; what: string }) {
  return (
    <Card>
      <p className="text-xs font-bold tracking-widest text-tan uppercase">Coming {day}</p>
      <p className="mt-2 text-muted">{what}</p>
    </Card>
  );
}

import { LeadNav } from "@/components/NavFor";
import { requireProfile } from "@/lib/auth";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const me = await requireProfile({ roles: ["coach", "admin"] });
  return (
    <>
      <main className="safe-top mx-auto max-w-md px-5 pt-6 pb-28 md:max-w-3xl lg:max-w-5xl">{children}</main>
      <LeadNav role={me.role} />
    </>
  );
}

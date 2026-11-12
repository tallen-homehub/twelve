import { BottomNav } from "@/components/BottomNav";
import { IconContent, IconQueue, IconReps, IconThemes } from "@/components/icons";
import { requireProfile } from "@/lib/auth";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  await requireProfile({ roles: ["coach", "admin"] });
  return (
    <>
      <main className="safe-top mx-auto max-w-md px-5 pt-6 pb-28 md:max-w-3xl">{children}</main>
      <BottomNav
        items={[
          { href: "/queue", label: "Queue", icon: <IconQueue /> },
          { href: "/reps", label: "Reps", icon: <IconReps /> },
          { href: "/themes", label: "Themes", icon: <IconThemes /> },
          { href: "/content", label: "Content", icon: <IconContent /> },
        ]}
      />
    </>
  );
}

import { BottomNav } from "@/components/BottomNav";
import { IconMe, IconPractice, IconRecordings, IconToday, IconTrack } from "@/components/icons";
import { requireProfile } from "@/lib/auth";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  await requireProfile(); // any active user; staff can view the rep side too
  return (
    <>
      <main className="safe-top mx-auto max-w-md px-5 pt-6 pb-28">{children}</main>
      <BottomNav
        items={[
          { href: "/today", label: "Today", icon: <IconToday /> },
          { href: "/track", label: "Track", icon: <IconTrack /> },
          { href: "/practice", label: "Practice", icon: <IconPractice /> },
          { href: "/recordings", label: "Recordings", icon: <IconRecordings /> },
          { href: "/me", label: "Me", icon: <IconMe /> },
        ]}
      />
    </>
  );
}

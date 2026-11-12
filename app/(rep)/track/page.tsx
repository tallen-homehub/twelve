import { requireProfile } from "@/lib/auth";
import { ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Track" };

export default async function TrackPage() {
  await requireProfile();
  return (
    <>
      <PageHeader eyebrow="Your 60 days" title="the track." />
      <ComingSoon day="Thursday" what="All 60 days by week, what's done, and what unlocks the next week." />
    </>
  );
}

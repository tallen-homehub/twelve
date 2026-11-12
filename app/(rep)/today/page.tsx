import { requireProfile, firstName } from "@/lib/auth";
import { trackDay } from "@/lib/dates";
import { ButtonLink, ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Today" };

export default async function TodayPage() {
  const profile = await requireProfile();
  const day = trackDay(profile.track_started_on);

  return (
    <>
      <PageHeader eyebrow={`Day ${day} of 60`} title={`let's go, ${firstName(profile).toLowerCase()}.`} />
      <div className="flex flex-col gap-4">
        <ComingSoon day="Thursday" what="Today's tasks from your 60-day plan: lessons, quizzes, practice and field work." />
        <ButtonLink href="/practice">Practice a door</ButtonLink>
      </div>
    </>
  );
}

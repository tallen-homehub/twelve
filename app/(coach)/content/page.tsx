import { requireProfile } from "@/lib/auth";
import { ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Content" };

export default async function ContentPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  return (
    <>
      <PageHeader eyebrow="Content" title="build the track." />
      <ComingSoon day="Thursday" what="Tracks, lessons, quizzes, homeowner personas and your scoring rubric." />
    </>
  );
}

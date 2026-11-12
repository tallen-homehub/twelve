import { requireProfile } from "@/lib/auth";
import { ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Team themes" };

export default async function ThemesPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  return (
    <>
      <PageHeader eyebrow="Team themes" title="what to train next." />
      <ComingSoon day="Sunday" what="The top three skills the team is missing this week, with example clips." />
    </>
  );
}

import { requireProfile } from "@/lib/auth";
import { ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Reps" };

export default async function RepsPage() {
  await requireProfile({ roles: ["coach", "admin"] });
  return (
    <>
      <PageHeader eyebrow="The team" title="reps." />
      <ComingSoon day="Sunday" what="Every rep's progress, weakest skills and red flags, ready for your 1:1s." />
    </>
  );
}

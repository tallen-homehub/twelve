import { requireProfile } from "@/lib/auth";
import { ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Practice" };

export default async function PracticePage() {
  await requireProfile();
  return (
    <>
      <PageHeader eyebrow="Role play" title="practice." />
      <ComingSoon day="Friday" what="Talk to an AI homeowner at the door or the table, then get scored on Chase's stages." />
    </>
  );
}

import { requireProfile } from "@/lib/auth";
import { ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Recordings" };

export default async function RecordingsPage() {
  await requireProfile();
  return (
    <>
      <PageHeader eyebrow="Field recordings" title="recordings." />
      <ComingSoon day="Saturday" what="Upload a real appointment and get timestamped coaching from Chase." />
    </>
  );
}

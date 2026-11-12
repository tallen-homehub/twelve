import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { CONSENT_SCRIPT } from "@/lib/recordings";
import { PageHeader } from "@/components/ui";
import { Recorder } from "./Recorder";

// The upload action starts transcription after responding; give it room to finish.
export const maxDuration = 300;
export const metadata = { title: "Record" };

export default async function RecordPage() {
  const profile = await requireProfile();
  return (
    <>
      <Link href="/recordings" className="py-2 text-sm text-muted">
        ← Recordings
      </Link>
      <PageHeader eyebrow="Field recording" title="hit record." />
      <Recorder profileId={profile.id} today={todayISO()} consentScript={CONSENT_SCRIPT} />
    </>
  );
}

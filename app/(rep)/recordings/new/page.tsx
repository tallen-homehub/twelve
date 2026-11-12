import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { CONSENT_SCRIPT } from "@/lib/recordings";
import { PageHeader } from "@/components/ui";
import { UploadForm } from "./UploadForm";

// Server actions on this page start AI work after responding; give it room to finish.
export const maxDuration = 300;
export const metadata = { title: "Upload a recording" };

export default async function NewRecordingPage() {
  const profile = await requireProfile();
  return (
    <>
      <Link href="/recordings" className="py-2 text-sm text-muted">
        ← Recordings
      </Link>
      <PageHeader eyebrow="Field recording" title="get coached." />
      <p className="-mt-3 mb-6 text-muted">
        Upload a real door or table conversation. Chase reviews the AI&apos;s notes before you see them. Plaud users: export the audio from the Plaud app first.
      </p>
      <UploadForm profileId={profile.id} today={todayISO()} consentScript={CONSENT_SCRIPT} />
    </>
  );
}

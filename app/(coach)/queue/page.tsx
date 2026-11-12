import Link from "next/link";
import { firstName, requireProfile } from "@/lib/auth";
import { ComingSoon, PageHeader } from "@/components/ui";

export const metadata = { title: "Coaching queue" };

export default async function QueuePage() {
  const p = await requireProfile({ roles: ["coach", "admin"] });
  return (
    <>
      <PageHeader eyebrow="Coaching queue" title={`what's up, ${firstName(p).toLowerCase()}.`} />
      <div className="flex flex-col gap-4">
        <ComingSoon day="Saturday" what="AI-drafted coaching notes on reps' recordings, waiting for your approval." />
        <Link href="/today" className="rounded-xl bg-charcoal px-5 py-4 text-center font-bold">
          See the rep view
        </Link>
      </div>
    </>
  );
}

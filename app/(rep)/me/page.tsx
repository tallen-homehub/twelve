import Link from "next/link";
import { isStaff, requireProfile } from "@/lib/auth";
import { prettyPhone } from "@/lib/phone";
import { Card, PageHeader } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata = { title: "Me" };

const ROLE_LABEL = { rep: "Rep", leader: "Leader", coach: "Coach", admin: "Admin" } as const;
const TYPE_LABEL = { setter: "Setter", closer: "Closer", self_gen: "Self-gen" } as const;

export default async function MePage() {
  const p = await requireProfile();
  return (
    <>
      <PageHeader eyebrow="Profile" title={(p.preferred_name || p.full_name).toLowerCase()} />
      <div className="flex flex-col gap-4">
        <Card>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-muted">Role</dt>
            <dd>{p.rep_type ? TYPE_LABEL[p.rep_type] : ROLE_LABEL[p.role]}</dd>
            <dt className="text-muted">Phone</dt>
            <dd>{p.phone ? prettyPhone(p.phone) : "—"}</dd>
            <dt className="text-muted">Started</dt>
            <dd>{p.track_started_on ?? "—"}</dd>
          </dl>
        </Card>
        {isStaff(p.role) && (
          <Link href="/queue" className="rounded-xl bg-charcoal px-5 py-4 text-center font-bold">
            Switch to coach view
          </Link>
        )}
        <SignOutButton />
      </div>
    </>
  );
}

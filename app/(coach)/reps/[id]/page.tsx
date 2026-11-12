import { requireProfile } from "@/lib/auth";
import { RepDetail } from "@/components/dashboard/RepDetail";
import { openThreadForRep } from "@/app/(coach)/inbox/actions";

export const metadata = { title: "Rep" };

async function message(fd: FormData) {
  "use server";
  await openThreadForRep(String(fd.get("rep")));
}

export default async function RepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["coach", "admin"] });
  return <RepDetail repId={id} backHref="/dashboard" backLabel="Dashboard" staff messageAction={message} />;
}

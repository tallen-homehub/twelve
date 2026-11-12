import { requireProfile } from "@/lib/auth";
import { RepDetail } from "@/components/dashboard/RepDetail";

export const metadata = { title: "Rep" };

export default async function LeaderRepPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireProfile({ roles: ["leader", "coach", "admin"] });
  return <RepDetail repId={id} backHref="/team" backLabel="My team" staff={false} />;
}

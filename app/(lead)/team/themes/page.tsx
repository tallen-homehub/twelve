import { requireProfile } from "@/lib/auth";
import { ThemesView } from "@/components/themes/ThemesView";

export const metadata = { title: "Team themes" };
export const maxDuration = 120;

// A team leader's own themes (RLS only returns theirs).
export default async function LeaderThemesPage() {
  const me = await requireProfile({ roles: ["leader"] });
  return <ThemesView leaderId={me.id} staff={false} repHref={(id) => `/team/rep/${id}`} backHref="/team" />;
}

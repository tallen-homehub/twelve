import { requireProfile } from "@/lib/auth";
import { ThemesView } from "@/components/themes/ThemesView";

export const metadata = { title: "Team themes" };
// "Refresh now" reads the week with Claude; give it time.
export const maxDuration = 120;

export default async function ThemesPage({ searchParams }: { searchParams: Promise<{ leader?: string }> }) {
  await requireProfile({ roles: ["coach", "admin"] });
  const { leader } = await searchParams;
  return <ThemesView leaderId={leader ?? null} staff repHref={(id) => `/reps/${id}`} />;
}

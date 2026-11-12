import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui";

// Shown only when the Supabase keys are missing from the environment.
export default function SetupPage() {
  return (
    <main className="safe-top mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <Logo width={160} />
      <h1 className="font-display text-4xl font-black uppercase">almost there.</h1>
      <Card>
        <p>The app is deployed but not connected to the database yet.</p>
        <p className="mt-3 text-muted">
          In Vercel → Settings → Environment Variables, add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then redeploy. Full steps are in <code>docs/SETUP.md</code>.
        </p>
      </Card>
    </main>
  );
}

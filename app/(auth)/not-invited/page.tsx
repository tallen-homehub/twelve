import { Logo } from "@/components/Logo";
import { Card } from "@/components/ui";
import { SignOutButton } from "@/components/SignOutButton";

export default function NotInvitedPage() {
  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <Logo width={160} />
      <h1 className="font-display text-4xl font-black uppercase">you&apos;re not on the list yet.</h1>
      <Card>
        <p>This number doesn&apos;t have an invite, or the account is paused.</p>
        <p className="mt-3 text-muted">Ask your leader to add you, then log in again with the same number.</p>
      </Card>
      <SignOutButton />
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { prettyPhone, toE164 } from "@/lib/phone";
import { Logo } from "@/components/Logo";
import { Button, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [e164, setE164] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = toE164(phone);
    if (!normalized) return setError("Enter a 10-digit phone number.");
    setBusy(true);
    const { error } = await createClient().auth.signInWithOtp({ phone: normalized });
    setBusy(false);
    if (error) return setError("Couldn't send a code. Check the number and try again.");
    setE164(normalized);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await createClient().auth.verifyOtp({ phone: e164, token: code.trim(), type: "sms" });
    setBusy(false);
    if (error) return setError("That code didn't work. Check it or send a new one.");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-10">
      <Logo width={180} />

      <div className="flex flex-col gap-8">
        <h1 className="font-display text-5xl font-black leading-none lowercase">
          {step === "phone" ? "let's get to work." : "check your texts."}
        </h1>

        {step === "phone" ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
            <Field label="Phone number">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(435) 555-1234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl bg-charcoal px-4 py-4 text-xl outline-none ring-tan focus:ring-2"
              />
            </Field>
            <Button type="submit" disabled={busy}>
              {busy ? "Sending…" : "Text me a code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-4">
            <Field label={`6-digit code sent to ${prettyPhone(e164)}`}>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-charcoal px-4 py-4 text-center text-3xl tracking-[0.4em] outline-none ring-tan focus:ring-2"
              />
            </Field>
            <Button type="submit" disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Log in"}
            </Button>
            <button type="button" onClick={() => setStep("phone")} className="py-2 text-muted underline">
              Use a different number
            </button>
          </form>
        )}

        {error && <p className="rounded-xl bg-red/15 px-4 py-3 text-bone">{error}</p>}
      </div>

      <p className="text-sm text-muted">Invite only. Ask your leader if you can&apos;t get in.</p>
    </main>
  );
}

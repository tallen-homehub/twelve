"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { prettyPhone, toE164 } from "@/lib/phone";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import { PHOTOS } from "@/components/editorial";
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

  const input = "w-full rounded-sm border border-bone/35 bg-ink/60 px-4 py-4 text-xl outline-none ring-tan backdrop-blur focus:ring-2";
  return (
    <main className="relative min-h-dvh overflow-hidden bg-ink">
      {/* Real TWELVE silhouette, poster grid, fade to ink */}
      <Image src={PHOTOS.cap} alt="" fill priority sizes="100vw" className="object-cover" style={{ objectPosition: "50% 0%" }} />
      <div className="grid-lines" aria-hidden="true" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/60 to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-b from-transparent via-ink/90 to-ink" />

      <div className="safe-top safe-bottom relative mx-auto flex min-h-dvh max-w-md flex-col justify-between px-6 py-8">
        <div className="flex items-start justify-between">
          <Logo width={110} />
          <p className="text-right text-[11px] leading-snug font-semibold">ORANGE COUNTY<br />SUNRUN<br />TWELVE</p>
        </div>

        <div className="flex flex-col gap-5">
          <h1 className="text-center font-display text-[44px] leading-none font-extrabold tracking-tight" style={{ fontStretch: "100%" }}>
            {step === "phone" ? "BUILT AT THE DOOR" /* TODO-VOICE */ : "CHECK YOUR TEXTS"}
          </h1>
          <p className="eyebrow text-center !text-muted">Training · invite only</p>

          {step === "phone" ? (
            <form onSubmit={sendCode} className="flex flex-col gap-3">
              <Field label="Phone number">
                <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(435) 555-1234" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} />
              </Field>
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Text me a code"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="flex flex-col gap-3">
              <Field label={`6-digit code sent to ${prettyPhone(e164)}`}>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className={`${input} text-center text-3xl tracking-[0.4em]`}
                />
              </Field>
              <Button type="submit" disabled={busy || code.length !== 6}>
                {busy ? "Checking…" : "Log in"}
              </Button>
              <button type="button" onClick={() => setStep("phone")} className="min-h-12 text-muted underline">
                Use a different number
              </button>
            </form>
          )}

          {error && <p className="rounded-sm bg-red/20 px-4 py-3 text-bone">{error}</p>}
          <p className="text-center text-xs text-muted">Ask your leader if you can&apos;t get in.</p>
        </div>
      </div>
    </main>
  );
}

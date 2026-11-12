import { NextResponse } from "next/server";
import { isStaff, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DAILY_VOICE_CAP_S, homeownerSystem, PERSONA_FIELDS, TIME_CAP_S, type Persona } from "@/lib/roleplay";
import { todayISO } from "@/lib/dates";

const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime";
const VOICE_BY_PERSONA: Record<string, string> = {
  "busy-brenda": "coral",
  "diane-spouse": "shimmer",
  "skeptic-steve": "ash",
  "tom-maria": "marin",
  "numbers-nate": "cedar",
};

/** Voice role play: mints a short-lived OpenAI Realtime key for this session. Our API key never reaches the phone. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const key = process.env.OPENAI_API_KEY ?? process.env.Open_Ai_Key;
  if (!key) return NextResponse.json({ error: "Voice isn't set up yet (OPENAI_API_KEY missing). Use text for now." }, { status: 503 });

  const supabase = await createClient();
  const { data: s } = await supabase
    .from("roleplay_sessions")
    .select(`id, profile_id, mode, status, persona:personas(${PERSONA_FIELDS})`)
    .eq("id", id)
    .single();
  if (!s || s.profile_id !== profile.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (s.status !== "live" || s.mode !== "voice") return NextResponse.json({ error: "This session has ended." }, { status: 409 });

  // Daily voice cap (staff uncapped)
  let remaining = DAILY_VOICE_CAP_S;
  if (!isStaff(profile.role)) {
    const { data: today } = await supabase
      .from("roleplay_sessions")
      .select("voice_seconds")
      .eq("profile_id", profile.id)
      .gte("started_at", `${todayISO()}T00:00:00-08:00`);
    const used = (today ?? []).reduce((n, r) => n + (r.voice_seconds ?? 0), 0);
    remaining = DAILY_VOICE_CAP_S - used;
    if (remaining <= 30) return NextResponse.json({ error: "You've hit today's 30 voice minutes. Text mode is unlimited." }, { status: 429 });
  }

  const persona = s.persona as unknown as Persona;
  const { system } = await homeownerSystem(persona, "voice");

  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 120 },
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions: system,
        audio: {
          input: { transcription: { model: "gpt-4o-mini-transcribe" }, turn_detection: { type: "server_vad" } },
          output: { voice: persona.voice_id ?? VOICE_BY_PERSONA[persona.slug] ?? "marin" },
        },
      },
    }),
  });
  if (!res.ok) {
    const raw = await res.text();
    let reason = raw.slice(0, 200);
    try { reason = (JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? reason; } catch {}
    console.error("realtime client_secrets failed", res.status, raw.slice(0, 500));
    return NextResponse.json({ error: `Voice setup failed (OpenAI ${res.status}): ${reason}` }, { status: 502 });
  }
  const data = (await res.json()) as { value?: string; client_secret?: { value?: string } };
  const value = data.value ?? data.client_secret?.value;
  if (!value) return NextResponse.json({ error: "Voice connection failed. Use text for now." }, { status: 502 });

  return NextResponse.json({ value, maxSeconds: Math.min(TIME_CAP_S[persona.setting], remaining) });
}

import { after, NextResponse } from "next/server";
import { analyzeRecording, saveTranscript, verifyRecordingSig } from "@/lib/recordings";

// Deepgram calls this when a transcript is ready. The signed URL is the only proof it's really for us.
export const maxDuration = 300;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";
  const sig = url.searchParams.get("sig") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !verifyRecordingSig(id, sig)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  const payload = await req.json().catch(() => null);
  if (!payload) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const ok = await saveTranscript(id, payload);
  // Answer Deepgram right away; the AI steps run after the response.
  if (ok) after(() => analyzeRecording(id));
  return NextResponse.json({ ok: true });
}

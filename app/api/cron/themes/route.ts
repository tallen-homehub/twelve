import { NextResponse } from "next/server";
import { generateAllThemes } from "@/lib/themes";

// Nightly team themes (vercel.json). Safe to repeat: each run adds a fresh snapshot.
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const ok = secret ? req.headers.get("authorization") === `Bearer ${secret}` : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ scopes: await generateAllThemes() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}

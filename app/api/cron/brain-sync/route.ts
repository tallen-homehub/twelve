import { NextResponse } from "next/server";
import { driveConfigured, syncDrive } from "@/lib/brain/drive";

// Daily Drive → brain sync (vercel.json). Read-only from Drive and safe to repeat.
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const ok = secret ? req.headers.get("authorization") === `Bearer ${secret}` : (req.headers.get("user-agent") ?? "").startsWith("vercel-cron");
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!driveConfigured()) return NextResponse.json({ skipped: "Drive not connected" });
  try {
    return NextResponse.json(await syncDrive());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 500 });
  }
}

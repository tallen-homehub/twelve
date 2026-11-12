"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { toE164 } from "@/lib/phone";
import { todayISO } from "@/lib/dates";

// These return { ok, message } instead of throwing: production hides thrown messages.
export type RosterResult = { ok: boolean; message: string; added?: number; skipped?: string[] };
const staff = () => requireProfile({ roles: ["coach", "admin"] });
const ROLES = ["rep", "leader", "coach", "admin"] as const;
const TYPES = ["setter", "closer", "self_gen"] as const;

type NewPerson = { name: string; phone: string; repType: string; role: string; leaderId: string; trackId: string };

/**
 * Invites people. They get in by logging in with that phone number; their profile is created then.
 * Only admins can invite coaches or admins.
 */
export async function invitePeople(people: NewPerson[]): Promise<RosterResult> {
  try {
    const me = await staff();
    const supabase = await createClient();
    const rows: Record<string, unknown>[] = [];
    const skipped: string[] = [];
    const seen = new Set<string>();
    for (const p of people) {
      const name = p.name.trim().replace(/\s+/g, " ").slice(0, 80);
      const phone = toE164(p.phone);
      const role = (ROLES as readonly string[]).includes(p.role) ? p.role : "rep";
      if (!name || !phone) {
        skipped.push(`${p.name || p.phone || "(blank)"}: needs a name and a 10-digit phone`);
        continue;
      }
      if ((role === "coach" || role === "admin") && me.role !== "admin") {
        skipped.push(`${name}: only an admin can add coaches or admins`);
        continue;
      }
      if (seen.has(phone)) continue;
      seen.add(phone);
      rows.push({
        phone,
        full_name: name,
        role,
        rep_type: (TYPES as readonly string[]).includes(p.repType) ? p.repType : role === "rep" || role === "leader" ? "setter" : null,
        leader_id: role === "rep" && p.leaderId ? p.leaderId : null,
        track_id: p.trackId || null,
        invited_by: me.id,
      });
    }
    if (!rows.length) return { ok: false, message: "Nobody to add.", skipped };

    // Numbers that already have an account are updated in place instead of re-invited.
    const { data: existing } = await supabase.from("profiles").select("id, phone, full_name").in("phone", rows.map((r) => r.phone as string));
    const taken = new Map((existing ?? []).map((e) => [e.phone, e]));
    const fresh = rows.filter((r) => !taken.has(r.phone as string));
    for (const r of rows.filter((r) => taken.has(r.phone as string))) skipped.push(`${r.full_name}: already has an account (edit them on the roster)`);

    if (fresh.length) {
      const { error } = await supabase.from("invites").upsert(fresh, { onConflict: "phone" });
      if (error) throw new Error(`Couldn't save: ${error.message}`);
    }
    revalidatePath("/dashboard");
    return { ok: true, message: `${fresh.length} invited.`, added: fresh.length, skipped };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "That didn't work." };
  }
}

export async function cancelInvite(phone: string): Promise<RosterResult> {
  try {
    await staff();
    const supabase = await createClient();
    const { error } = await supabase.from("invites").delete().eq("phone", phone).is("accepted_at", null);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard");
    return { ok: true, message: "Invite removed." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "That didn't work." };
  }
}

/** Edits someone already on the team: type, role, team leader, track, status. */
export async function updatePerson(
  id: string,
  input: { fullName: string; repType: string; role: string; leaderId: string; trackId: string; status: string; restartTrack: boolean },
): Promise<RosterResult> {
  try {
    const me = await staff();
    const supabase = await createClient();
    const { data: cur } = await supabase.from("profiles").select("id, role, track_id").eq("id", id).single();
    if (!cur) return { ok: false, message: "Not found." };
    const role = (ROLES as readonly string[]).includes(input.role) ? input.role : cur.role;
    if ((role === "coach" || role === "admin" || cur.role === "admin") && me.role !== "admin" && role !== cur.role) {
      return { ok: false, message: "Only an admin can change coach or admin roles." };
    }
    if (id === me.id && role !== cur.role) return { ok: false, message: "You can't change your own role." };
    const status = ["active", "paused", "left"].includes(input.status) ? input.status : "active";
    const patch: Record<string, unknown> = {
      full_name: input.fullName.trim().slice(0, 80) || undefined,
      rep_type: (TYPES as readonly string[]).includes(input.repType) ? input.repType : null,
      role,
      leader_id: role === "rep" && input.leaderId && input.leaderId !== id ? input.leaderId : null,
      track_id: input.trackId || null,
      status,
    };
    if (input.restartTrack || (input.trackId && input.trackId !== cur.track_id)) patch.track_started_on = todayISO();
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/dashboard");
    revalidatePath(`/reps/${id}`);
    return { ok: true, message: "Saved." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "That didn't work." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { generateThemes } from "@/lib/themes";

/** Rebuilds themes now for one scope (staff: any; a team leader: their own team). */
export async function refreshThemes(leaderId: string | null): Promise<{ ok: boolean; message: string }> {
  try {
    const me = await requireProfile({ roles: ["leader", "coach", "admin"] });
    const scope = me.role === "leader" ? me.id : leaderId;
    const d = await generateThemes(scope);
    revalidatePath("/themes");
    revalidatePath("/team/themes");
    return { ok: true, message: d.themes.length ? "Updated." : (d.note ?? "Nothing to show yet.") };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Couldn't update themes." };
  }
}

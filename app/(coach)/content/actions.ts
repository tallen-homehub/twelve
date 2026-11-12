"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { rebuildAppBrain } from "@/lib/brain";
import { createAdminClient } from "@/lib/supabase/admin";

/** Re-reads the app guide, lessons, skills and homeowners into the help bot's brain. */
export async function rebuildBrain() {
  const me = await requireProfile({ roles: ["coach", "admin"] });
  const result = await rebuildAppBrain();
  await createAdminClient().from("audit_log").insert({ actor: me.id, action: "brain.rebuild", detail: result });
  revalidatePath("/content");
  return result;
}

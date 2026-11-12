import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PromptVersion = { id: string; key: string; version: number; body: string; model: string; temperature: number };

/** The active version of a prompt. Every AI result stores the returned id. */
export async function getPrompt(key: string): Promise<PromptVersion> {
  const { data, error } = await createAdminClient()
    .from("prompt_versions")
    .select("id, key, version, body, model, temperature")
    .eq("key", key)
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (error || !data) throw new Error(`No active prompt for ${key}`);
  return data as PromptVersion;
}

/** Replaces {{name}} placeholders. Unknown placeholders are left visible so they're easy to spot. */
export function fill(body: string, vars: Record<string, string | number>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_GUIDE } from "./app-guide";

/**
 * The business brain: everything the help agent may answer from, split into chunks with embeddings.
 * Sources today: the app guide, lessons, skills and homeowners. Next: the Google Drive "Twelve Brain" folder.
 * Embeddings: OpenAI text-embedding-3-small at 1024 dimensions (matches content_chunks.embedding).
 */

const EMBED_MODEL = process.env.EMBED_MODEL ?? "text-embedding-3-small";
const DIMS = 1024;
const CHUNK_CHARS = 1400;

export type BrainDoc = { sourceKey: string; sourceType: string; sourceId?: string | null; title: string; url?: string | null; text: string; audience?: "all" | "staff" };
export type BrainHit = { id: string; source_key: string; title: string | null; url: string | null; text: string; similarity: number };

export async function embed(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY ?? process.env.Open_Ai_Key;
  if (!key) throw new Error("OpenAI key missing (needed for brain search).");
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 96) {
    const batch = texts.slice(i, i + 96).map((t) => t.slice(0, 8000));
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch, dimensions: DIMS }),
    });
    if (!res.ok) throw new Error(`Embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    out.push(...data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
  }
  return out;
}

/** Splits text on headings/paragraphs into ~1,400-character pieces, keeping the nearest heading with each piece. */
export function chunkText(text: string, size = CHUNK_CHARS): string[] {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const chunks: string[] = [];
  let heading = "";
  let cur = "";
  for (const b of blocks) {
    if (/^#{1,4} /.test(b)) heading = b.replace(/^#+ /, "");
    if (cur && cur.length + b.length > size) {
      chunks.push(cur);
      cur = heading && !b.startsWith("#") ? `${heading}\n\n${b}` : b;
    } else cur = cur ? `${cur}\n\n${b}` : b;
    while (cur.length > size * 1.5) {
      chunks.push(cur.slice(0, size));
      cur = cur.slice(size - 150);
    }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** Replaces all chunks for the given docs (by source key). */
export async function upsertDocs(docs: BrainDoc[]) {
  const admin = createAdminClient();
  const rows: { source_type: string; source_id: string | null; source_key: string; title: string; url: string | null; chunk_index: number; text: string; audience: string }[] = [];
  for (const d of docs) {
    chunkText(d.text).forEach((t, i) =>
      rows.push({ source_type: d.sourceType, source_id: d.sourceId ?? null, source_key: d.sourceKey, title: d.title, url: d.url ?? null, chunk_index: i, text: t, audience: d.audience ?? "all" }),
    );
  }
  const vectors = await embed(rows.map((r) => `${r.title}\n\n${r.text}`));
  const keys = [...new Set(docs.map((d) => d.sourceKey))];
  for (let i = 0; i < keys.length; i += 200) await admin.from("content_chunks").delete().in("source_key", keys.slice(i, i + 200));
  const withVec = rows.map((r, i) => ({ ...r, embedding: JSON.stringify(vectors[i]) }));
  for (let i = 0; i < withVec.length; i += 200) {
    const { error } = await admin.from("content_chunks").insert(withVec.slice(i, i + 200));
    if (error) throw new Error(`Saving brain chunks: ${error.message}`);
  }
  return rows.length;
}

/** Rebuilds the brain from what lives in the app (guide, lessons, skills, homeowners). */
export async function rebuildAppBrain() {
  const admin = createAdminClient();
  const [{ data: lessons }, { data: skills }, { data: personas }] = await Promise.all([
    admin.from("lessons").select("id, title, summary, body_md").eq("published", true),
    admin.from("skills").select("id, slug, name, stage, description, what_good_sounds_like").order("position"),
    admin.from("personas").select("id, slug, name, setting, difficulty, backstory, objections, success_condition").eq("published", true),
  ]);
  const docs: BrainDoc[] = [
    { sourceKey: "app_guide", sourceType: "app_guide", title: "How to use the Twelve app", text: APP_GUIDE },
    ...(lessons ?? []).map((l) => ({ sourceKey: `lesson:${l.id}`, sourceType: "lesson", sourceId: l.id, title: `Lesson: ${l.title}`, url: null, text: [l.summary, l.body_md].filter(Boolean).join("\n\n") })),
    {
      sourceKey: "skills",
      sourceType: "skill",
      title: "Chase's skills rubric (what good sounds like)",
      text: (skills ?? []).map((s) => `## ${s.name} (${s.stage})\n\n${s.description ?? ""}\n\nWhat good sounds like: ${s.what_good_sounds_like ?? ""}`).join("\n\n"),
    },
    ...(personas ?? []).map((p) => ({
      sourceKey: `persona:${p.id}`,
      sourceType: "persona",
      sourceId: p.id,
      title: `Practice homeowner: ${p.name}`,
      text: `${p.name} is a ${p.setting} practice homeowner (difficulty ${p.difficulty} of 5) in the Practice tab. ${p.backstory ?? ""}\nTypical objections: ${(p.objections as string[]).join("; ")}\nYou win when: ${p.success_condition ?? ""}`,
    })),
  ].filter((d) => d.text.trim());
  const n = await upsertDocs(docs);
  return { docs: docs.length, chunks: n };
}

export async function searchBrain(question: string, k = 6, includeStaff = false): Promise<BrainHit[]> {
  // First question ever: build the brain from the app's own content so the bot isn't empty.
  const { count } = await createAdminClient().from("content_chunks").select("id", { count: "exact", head: true });
  if (!count) await rebuildAppBrain();
  const [vec] = await embed([question]);
  const { data, error } = await createAdminClient().rpc("match_chunks", { query_embedding: JSON.stringify(vec), match_count: k, include_staff: includeStaff });
  if (error) throw new Error(`Brain search: ${error.message}`);
  return ((data ?? []) as BrainHit[]).filter((h) => h.similarity > 0.2);
}

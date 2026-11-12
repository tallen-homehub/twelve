import "server-only";
import { createSign } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertDocs } from "./index";

/**
 * Syncs the Google Drive "Twelve Brain" folder (and its subfolders) into the brain.
 * Auth: a Google service account (read-only Drive scope). The folder is shared with the service account's email.
 * Env: GOOGLE_SERVICE_ACCOUNT_JSON (the whole key file) and GOOGLE_DRIVE_FOLDER_ID.
 * Only files whose modified time changed are re-read; files removed from the folder are dropped from the brain.
 */

type DriveFile = { id: string; name: string; mimeType: string; modifiedTime: string; webViewLink?: string; size?: string };

const API = "https://www.googleapis.com/drive/v3";
const MAX_BYTES = 25 * 1024 * 1024;
const FOLDER = "application/vnd.google-apps.folder";
const EXPORTS: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.presentation": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
};
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function driveConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID);
}

/** Pulls the folder id out of a pasted Drive link, or accepts a bare id. */
export function folderIdFrom(value: string) {
  return value.match(/folders\/([\w-]+)/)?.[1] ?? value.match(/[?&]id=([\w-]+)/)?.[1] ?? value.trim();
}

/**
 * Reads the service-account key however it was pasted into Vercel: the raw JSON file, JSON wrapped in quotes,
 * JSON whose \n escapes became real line breaks, or base64 of the file. Only the email and private key are needed.
 */
export function readServiceAccount(raw: string | undefined): { client_email: string; private_key: string } {
  let text = (raw ?? "").trim();
  if (!text) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is empty in Vercel.");
  if (!text.includes("{") && /^[A-Za-z0-9+/=\s]+$/.test(text)) text = Buffer.from(text, "base64").toString("utf8");
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"') && !text.startsWith('"{'))) text = text.slice(1, -1);
  try {
    const j = JSON.parse(text);
    const obj = typeof j === "string" ? JSON.parse(j) : j;
    if (obj?.client_email && obj?.private_key) return { client_email: obj.client_email, private_key: cleanPem(String(obj.private_key)) };
  } catch {}
  const email = text.match(/"client_email"\s*:\s*"([^"]+)"/)?.[1];
  const pem = text.match(/-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/)?.[0];
  if (!email || !pem) {
    throw new Error(
      `Couldn't read the Google key in Vercel (${!email ? "no client_email" : "no private key"} found, ${text.length} characters). Open the downloaded .json file, select everything, and paste it as the value of GOOGLE_SERVICE_ACCOUNT_JSON.`,
    );
  }
  return { client_email: email, private_key: cleanPem(pem) };
}

/** Rebuilds a PEM private key with standard line breaks, whatever happened to its whitespace. */
function cleanPem(pem: string) {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/[^A-Za-z0-9+/=]/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
}

async function accessToken(): Promise<string> {
  const key = readServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key.private_key).toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`Google sign-in failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function listFolder(token: string, folderId: string, path = ""): Promise<(DriveFile & { path: string })[]> {
  const out: (DriveFile & { path: string })[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, modifiedTime, webViewLink, size)",
      pageSize: "200",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}/files?${params}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 404) throw new Error("Can't see the Twelve Brain folder. Share it with the service account's email (Viewer).");
    if (!res.ok) throw new Error(`Drive list failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
    const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    for (const f of data.files) {
      if (f.mimeType === FOLDER) out.push(...(await listFolder(token, f.id, `${path}${f.name} / `)));
      else out.push({ ...f, path });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return out;
}

async function readText(token: string, f: DriveFile): Promise<string | null> {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  if (EXPORTS[f.mimeType]) {
    const res = await fetch(`${API}/files/${f.id}/export?mimeType=${encodeURIComponent(EXPORTS[f.mimeType])}`, auth);
    if (!res.ok) throw new Error(`export ${res.status}`);
    return res.text();
  }
  const readable = f.mimeType === "application/pdf" || f.mimeType === DOCX || f.mimeType.startsWith("text/") || /\.(md|txt|csv)$/i.test(f.name);
  if (!readable) return null;
  if (Number(f.size ?? 0) > MAX_BYTES) throw new Error("file over 25 MB");
  const res = await fetch(`${API}/files/${f.id}?alt=media&supportsAllDrives=true`, auth);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (f.mimeType === "application/pdf") {
    const { extractText } = await import("unpdf");
    const { text } = await extractText(new Uint8Array(buf), { mergePages: true });
    return Array.isArray(text) ? text.join("\n\n") : text;
  }
  if (f.mimeType === DOCX) {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }
  return buf.toString("utf8");
}

export type SyncResult = { files: number; updated: number; removed: number; skipped: number; errors: { title: string; error: string }[] };

export async function syncDrive({ force = false } = {}): Promise<SyncResult> {
  if (!driveConfigured()) throw new Error("Google Drive isn't connected yet (GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_DRIVE_FOLDER_ID in Vercel).");
  const admin = createAdminClient();
  const token = await accessToken();
  const files = await listFolder(token, folderIdFrom(process.env.GOOGLE_DRIVE_FOLDER_ID!));
  const { data: known } = await admin.from("brain_sources").select("source_key, modified_at, status").like("source_key", "drive:%");
  const seen = new Map((known ?? []).map((k) => [k.source_key, k]));
  const result: SyncResult = { files: files.length, updated: 0, removed: 0, skipped: 0, errors: [] };

  for (const f of files) {
    const key = `drive:${f.id}`;
    const prev = seen.get(key);
    seen.delete(key);
    if (!force && prev && prev.status === "ok" && prev.modified_at && new Date(prev.modified_at).getTime() === new Date(f.modifiedTime).getTime()) continue;
    const title = `${f.path}${f.name}`;
    const base = { source_key: key, title, url: f.webViewLink ?? null, mime_type: f.mimeType, modified_at: f.modifiedTime, synced_at: new Date().toISOString() };
    try {
      const text = (await readText(token, f))?.replace(/\u0000/g, "").trim();
      if (!text) {
        result.skipped++;
        await admin.from("brain_sources").upsert({ ...base, status: "skipped", chunks: 0, error: "No readable text (images, video and audio aren't read yet)." });
        await admin.from("content_chunks").delete().eq("source_key", key);
        continue;
      }
      const chunks = await upsertDocs([{ sourceKey: key, sourceType: "drive", title, url: f.webViewLink ?? null, text }]);
      await admin.from("brain_sources").upsert({ ...base, status: "ok", chunks, error: null });
      result.updated++;
    } catch (e) {
      const error = e instanceof Error ? e.message.slice(0, 300) : "failed";
      result.errors.push({ title, error });
      await admin.from("brain_sources").upsert({ ...base, status: "error", chunks: 0, error });
    }
  }

  // Anything no longer in the folder leaves the brain.
  const gone = [...seen.keys()];
  if (gone.length) {
    await admin.from("content_chunks").delete().in("source_key", gone);
    await admin.from("brain_sources").delete().in("source_key", gone);
    result.removed = gone.length;
  }
  return result;
}

/** Turns a pasted video link into something the lesson player can show. Returns null if unsupported. */
export type VideoEmbed = { kind: "iframe" | "file"; src: string };

export function videoEmbed(url: string | null | undefined): VideoEmbed | null {
  if (!url) return null;
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}?rel=0&playsinline=1` };
  if (host.endsWith("youtube.com")) {
    const id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
    return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1` } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}?playsinline=1` } : null;
  }
  if (host.endsWith("loom.com")) {
    const id = u.pathname.match(/\/(?:share|embed)\/([\w-]+)/)?.[1];
    return id ? { kind: "iframe", src: `https://www.loom.com/embed/${id}` } : null;
  }
  if (host === "drive.google.com") {
    const id = u.pathname.match(/\/file\/d\/([\w-]+)/)?.[1] ?? u.searchParams.get("id");
    return id ? { kind: "iframe", src: `https://drive.google.com/file/d/${id}/preview` } : null;
  }
  if (/\.(mp4|mov|webm|m4v)$/i.test(u.pathname)) return { kind: "file", src: u.toString() };
  return null;
}

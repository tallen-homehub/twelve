"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Markdown from "react-markdown";
import { saveLesson } from "@/app/actions/content";
import { videoEmbed } from "@/lib/video";
import { inputCls, L, SaveBar, Toggle } from "@/components/content/kit";

type Lesson = { title: string; summary: string | null; body_md: string | null; video_url: string | null; module: string; skill_slugs: string[]; published: boolean };
const MODULES = [
  ["core", "Core"],
  ["eq", "EQ"],
  ["leadership", "Leadership"],
  ["values", "Values"],
  ["self_dev", "Self-development"],
  ["recruiting", "Recruiting"],
];

export function LessonForm({ id, lesson, skills }: { id: string | null; lesson: Lesson; skills: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [f, setF] = useState({ ...lesson, summary: lesson.summary ?? "", body_md: lesson.body_md ?? "", video_url: lesson.video_url ?? "" });
  const [preview, setPreview] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const embed = videoEmbed(f.video_url);

  const save = () =>
    start(async () => {
      const r = await saveLesson(id, f);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok && !id && r.id) router.replace(`/content/lessons/${r.id}`);
      else if (r.ok) router.refresh();
    });

  return (
    <div className="flex flex-col gap-5 pb-4">
      <L label="Title">
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} placeholder="The bill ask" />
      </L>
      <L label="One-line summary" hint="Shows under the title.">
        <input value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className={inputCls} />
      </L>
      <L label="Video link" hint="Paste a YouTube, Vimeo, Loom or Google Drive link (or a direct .mp4). Unlisted YouTube works well.">
        <input value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} className={inputCls} placeholder="https://youtu.be/…" inputMode="url" />
      </L>
      {f.video_url && !embed && <p className="-mt-3 text-sm text-red">That link won&apos;t play. Try the share link from YouTube, Vimeo, Loom or Drive.</p>}
      {embed?.kind === "iframe" && <iframe src={embed.src} title="Preview" allowFullScreen className="aspect-video w-full rounded-sm bg-ink" />}
      {embed?.kind === "file" && <video src={embed.src} controls className="aspect-video w-full rounded-sm bg-ink" />}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted">Lesson text</span>
          <button type="button" onClick={() => setPreview(!preview)} className="min-h-10 px-2 text-sm font-semibold text-tan">
            {preview ? "Edit" : "Preview"}
          </button>
        </div>
        {preview ? (
          <article className="flex min-h-64 flex-col gap-3 rounded-sm bg-charcoal p-4 leading-relaxed">
            <Markdown>{f.body_md || "_Nothing yet._"}</Markdown>
          </article>
        ) : (
          <textarea rows={16} value={f.body_md} onChange={(e) => setF({ ...f, body_md: e.target.value })} className={`${inputCls} font-mono text-sm`} placeholder={"## Why it matters\n\nWrite like you talk.\n\n- Bullet points with a dash\n- **Bold** with two stars"} />
        )}
        <span className="text-xs text-muted">## for a heading, - for bullets, **bold** for emphasis.</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <L label="Module">
          <select value={f.module} onChange={(e) => setF({ ...f, module: e.target.value })} className={inputCls}>
            {MODULES.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </L>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-muted">Skills it teaches</span>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => {
              const on = f.skill_slugs.includes(s.slug);
              return (
                <button key={s.slug} type="button" onClick={() => setF({ ...f, skill_slugs: on ? f.skill_slugs.filter((x) => x !== s.slug) : [...f.skill_slugs, s.slug] })} className={`min-h-10 rounded-sm px-3 text-xs font-semibold ${on ? "bg-tan text-ink" : "bg-charcoal"}`}>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <Toggle checked={f.published} onChange={(v) => setF({ ...f, published: v })} label="Published (reps can see it)" />
      <SaveBar pending={pending} onSave={save} msg={msg} />
    </div>
  );
}

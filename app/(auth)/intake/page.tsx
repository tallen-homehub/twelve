import { redirect } from "next/navigation";
import { getProfile, homeFor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";
import { Logo } from "@/components/Logo";
import { Field } from "@/components/ui";

const INTERESTS = ["Gym", "Sports", "Music", "Gaming", "Outdoors", "Cars", "Food", "Faith", "Family", "Travel", "Fashion", "Reading"];

async function completeIntake(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const preferred = String(formData.get("preferred_name") ?? "").trim();
  const birthday = String(formData.get("birthday") ?? "") || null;
  const interests = formData.getAll("interests").map(String);
  const other = String(formData.get("interests_other") ?? "").trim();
  if (other) interests.push(...other.split(",").map((s) => s.trim()).filter(Boolean));
  const goals = String(formData.get("goals") ?? "").trim() || null;
  const shirt = String(formData.get("shirt_size") ?? "") || null;

  await supabase.from("intake_responses").upsert({
    profile_id: user.id,
    answers: { preferred_name: preferred, birthday, interests, goals, shirt_size: shirt },
    completed_at: new Date().toISOString(),
  });

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_name: preferred || null, birthday, interests, goals, status: "active", track_started_on: todayISO() })
    .eq("id", user.id);
  if (error) throw new Error(error.message);

  redirect("/");
}

export default async function IntakePage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "invited") redirect(homeFor(profile));

  const input = "w-full rounded-xl bg-charcoal px-4 py-4 text-lg outline-none ring-tan focus:ring-2";

  return (
    <main className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col gap-8 px-6 py-10">
      <Logo width={140} />
      <header>
        <h1 className="font-display text-4xl font-black leading-none uppercase">welcome to twelve.</h1>
        {/* TODO-VOICE: rewrite in Chase's voice once the voice profile exists */}
        <p className="mt-3 text-muted">Two minutes so we know who you are, not just what you sell.</p>
      </header>

      <form action={completeIntake} className="flex flex-col gap-6">
        <Field label="What should we call you?">
          <input name="preferred_name" defaultValue={profile.full_name.split(" ")[0]} required className={input} />
        </Field>

        <Field label="Birthday">
          <input name="birthday" type="date" required className={input} />
        </Field>

        <fieldset className="flex flex-col gap-3">
          <legend className="pb-2 text-sm font-semibold text-muted">What are you into?</legend>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <label key={i} className="cursor-pointer">
                <input type="checkbox" name="interests" value={i} className="peer sr-only" />
                <span className="inline-block rounded-full bg-charcoal px-4 py-3 peer-checked:bg-tan peer-checked:text-ink">{i}</span>
              </label>
            ))}
          </div>
          <input name="interests_other" placeholder="Anything else? Separate with commas" className={input} />
        </fieldset>

        <Field label="What's your goal this year?">
          <textarea name="goals" rows={3} placeholder="Pay off my truck, six figures, buy a house…" className={input} />
        </Field>

        <Field label="T-shirt size">
          <select name="shirt_size" className={input} defaultValue="">
            <option value="" disabled>
              Pick one
            </option>
            {["S", "M", "L", "XL", "XXL"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>

        <button className="min-h-12 w-full rounded-xl bg-tan px-5 py-4 text-lg font-bold text-ink">Start day 1</button>
      </form>
    </main>
  );
}

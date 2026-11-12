import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "rep" | "leader" | "coach" | "admin";
export type RepType = "setter" | "closer" | "self_gen";

export type Profile = {
  id: string;
  role: Role;
  rep_type: RepType | null;
  full_name: string;
  preferred_name: string | null;
  phone: string | null;
  status: "uninvited" | "invited" | "active" | "paused" | "left";
  track_id: string | null;
  track_started_on: string | null;
  leader_id: string | null;
};

export const STAFF_ROLES: Role[] = ["coach", "admin"];

export function isStaff(role: Role) {
  return STAFF_ROLES.includes(role);
}

export function firstName(p: Pick<Profile, "preferred_name" | "full_name">) {
  return p.preferred_name || p.full_name.split(" ")[0] || "there";
}

/** The signed-in user's profile, or null when signed out. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role, rep_type, full_name, preferred_name, phone, status, track_id, track_started_on, leader_id")
    .eq("id", user.id)
    .single();
  return (data as Profile) ?? null;
}

/** Where a signed-in person belongs right now. */
export function homeFor(p: Profile): string {
  if (p.status === "uninvited" || p.status === "left" || p.status === "paused") return "/not-invited";
  if (p.status === "invited") return "/intake";
  return isStaff(p.role) ? "/queue" : "/today";
}

/** Use at the top of a page: sends people who don't belong there to the right place. */
export async function requireProfile(opts: { roles?: Role[] } = {}): Promise<Profile> {
  const p = await getProfile();
  if (!p) redirect("/login");
  if (p.status !== "active") redirect(homeFor(p));
  if (opts.roles && !opts.roles.includes(p.role)) redirect(homeFor(p));
  return p;
}

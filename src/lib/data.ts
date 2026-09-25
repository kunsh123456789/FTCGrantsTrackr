import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Member, Season, TeamSettings } from "@/lib/types";

export const DEFAULT_SETTINGS: TeamSettings = {
  team_name: "FTC Grants Tracker",
  team_number: null,
  primary_color: "#2563eb",
  accent_color: "#f59e0b",
  logo_path: null,
  timezone: "America/Los_Angeles",
  team_kind: null,
  has_501c3: "unknown",
  rookie_year: null,
  city: null,
  county: null,
  updated_at: "",
};

/**
 * The signed-in person's member row, or null if signed out.
 * Creates the row on first sign-in (see ensure_member() in the migration).
 * Wrapped in cache() so it runs once per request no matter how often it's called.
 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const { data: member } = await supabase.from("members").select("*").eq("id", userId).maybeSingle<Member>();
  if (member) return member;

  const { data: created, error } = await supabase.rpc("ensure_member").single<Member>();
  if (error) throw new Error(`Could not set up your account: ${error.message}`);
  return created;
});

/** Use at the top of any page that needs a team member (viewer or above). */
export async function requireMember() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.role === "pending") redirect("/pending");
  return member;
}

export async function requireAdmin() {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/");
  return member;
}

export const getTeamSettings = cache(async (): Promise<TeamSettings> => {
  if (!isSupabaseConfigured) return DEFAULT_SETTINGS;
  const supabase = await createClient();
  const { data } = await supabase.from("team_settings").select("*").maybeSingle<TeamSettings>();
  return data ?? DEFAULT_SETTINGS;
});

export const getCurrentSeason = cache(async (): Promise<Season | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("seasons").select("*").eq("is_current", true).maybeSingle<Season>();
  return data;
});

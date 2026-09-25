"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

function text(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function money(formData: FormData, key: string): number | null | "invalid" {
  const raw = text(formData, key);
  if (raw == null) return null;
  const n = Number(raw.replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : "invalid";
}

const HEX = /^#[0-9a-fA-F]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function updateTeamSettings(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const teamName = text(formData, "team_name");
  const primary = text(formData, "primary_color") ?? "";
  const accent = text(formData, "accent_color") ?? "";
  const timezone = text(formData, "timezone") ?? "America/Los_Angeles";
  const rookieYearRaw = text(formData, "rookie_year");
  const rookieYear = rookieYearRaw ? Number(rookieYearRaw) : null;
  const teamKind = text(formData, "team_kind");
  const has501c3 = text(formData, "has_501c3") ?? "unknown";

  if (!teamName) return { error: "Team name can't be empty." };
  if (!HEX.test(primary) || !HEX.test(accent)) return { error: "Colors must look like #1a2b3c." };
  if (!Intl.supportedValuesOf("timeZone").includes(timezone) && timezone !== "UTC") {
    return { error: "Pick a timezone from the list." };
  }
  if (rookieYear != null && (!Number.isInteger(rookieYear) || rookieYear < 2004 || rookieYear > 2100)) {
    return { error: "Rookie year should be a year like 2019." };
  }
  if (teamKind && !["school", "community"].includes(teamKind)) return { error: "Invalid team type." };
  if (!["yes", "no", "unknown"].includes(has501c3)) return { error: "Invalid 501(c)(3) value." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_settings")
    .update({
      team_name: teamName,
      team_number: text(formData, "team_number"),
      primary_color: primary.toLowerCase(),
      accent_color: accent.toLowerCase(),
      timezone,
      team_kind: teamKind,
      has_501c3: has501c3,
      rookie_year: rookieYear,
      city: text(formData, "city"),
      county: text(formData, "county"),
    })
    .eq("id", true);

  if (error) return { error: error.message };
  // Team name and colors appear on every page.
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

function readSeason(formData: FormData) {
  const name = text(formData, "name");
  const startsOn = text(formData, "starts_on") ?? "";
  const endsOn = text(formData, "ends_on") ?? "";
  const goal = money(formData, "fundraising_goal");
  if (!name) return { error: "Season name can't be empty." } as const;
  if (!DATE.test(startsOn) || !DATE.test(endsOn)) return { error: "Pick a start and end date." } as const;
  if (endsOn <= startsOn) return { error: "The season must end after it starts." } as const;
  if (goal === "invalid") return { error: "Fundraising goal must be a positive number." } as const;
  return {
    values: {
      name,
      starts_on: startsOn,
      ends_on: endsOn,
      fundraising_goal: goal,
      notes: text(formData, "notes"),
    },
  } as const;
}

export async function createSeason(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = readSeason(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("seasons").insert(parsed.values);
  if (error) {
    return { error: error.code === "23505" ? "A season with that name already exists." : error.message };
  }
  revalidatePath("/", "layout");
  return { message: `Added ${parsed.values.name}.` };
}

export async function updateSeason(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) return { error: "Missing season." };
  const parsed = readSeason(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.from("seasons").update(parsed.values).eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "A season with that name already exists." : error.message };
  }
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function makeSeasonCurrent(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = text(formData, "id");
  if (!id) return { error: "Missing season." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_current_season", { season: id });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { message: "Current season changed." };
}

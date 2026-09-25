// Row types for the tables used so far. They mirror supabase/migrations/*.sql.

export type MemberRole = "admin" | "editor" | "viewer" | "pending";
export type TriState = "yes" | "no" | "unknown";
export type TeamKind = "school" | "community";

export interface Member {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: MemberRole;
  created_at: string;
  updated_at: string;
}

export interface Invite {
  email: string;
  role: Exclude<MemberRole, "pending">;
  invited_by: string | null;
  created_at: string;
}

export interface TeamSettings {
  team_name: string;
  team_number: string | null;
  primary_color: string;
  accent_color: string;
  logo_path: string | null;
  timezone: string;
  team_kind: TeamKind | null;
  has_501c3: TriState;
  rookie_year: number | null;
  city: string | null;
  county: string | null;
  updated_at: string;
}

export interface Season {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  fundraising_goal: number | null;
  is_current: boolean;
  notes: string | null;
  created_at: string;
}

// What every Server Action returns, so forms can show a message.
export type ActionResult = { error?: string; message?: string } | undefined;

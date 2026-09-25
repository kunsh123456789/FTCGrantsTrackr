"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MemberRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/utils";

const ASSIGNABLE: MemberRole[] = ["admin", "editor", "viewer"];

function readRole(formData: FormData) {
  const role = String(formData.get("role") ?? "") as MemberRole;
  return ASSIGNABLE.includes(role) ? role : null;
}

function friendly(message: string) {
  // Raised by the protect_last_admin trigger.
  if (message.includes("at least one admin")) {
    return "The team needs at least one admin. Make someone else an admin first.";
  }
  return message;
}

export async function inviteMember(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = readRole(formData);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That doesn't look like an email address." };
  if (!role) return { error: "Pick a role." };

  const supabase = await createClient();

  // Already signed in once? Then just set their role.
  const { data: existing } = await supabase.from("members").select("id").eq("email", email).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("members").update({ role }).eq("id", existing.id);
    if (error) return { error: friendly(error.message) };
    revalidatePath("/members");
    return { message: `${email} already signed in — they're now ${ROLE_LABELS[role].toLowerCase()}.` };
  }

  const { error } = await supabase.from("invites").upsert({ email, role, invited_by: admin.id });
  if (error) return { error: error.message };
  revalidatePath("/members");
  return {
    message: `Invited ${email}. They get access the first time they sign in with that Google account.`,
  };
}

export async function setMemberRole(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const memberId = String(formData.get("member_id") ?? "");
  const role = readRole(formData);
  if (!memberId || !role) return { error: "Pick a role." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("members").update({ role }).eq("id", memberId).select("id");
  if (error) return { error: friendly(error.message) };
  if (!data?.length) return { error: "Member not found." };
  revalidatePath("/", "layout");
  return { message: `Changed to ${ROLE_LABELS[role].toLowerCase()}.` };
}

export async function removeMember(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const memberId = String(formData.get("member_id") ?? "");
  if (!memberId) return { error: "Missing member." };
  if (memberId === admin.id) return { error: "You can't remove yourself." };

  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) return { error: friendly(error.message) };
  revalidatePath("/members");
  return { message: "Removed." };
}

export async function cancelInvite(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.from("invites").delete().eq("email", email);
  if (error) return { error: error.message };
  revalidatePath("/members");
  return { message: "Invite cancelled." };
}

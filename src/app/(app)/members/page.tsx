import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { requireMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Invite, Member } from "@/lib/types";
import { ROLE_DESCRIPTIONS } from "@/lib/utils";
import { InviteForm, InviteList, MemberList, PendingList } from "./members-ui";

export const metadata: Metadata = { title: "Members" };

const ROLE_ORDER = { admin: 0, editor: 1, viewer: 2, pending: 3 };

export default async function MembersPage() {
  const me = await requireMember();
  const isAdmin = me.role === "admin";
  const supabase = await createClient();

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("members").select("*").order("created_at").overrideTypes<Member[], { merge: false }>(),
    isAdmin
      ? supabase.from("invites").select("*").order("created_at").overrideTypes<Invite[], { merge: false }>()
      : Promise.resolve({ data: [] as Invite[] }),
  ]);

  const all = members ?? [];
  const pending = all.filter((m) => m.role === "pending");
  const active = all
    .filter((m) => m.role !== "pending")
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email),
    );

  return (
    <>
      <PageHeader title="Members" description="Who can see and edit the team's grants." />
      <div className="flex flex-col gap-6">
        {isAdmin && pending.length > 0 && (
          <Card className="border-warning/50">
            <CardHeader
              title={`Waiting for approval (${pending.length})`}
              description="These people signed in but aren't on the team yet. They can't see anything until you approve them."
            />
            <PendingList members={pending} />
          </Card>
        )}

        {isAdmin && (
          <Card>
            <CardHeader
              title="Invite someone"
              description="Enter the Google account they'll sign in with. They get access automatically on their first sign-in."
            />
            <InviteForm />
            <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-3">
              {(["viewer", "editor", "admin"] as const).map((role) => (
                <div key={role} className="rounded-lg bg-muted p-3">
                  <dt className="font-medium capitalize">{role}</dt>
                  <dd className="text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        <Card>
          <CardHeader title={`Team (${active.length})`} />
          <MemberList members={active} meId={me.id} isAdmin={isAdmin} />
        </Card>

        {isAdmin && invites && invites.length > 0 && (
          <Card>
            <CardHeader title={`Invited (${invites.length})`} />
            <InviteList invites={invites} />
          </Card>
        )}
      </div>
    </>
  );
}

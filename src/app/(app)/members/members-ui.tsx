"use client";

import { useActionState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { formatDate, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/utils";
import type { Invite, Member } from "@/lib/types";
import { cancelInvite, inviteMember, removeMember, setMemberRole } from "./actions";

const ROLE_TONE = { admin: "brand", editor: "success", viewer: "neutral", pending: "warning" } as const;

function RoleOptions() {
  return (
    <>
      <option value="viewer">Viewer</option>
      <option value="editor">Editor</option>
      <option value="admin">Admin</option>
    </>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
        <Field label="Google account email" htmlFor="invite-email">
          <Input id="invite-email" name="email" type="email" placeholder="teammate@gmail.com" required />
        </Field>
        <Field label="Role" htmlFor="invite-role">
          <Select id="invite-role" name="role" defaultValue="editor">
            <RoleOptions />
          </Select>
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Inviting…" : "Invite"}
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

function PendingActions({ member }: { member: Member }) {
  const [approveState, approve, approving] = useActionState(setMemberRole, undefined);
  const [removeState, remove, removing] = useActionState(removeMember, undefined);
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <form action={approve} className="flex gap-2">
          <input type="hidden" name="member_id" value={member.id} />
          <Button type="submit" size="sm" name="role" value="viewer" variant="outline" disabled={approving}>
            Approve as viewer
          </Button>
          <Button type="submit" size="sm" name="role" value="editor" disabled={approving}>
            Approve as editor
          </Button>
        </form>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm(`Decline ${member.email}?`)) e.preventDefault();
          }}
        >
          <input type="hidden" name="member_id" value={member.id} />
          <Button type="submit" size="sm" variant="ghost" disabled={removing}>
            Decline
          </Button>
        </form>
      </div>
      <FormMessage state={approveState ?? removeState} />
    </div>
  );
}

function MemberActions({ member }: { member: Member }) {
  const [roleState, changeRole, changing] = useActionState(setMemberRole, undefined);
  const [removeState, remove, removing] = useActionState(removeMember, undefined);
  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <form action={changeRole}>
          <input type="hidden" name="member_id" value={member.id} />
          <Select
            name="role"
            aria-label={`Role for ${member.email}`}
            defaultValue={member.role}
            disabled={changing}
            className="h-8 w-28"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <RoleOptions />
          </Select>
        </form>
        <form
          action={remove}
          onSubmit={(e) => {
            if (!confirm(`Remove ${member.email} from the team? They'll lose access right away.`))
              e.preventDefault();
          }}
        >
          <input type="hidden" name="member_id" value={member.id} />
          <Button type="submit" size="sm" variant="ghost" disabled={removing} className="text-danger">
            Remove
          </Button>
        </form>
      </div>
      <FormMessage state={roleState ?? removeState} />
    </div>
  );
}

function MemberIdentity({ member, isYou }: { member: Member; isYou: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={member.full_name} email={member.email} />
      <div className="min-w-0">
        <p className="truncate font-medium">
          {member.full_name ?? member.email}
          {isYou && <span className="font-normal text-muted-foreground"> (you)</span>}
        </p>
        <p className="truncate text-sm text-muted-foreground">{member.email}</p>
      </div>
    </div>
  );
}

export function PendingList({ members }: { members: Member[] }) {
  return (
    <ul className="divide-y">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <MemberIdentity member={m} isYou={false} />
          <PendingActions member={m} />
        </li>
      ))}
    </ul>
  );
}

export function MemberList({
  members,
  meId,
  isAdmin,
}: {
  members: Member[];
  meId: string;
  isAdmin: boolean;
}) {
  return (
    <ul className="divide-y">
      {members.map((m) => (
        <li
          key={m.id}
          className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
        >
          <MemberIdentity member={m} isYou={m.id === meId} />
          {isAdmin && m.id !== meId ? (
            <MemberActions member={m} />
          ) : (
            <Badge
              tone={ROLE_TONE[m.role]}
              title={ROLE_DESCRIPTIONS[m.role]}
              className="self-start sm:self-center"
            >
              {ROLE_LABELS[m.role]}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}

function InviteRow({ invite }: { invite: Invite }) {
  const [state, action, pending] = useActionState(cancelInvite, undefined);
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">{invite.email}</p>
        <p className="text-sm text-muted-foreground">
          {ROLE_LABELS[invite.role]} · invited {formatDate(invite.created_at.slice(0, 10))} · hasn&apos;t
          signed in yet
        </p>
      </div>
      <form action={action} className="flex items-center gap-2">
        <input type="hidden" name="email" value={invite.email} />
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>
          Cancel invite
        </Button>
        <FormMessage state={state} />
      </form>
    </li>
  );
}

export function InviteList({ invites }: { invites: Invite[] }) {
  return (
    <ul className="divide-y">
      {invites.map((invite) => (
        <InviteRow key={invite.email} invite={invite} />
      ))}
    </ul>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { formatDate, formatMoney } from "@/lib/utils";
import type { Season } from "@/lib/types";
import { createSeason, makeSeasonCurrent, updateSeason } from "./actions";

function SeasonFields({ season, idPrefix }: { season?: Partial<Season>; idPrefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name" htmlFor={`${idPrefix}-name`}>
        <Input
          id={`${idPrefix}-name`}
          name="name"
          defaultValue={season?.name ?? ""}
          required
          maxLength={40}
        />
      </Field>
      <Field label="Fundraising goal ($)" htmlFor={`${idPrefix}-goal`} hint="Cash only.">
        <Input
          id={`${idPrefix}-goal`}
          name="fundraising_goal"
          inputMode="decimal"
          placeholder="e.g. 8000"
          defaultValue={season?.fundraising_goal ?? ""}
        />
      </Field>
      <Field label="Starts" htmlFor={`${idPrefix}-start`}>
        <Input
          id={`${idPrefix}-start`}
          name="starts_on"
          type="date"
          defaultValue={season?.starts_on ?? ""}
          required
        />
      </Field>
      <Field label="Ends" htmlFor={`${idPrefix}-end`}>
        <Input
          id={`${idPrefix}-end`}
          name="ends_on"
          type="date"
          defaultValue={season?.ends_on ?? ""}
          required
        />
      </Field>
    </div>
  );
}

function SeasonRow({ season, canEdit }: { season: Season; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [saveState, saveAction, saving] = useActionState(
    async (prev: Parameters<typeof updateSeason>[0], fd: FormData) => {
      const result = await updateSeason(prev, fd);
      if (!result?.error) setEditing(false);
      return result;
    },
    undefined,
  );
  const [currentState, currentAction, switching] = useActionState(makeSeasonCurrent, undefined);

  return (
    <li className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {season.name}
            {season.is_current && <Badge tone="brand">Current</Badge>}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatDate(season.starts_on)} – {formatDate(season.ends_on)} · Goal{" "}
            {formatMoney(season.fundraising_goal)}
          </p>
        </div>
        {canEdit && !editing && (
          <div className="flex flex-wrap gap-2">
            {!season.is_current && (
              <form action={currentAction}>
                <input type="hidden" name="id" value={season.id} />
                <Button type="submit" variant="outline" size="sm" disabled={switching}>
                  Make current
                </Button>
              </form>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
          </div>
        )}
      </div>
      <FormMessage state={currentState} />
      {!editing && <FormMessage state={saveState} />}
      {editing && (
        <form action={saveAction} className="mt-4 flex flex-col gap-3 border-t pt-4">
          <input type="hidden" name="id" value={season.id} />
          <SeasonFields season={season} idPrefix={`season-${season.id}`} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <FormMessage state={saveState} />
          </div>
        </form>
      )}
    </li>
  );
}

/** Suggest the season after the latest one, e.g. 2027–2028, Sept 1 – Aug 31. */
function nextSeasonDefaults(seasons: Season[]): Partial<Season> {
  const latest = [...seasons].sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0];
  const startYear = latest ? Number(latest.starts_on.slice(0, 4)) + 1 : new Date().getFullYear();
  return {
    name: `${startYear}–${startYear + 1}`,
    starts_on: `${startYear}-09-01`,
    ends_on: `${startYear + 1}-08-31`,
  };
}

export function Seasons({ seasons, canEdit }: { seasons: Season[]; canEdit: boolean }) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: Parameters<typeof createSeason>[0], fd: FormData) => {
      const result = await createSeason(prev, fd);
      if (!result?.error) setAdding(false);
      return result;
    },
    undefined,
  );

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {seasons.map((season) => (
          <SeasonRow key={season.id} season={season} canEdit={canEdit} />
        ))}
      </ul>
      {canEdit &&
        (adding ? (
          <form action={action} className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
            <p className="font-medium">New season</p>
            <SeasonFields season={nextSeasonDefaults(seasons)} idPrefix="new-season" />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Adding…" : "Add season"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <FormMessage state={state} />
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setAdding(true)}>
              Add a season
            </Button>
            <FormMessage state={state} />
          </div>
        ))}
    </div>
  );
}

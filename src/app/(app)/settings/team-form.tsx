"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { readableTextOn } from "@/lib/utils";
import type { TeamSettings } from "@/lib/types";
import { updateTeamSettings } from "./actions";

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Phoenix",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "Pacific/Honolulu",
];

/** Show a new color everywhere immediately, before it's saved. */
function preview(variable: string, value: string) {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
  const root = document.documentElement.style;
  root.setProperty(variable, value);
  root.setProperty(`${variable}-foreground`, readableTextOn(value));
}

function ColorField({
  name,
  label,
  cssVariable,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  cssVariable: string;
  defaultValue: string;
  disabled: boolean;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          defaultValue={defaultValue}
          disabled={disabled}
          onChange={(e) => {
            const text = document.getElementById(name) as HTMLInputElement | null;
            if (text) text.value = e.target.value;
            preview(cssVariable, e.target.value);
          }}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border bg-card p-1 disabled:cursor-not-allowed"
        />
        <Input
          id={name}
          name={name}
          defaultValue={defaultValue}
          disabled={disabled}
          pattern="#[0-9a-fA-F]{6}"
          title="A hex color like #1a2b3c"
          className="font-mono"
          onChange={(e) => preview(cssVariable, e.target.value)}
          required
        />
      </div>
    </Field>
  );
}

function TeamFields({
  settings,
  timezones,
  canEdit,
}: {
  settings: TeamSettings;
  timezones: string[];
  canEdit: boolean;
}) {
  const otherZones = timezones.filter((tz) => !COMMON_TIMEZONES.includes(tz));
  return (
    <>
      <fieldset disabled={!canEdit} className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">Team identity</legend>
        <Field label="Team name" htmlFor="team_name">
          <Input id="team_name" name="team_name" defaultValue={settings.team_name} required maxLength={80} />
        </Field>
        <Field label="Team number" htmlFor="team_number" hint="Your FTC team number, e.g. 12345">
          <Input
            id="team_number"
            name="team_number"
            defaultValue={settings.team_number ?? ""}
            inputMode="numeric"
            maxLength={10}
          />
        </Field>
        <ColorField
          name="primary_color"
          label="Main team color"
          cssVariable="--brand"
          defaultValue={settings.primary_color}
          disabled={!canEdit}
        />
        <ColorField
          name="accent_color"
          label="Accent color"
          cssVariable="--brand-accent"
          defaultValue={settings.accent_color}
          disabled={!canEdit}
        />
        <Field
          label="Timezone"
          htmlFor="timezone"
          hint="Deadlines are shown in this timezone."
          className="sm:col-span-2"
        >
          <Select id="timezone" name="timezone" defaultValue={settings.timezone}>
            <optgroup label="United States">
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </optgroup>
            <optgroup label="Everywhere else">
              {otherZones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, " ")}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
      </fieldset>

      <div className="border-t pt-6">
        <h3 className="text-sm font-medium" id="team-facts">
          Team facts
        </h3>
        <p className="text-sm text-muted-foreground">
          Used later to flag grants you&apos;re probably not eligible for.
        </p>
      </div>
      <fieldset disabled={!canEdit} aria-labelledby="team-facts" className="grid gap-4 sm:grid-cols-2">
        <Field label="Team type" htmlFor="team_kind">
          <Select id="team_kind" name="team_kind" defaultValue={settings.team_kind ?? ""}>
            <option value="">Not set</option>
            <option value="school">School-affiliated</option>
            <option value="community">Community team</option>
          </Select>
        </Field>
        <Field
          label="501(c)(3) status"
          htmlFor="has_501c3"
          hint="Yes if your team, school or a fiscal sponsor can receive tax-deductible donations."
        >
          <Select id="has_501c3" name="has_501c3" defaultValue={settings.has_501c3}>
            <option value="unknown">Not sure</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </Field>
        <Field label="Rookie year" htmlFor="rookie_year" hint="The season your team started.">
          <Input
            id="rookie_year"
            name="rookie_year"
            type="number"
            min={2004}
            max={2100}
            defaultValue={settings.rookie_year ?? ""}
          />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={settings.city ?? ""} maxLength={80} />
        </Field>
        <Field label="County" htmlFor="county">
          <Input id="county" name="county" defaultValue={settings.county ?? ""} maxLength={80} />
        </Field>
      </fieldset>
    </>
  );
}

export function TeamForm({
  settings,
  timezones,
  canEdit,
}: {
  settings: TeamSettings;
  timezones: string[];
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(updateTeamSettings, undefined);

  return (
    <form action={action} className="flex flex-col gap-6">
      {/* React resets a form after its action runs, and <select>s would snap back
          to their first-render value. Remounting on each save shows saved values. */}
      <TeamFields key={settings.updated_at} settings={settings} timezones={timezones} canEdit={canEdit} />
      {canEdit ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save team settings"}
          </Button>
          <FormMessage state={state} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Only admins can change team settings.</p>
      )}
    </form>
  );
}

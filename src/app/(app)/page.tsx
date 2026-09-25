import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentSeason, getTeamSettings, requireMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/utils";

const ROADMAP = [
  { phase: 1, title: "Setup, sign-in, team settings", done: true },
  { phase: 2, title: "Grants: add/edit, table view, detail page, spreadsheet import" },
  { phase: 3, title: "Dashboard stats, Kanban pipeline, calendar + Google Calendar feed" },
  { phase: 4, title: "Season rollover and answer library" },
  { phase: 5, title: "Budget, outreach log, sponsor recognition, exports, link checker" },
];

export default async function DashboardPage() {
  const member = await requireMember();
  const [settings, season] = await Promise.all([getTeamSettings(), getCurrentSeason()]);

  let setupSteps: { label: string; done: boolean; href: string }[] = [];
  if (member.role === "admin") {
    const supabase = await createClient();
    const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("invites").select("*", { count: "exact", head: true }),
    ]);
    setupSteps = [
      {
        label: "Set your team name, number and colors",
        done: settings.team_name !== "Our FTC Team",
        href: "/settings",
      },
      {
        label: "Set this season's fundraising goal",
        done: season?.fundraising_goal != null,
        href: "/settings#seasons",
      },
      {
        label: "Invite teammates, mentors and parents",
        done: (memberCount ?? 0) > 1 || (inviteCount ?? 0) > 0,
        href: "/members",
      },
    ];
  }

  const firstName = member.full_name?.split(" ")[0] ?? member.email.split("@")[0];

  return (
    <>
      <PageHeader
        title={`Hi, ${firstName}!`}
        description={
          season ? (
            <>
              {settings.team_name} · Season {season.name}
            </>
          ) : (
            settings.team_name
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader title="This season" />
          {season ? (
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Season</dt>
                <dd className="mt-0.5 font-medium">{season.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fundraising goal</dt>
                <dd className="mt-0.5 font-medium">{formatMoney(season.fundraising_goal)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Starts</dt>
                <dd className="mt-0.5 font-medium">{formatDate(season.starts_on)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Ends</dt>
                <dd className="mt-0.5 font-medium">{formatDate(season.ends_on)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No current season yet.{" "}
              {member.role === "admin" && (
                <Link href="/settings#seasons" className="font-medium text-brand-text underline">
                  Add one in Settings
                </Link>
              )}
            </p>
          )}
        </Card>

        {member.role === "admin" ? (
          <Card>
            <CardHeader title="Getting started" description="A few things to set up as admin." />
            <ul className="space-y-3">
              {setupSteps.map((step) => (
                <li key={step.label}>
                  <Link href={step.href} className="group flex items-start gap-3 text-sm">
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Done" />
                    ) : (
                      <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="To do" />
                    )}
                    <span
                      className={step.done ? "text-muted-foreground line-through" : "group-hover:underline"}
                    >
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Welcome to the team tracker" />
            <p className="text-sm text-muted-foreground">
              Grants, deadlines and the pipeline will show up here as they&apos;re added.
            </p>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader title="What's being built" description="The app is being built in phases." />
          <ol className="space-y-2.5">
            {ROADMAP.map((item) => (
              <li key={item.phase} className="flex items-start gap-3 text-sm">
                <Badge tone={item.done ? "success" : "neutral"} className="mt-0.5">
                  Phase {item.phase}
                </Badge>
                <span className={item.done ? "" : "text-muted-foreground"}>{item.title}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

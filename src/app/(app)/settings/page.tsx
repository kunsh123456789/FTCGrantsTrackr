import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardHeader } from "@/components/ui/card";
import { getTeamSettings, requireMember } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Season } from "@/lib/types";
import { Seasons } from "./seasons";
import { TeamForm } from "./team-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const member = await requireMember();
  const isAdmin = member.role === "admin";
  const supabase = await createClient();
  const [settings, { data: seasons }] = await Promise.all([
    getTeamSettings(),
    supabase
      .from("seasons")
      .select("*")
      .order("starts_on", { ascending: false })
      .overrideTypes<Season[], { merge: false }>(),
  ]);

  return (
    <>
      <PageHeader title="Settings" description="Team details, colors and seasons." />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader title="Team" description="Your team name and colors show up across the app." />
          <TeamForm settings={settings} timezones={Intl.supportedValuesOf("timeZone")} canEdit={isAdmin} />
        </Card>

        <Card id="seasons" className="scroll-mt-20">
          <CardHeader
            title="Seasons"
            description="The current season is what the dashboard and pipeline show. Each season has its own fundraising goal."
          />
          <Seasons seasons={seasons ?? []} canEdit={isAdmin} />
        </Card>

        <Card>
          <CardHeader title="Appearance" description="Just for you, on this device." />
          <ThemeToggle />
        </Card>
      </div>
    </>
  );
}

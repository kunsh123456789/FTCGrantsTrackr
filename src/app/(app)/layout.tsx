import { AppShell } from "@/components/app-shell";
import { getTeamSettings, requireMember } from "@/lib/data";

// Every page inside (app)/ requires an approved team member.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [member, settings] = await Promise.all([requireMember(), getTeamSettings()]);
  return (
    <AppShell member={member} teamName={settings.team_name} teamNumber={settings.team_number}>
      {children}
    </AppShell>
  );
}

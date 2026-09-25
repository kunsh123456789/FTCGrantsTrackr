import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { getCurrentMember, getTeamSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Waiting for approval" };

export default async function PendingPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (member.role !== "pending") redirect("/");
  const settings = await getTeamSettings();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Clock className="size-6" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold">Waiting for approval</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re signed in as <strong className="text-foreground">{member.email}</strong>. Ask a{" "}
          {settings.team_name} admin to approve you on the Members page. Then come back and tap &ldquo;Check
          again&rdquo;.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className={buttonClasses("primary")}>
            Check again
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className={buttonClasses("outline")}>
              Use a different account
            </button>
          </form>
        </div>
      </div>
      <div className="mt-6">
        <ThemeToggle />
      </div>
    </main>
  );
}

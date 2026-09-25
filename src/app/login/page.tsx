import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentMember } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  auth: "Sign-in didn't finish. Please try again.",
  account: "Signed in, but we couldn't set up your account. Ask your admin to check the database setup.",
};

function safeNext(value: string | string[] | undefined) {
  const next = typeof value === "string" ? value : "/";
  // Only allow paths on this site (blocks "//evil.com" style redirects).
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);

  if (isSupabaseConfigured && (await getCurrentMember())) redirect(next);

  const errorKey = typeof params.error === "string" ? params.error : undefined;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-brand-foreground shadow-sm">
            $
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">FTC Grants Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Grants and sponsorships for our FIRST Tech Challenge team
          </p>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          {isSupabaseConfigured ? (
            <>
              <GoogleButton next={next} />
              {errorKey && (
                <p role="alert" className="mt-3 text-sm text-danger">
                  {ERRORS[errorKey] ?? ERRORS.auth}
                </p>
              )}
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Team members only. New here? Sign in, then ask your team admin to approve you.
              </p>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="font-medium text-warning">Almost there — Supabase isn&apos;t connected yet.</p>
              <p className="text-muted-foreground">
                Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="rounded bg-muted px-1">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> to{" "}
                <code className="rounded bg-muted px-1">.env.local</code> (or to Vercel&apos;s environment
                variables), then restart or redeploy. See the README.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <ThemeToggle />
        </div>
      </div>
    </main>
  );
}

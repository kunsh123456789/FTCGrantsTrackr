"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { cn, ROLE_LABELS } from "@/lib/utils";
import type { Member } from "@/lib/types";

const NAV = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/members", label: "Members", Icon: Users },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ href, label, Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground",
              active && "bg-brand/10 text-brand-text hover:bg-brand/15 hover:text-brand-text",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserPanel({ member }: { member: Member }) {
  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center gap-3">
        <Avatar name={member.full_name} email={member.email} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{member.full_name ?? member.email}</p>
          <p className="text-xs text-muted-foreground">{ROLE_LABELS[member.role]}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <ThemeToggle />
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

function TeamMark({ teamName, teamNumber }: { teamName: string; teamNumber: string | null }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-brand px-1.5 font-bold text-brand-foreground",
          teamNumber && teamNumber.length > 3 ? "text-xs" : "text-sm",
        )}
      >
        {teamNumber ? teamNumber.slice(0, 6) : teamName.slice(0, 1).toUpperCase()}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold leading-tight">{teamName}</span>
        <span className="block text-xs text-muted-foreground">Grants tracker</span>
      </span>
    </Link>
  );
}

export function AppShell({
  member,
  teamName,
  teamNumber,
  children,
}: {
  member: Member;
  teamName: string;
  teamNumber: string | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-card p-4 lg:flex">
        <TeamMark teamName={teamName} teamNumber={teamNumber} />
        <div className="flex-1">
          <NavLinks />
        </div>
        <UserPanel member={member} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
        <TeamMark teamName={teamName} teamNumber={teamNumber} />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </header>

      {/* Mobile slide-over menu */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <UserPanel member={member} />
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

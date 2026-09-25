import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  email,
  className,
}: {
  name: string | null;
  email: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent text-sm font-semibold text-brand-accent-foreground",
        className,
      )}
    >
      {initials(name, email)}
    </span>
  );
}

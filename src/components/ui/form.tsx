import { cn } from "@/lib/utils";

const fieldClasses =
  "w-full rounded-lg border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground " +
  "focus:border-brand focus:outline-2 focus:outline-offset-0 focus:outline-brand/30 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-10", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(fieldClasses, "h-10 pr-8", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "min-h-24 py-2", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}

/** Label + control + optional hint, stacked. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Shows the { error, message } returned by a Server Action. */
export function FormMessage({ state }: { state: { error?: string; message?: string } | undefined }) {
  if (!state?.error && !state?.message) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={cn("text-sm", state.error ? "text-danger" : "text-success")}
    >
      {state.error ?? state.message}
    </p>
  );
}

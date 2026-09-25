import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-brand text-brand-foreground hover:brightness-110",
  secondary: "bg-muted text-foreground hover:bg-border",
  outline: "border bg-card text-foreground hover:bg-muted",
  ghost: "text-foreground hover:bg-muted",
  danger: "bg-danger text-white hover:brightness-110 dark:text-black",
};

const sizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9",
};

export type ButtonProps = React.ComponentProps<"button"> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function buttonClasses(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
  );
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={cn(buttonClasses(variant, size), className)} {...props} />;
}

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Badge — small status pill. Used by the candidate table for the
 * Active / Inactive status column.
 */
const VARIANTS = {
  success:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  muted: "border-border bg-muted/60 text-muted-foreground",
  destructive:
    "border-destructive/30 bg-destructive/10 text-destructive",
} as const;

export function Badge({
  variant = "muted",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}

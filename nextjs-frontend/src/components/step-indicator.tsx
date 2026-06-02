import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * StepIndicator — visual progress bar for the multi-step voting flow.
 *
 * The flow now has six visible steps, with Email OTP added at the front:
 *   1. Email     — collect address + send OTP
 *   2. OTP       — verify the 6-digit code
 *   3. CNIC      — confirm national identity
 *   4. Identity  — enter the voter's full name
 *   5. Ballot    — pick a candidate and cast the vote
 *   6. Done      — animated confirmation
 */
const STEPS = [
  { id: 1, label: "Email" },
  { id: 2, label: "OTP" },
  { id: 3, label: "Verify CNIC" },
  { id: 4, label: "Identity" },
  { id: 5, label: "Cast Vote" },
  { id: 6, label: "Done" },
] as const;

export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

export function StepIndicator({ current }: { current: StepNumber }) {
  return (
    <ol className="mx-auto mb-8 flex max-w-3xl items-center justify-between gap-1 sm:gap-2 text-xs">
      {STEPS.map((s, idx) => {
        const done = current > s.id;
        const active = current === s.id;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2 min-w-0">
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border font-semibold transition-all",
                done && "border-primary bg-primary text-primary-foreground",
                active &&
                  "border-primary bg-primary/10 text-primary ring-4 ring-primary/15",
                !done && !active && "border-border bg-card text-muted-foreground"
              )}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : s.id}
            </div>
            <span
              className={cn(
                "hidden md:inline font-medium truncate",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 transition-colors",
                  done ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

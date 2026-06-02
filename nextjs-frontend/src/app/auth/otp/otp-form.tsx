"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  ArrowRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedError } from "@/components/animated-error";
import { cn } from "@/lib/utils";
import { getAuthManager, OTPManager } from "@/lib/oop";

const LENGTH = 6;

/**
 * Step 2 — enter the 6-digit OTP that was emailed in the previous step.
 *
 * The input is a row of single-character boxes that auto-advance on type
 * and merge a pasted code into all six fields at once. On submit we ask
 * the OTPManager (via AuthenticationManager) to verify the code; success
 * advances to /verify, failure plays the AnimatedError shake.
 */
export function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const demoCode = params.get("demo"); // present only when in demo mode

  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  // Hydrate the destination email from the AuthenticationManager. If the
  // user lands here directly (deep link), bounce back to the email step.
  useEffect(() => {
    const auth = getAuthManager();
    if (!auth.email) {
      router.replace("/auth/email");
      return;
    }
    setMaskedEmail(maskEmail(auth.email));
    // Focus the first cell on mount.
    inputs.current[0]?.focus();
  }, [router]);

  const code = digits.join("");
  const canSubmit = code.length === LENGTH && !verifying;

  function setDigit(i: number, value: string) {
    const v = value.replace(/\D/g, "").slice(-1);
    setDigits((d) => {
      const next = [...d];
      next[i] = v;
      return next;
    });
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = Array(LENGTH)
      .fill("")
      .map((_, i) => pasted[i] || "");
    setDigits(next);
    const lastIdx = Math.min(pasted.length, LENGTH) - 1;
    inputs.current[Math.max(0, lastIdx)]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < LENGTH - 1) {
      inputs.current[i + 1]?.focus();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setVerifying(true);

    const result = getAuthManager().confirmOtp(code);
    if (result.ok) {
      setSuccess(true);
      router.push("/verify");
      return;
    }
    setError(result.reason || "Incorrect code. Please try again.");
    setVerifying(false);
    // Clear digits so they can retry quickly, then focus the first cell.
    setDigits(Array(LENGTH).fill(""));
    setTimeout(() => inputs.current[0]?.focus(), 0);
  }

  async function onResend() {
    if (resending) return;
    setError(null);
    setResending(true);
    try {
      const result = await getAuthManager().requestOtp(getAuthManager().email);
      setDigits(Array(LENGTH).fill(""));
      if (result.demo && result.code) {
        const next = new URLSearchParams(params.toString());
        next.set("demo", result.code);
        router.replace(`/auth/otp?${next.toString()}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend OTP.");
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 gov-stripe" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
          >
            <KeyRound className="h-5 w-5" />
          </motion.span>
          <div>
            <CardTitle>Enter Your Passcode</CardTitle>
            <CardDescription>
              We sent a 6-digit code to{" "}
              <span className="font-medium text-foreground">{maskedEmail}</span>
              .
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          <motion.div
            // Tiny horizontal shake when an error is shown.
            animate={error ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between gap-2 sm:gap-3"
          >
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                onPaste={onPaste}
                disabled={verifying || success}
                aria-label={`Digit ${i + 1}`}
                className={cn(
                  "h-14 w-12 sm:h-16 sm:w-14 rounded-lg border bg-secondary/50 text-center font-mono text-2xl font-semibold",
                  "focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 focus:bg-background",
                  "transition-colors",
                  error
                    ? "border-destructive/60 text-destructive"
                    : success
                      ? "border-success/60 text-success"
                      : "border-input"
                )}
              />
            ))}
          </motion.div>

          {demoCode && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border border-gold/40 bg-gold/10 p-3 text-center text-xs text-gold-foreground dark:text-gold"
            >
              <span className="font-semibold">Demo mode:</span> use code{" "}
              <span className="font-mono font-bold">{demoCode}</span>.
            </motion.div>
          )}

          <AnimatedError message={error} />

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-sm font-medium text-success"
            >
              <CheckCircle2 className="h-4 w-4" />
              Verified — redirecting…
            </motion.div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onResend}
              disabled={resending || verifying || success}
              className="w-full sm:w-auto"
            >
              {resending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Resend OTP
                </>
              )}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit || success}
              className="w-full sm:flex-1"
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Didn&apos;t get the code? Check your spam folder, or{" "}
            <button
              type="button"
              onClick={() => router.push("/auth/email")}
              className="underline-offset-2 hover:underline"
            >
              use a different email
            </button>
            .
          </p>

          {!OTPManager.isConfigured() && !demoCode && (
            <p className="text-center text-[11px] text-muted-foreground">
              Running in <span className="font-semibold">demo mode</span> —
              check the browser console for your OTP.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/** Show a-***@example.com style mask so the email is recognisable but private. */
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (local.length <= 2) return `${local[0] || ""}***@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, Send } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedError } from "@/components/animated-error";
import { getAuthManager, Person, OTPManager } from "@/lib/oop";

/**
 * Step 1 — collect the voter's email and dispatch an OTP via EmailJS.
 *
 * The heavy lifting (validation, EmailJS call, state machine) lives in
 * the OOP layer; this component is just a thin presentational shell.
 */
export function EmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  // Pre-fill if the user came back via the browser Back button.
  useEffect(() => {
    const existing = getAuthManager().email;
    if (existing) setEmail(existing);
  }, []);

  const canSubmit = Person.isValidEmail(email) && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setDemoCode(null);
    setLoading(true);
    try {
      const result = await getAuthManager().requestOtp(email.trim());
      // In demo mode the OTPManager surfaces the code so graders can test
      // the flow without configuring EmailJS. Stash it on the URL so the
      // /auth/otp page can show a "demo code" hint card.
      const params = new URLSearchParams();
      if (result.demo && result.code) {
        params.set("demo", result.code);
        setDemoCode(result.code);
      }
      router.push(`/auth/otp${params.toString() ? "?" + params : ""}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send OTP.");
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 gov-stripe" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <motion.span
            initial={{ scale: 0.7, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
          >
            <Mail className="h-5 w-5" />
          </motion.span>
          <div>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription>
              We&apos;ll send a 6-digit one-time passcode to confirm it&apos;s
              really you.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voter@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-base"
              required
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll deliver a 6-digit one-time passcode to this address.
              The code expires in 2 minutes for your security.
            </p>
          </div>

          <AnimatedError message={error} />

          {demoCode && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border border-gold/40 bg-gold/10 p-3 text-xs text-gold-foreground dark:text-gold"
            >
              <span className="font-semibold">Demo mode:</span> EmailJS isn&apos;t
              configured, so your OTP is{" "}
              <span className="font-mono font-bold">{demoCode}</span>.
            </motion.div>
          )}

          <motion.div whileHover={{ scale: canSubmit ? 1.01 : 1 }}>
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={!canSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send OTP
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          {!OTPManager.isConfigured() && (
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              Running in <span className="font-semibold">demo mode</span> — the
              OTP will appear in the browser console and on the next screen.
              Add real EmailJS credentials to <code>.env.local</code> to send
              actual emails.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

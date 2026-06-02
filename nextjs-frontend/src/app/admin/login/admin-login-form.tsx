"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from "lucide-react";
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
import { getAdminAuthManager, Person } from "@/lib/oop";

type Props = {
  /** True when the server detected the well-known demo credentials. */
  isDefaultDemo: boolean;
  /** Pre-fill convenience for the demo email field. */
  demoEmail: string;
};

/**
 * Admin sign-in form. Reuses the same Card / gov-stripe / Framer Motion
 * conventions as the voter flow so the panel feels part of the same app.
 *
 * Credential verification happens server-side (`/api/admin/login`); the
 * `AdminAuthManager` class handles the POST and persists the resulting
 * session.
 */
export function AdminLoginForm({ isDefaultDemo, demoEmail }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the admin is already signed in (e.g. came back via browser Back),
  // skip the form and go straight to the dashboard.
  useEffect(() => {
    if (getAdminAuthManager().isLoggedIn) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  const emailOk = Person.isValidEmail(email);
  const canSubmit = emailOk && password.length >= 4 && !submitting;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await getAdminAuthManager().login(email.trim(), password);
      if (!result.ok) {
        setError(result.reason || "Invalid credentials.");
        setSubmitting(false);
        return;
      }
      router.push("/admin/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setSubmitting(false);
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
            <ShieldCheck className="h-5 w-5" />
          </motion.span>
          <div>
            <CardTitle>Administrator Sign-in</CardTitle>
            <CardDescription>
              Restricted area. Authorised platform administrators only.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Shake the whole form briefly when an error appears. */}
        <motion.form
          onSubmit={onSubmit}
          animate={error ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="admin-email">Admin Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-base"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Password</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="admin-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-10 text-base"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <AnimatedError message={error} />

          {isDefaultDemo && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-md border border-primary/30 bg-primary/10 p-3 text-xs text-primary"
            >
              <div className="font-semibold mb-0.5">Demo credentials</div>
              <div className="font-mono">
                {demoEmail || "admin@example.com"} &nbsp;·&nbsp; admin123
              </div>
              <div className="mt-1 opacity-80">
                Change these in <code>.env.local</code> for any real deployment.
              </div>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: canSubmit ? 1.01 : 1 }}>
            <Button
              type="submit"
              size="lg"
              className="w-full btn-gradient hover:opacity-95"
              disabled={!canSubmit}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Sign in to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>

          <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
            Credentials are validated server-side and never stored in the
            browser. All access is logged.
          </p>
        </motion.form>
      </CardContent>
    </Card>
  );
}

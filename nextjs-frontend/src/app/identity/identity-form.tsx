"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRound, ArrowRight, Loader2 } from "lucide-react";
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
import { api } from "@/lib/api";
import { getSession, setSession } from "@/lib/session";
import { getAuthManager } from "@/lib/oop";

export function IdentityForm() {
  const router = useRouter();
  const [cnic, setCnic] = useState<string>("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: must have passed Email + OTP + CNIC to be here.
    const auth = getAuthManager();
    if (!auth.hasPassedOtp()) {
      router.replace("/auth/email");
      return;
    }
    if (!auth.hasPassedCnic()) {
      router.replace("/verify");
      return;
    }

    // Prefer the AuthenticationManager's CNIC; fall back to legacy session.
    const s = getSession();
    const c = auth.cnic || s.cnic;
    if (!c) {
      router.replace("/verify");
      return;
    }
    setCnic(c);
    if (auth.name) setName(auth.name);
    else if (s.name) setName(s.name);
  }, [router]);

  const canSubmit = name.trim().length >= 2 && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.saveUser(cnic, name.trim());
      setSession({ cnic: res.user.cnic, name: res.user.name });
      router.push("/ballot");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not continue.");
      setLoading(false);
    }
  }

  if (!cnic) return null;

  const formatted = `${cnic.slice(0, 5)}-${cnic.slice(5, 12)}-${cnic.slice(12)}`;

  return (
    <Card className="overflow-hidden">
      <div className="h-1 gov-stripe" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Confirm Your Identity</CardTitle>
            <CardDescription>
              Please enter your full name as printed on your NIC / CNIC.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-5 rounded-md border border-border bg-secondary/50 px-4 py-3 text-sm">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            Verified NIC / CNIC
          </div>
          <div className="font-mono font-semibold text-foreground">
            {formatted}
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              autoComplete="off"
              placeholder="e.g. Ali Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base"
              required
              minLength={2}
            />
          </div>

          <AnimatedError message={error} />

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push("/verify")}
            >
              Back
            </Button>
            <Button type="submit" size="lg" disabled={!canSubmit} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  Continue <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Fingerprint, ArrowRight, Loader2 } from "lucide-react";
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
import { setSession } from "@/lib/session";
import { getAuthManager } from "@/lib/oop";

function formatCnic(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export function VerifyForm() {
  const router = useRouter();
  const [cnic, setCnic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: must have verified the OTP before reaching the CNIC step.
  useEffect(() => {
    const auth = getAuthManager();
    if (!auth.hasPassedOtp()) {
      router.replace("/auth/email");
    }
  }, [router]);

  const digits = cnic.replace(/\D/g, "");
  const canSubmit = digits.length === 13 && !loading;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyCnic(digits);
      setSession({ cnic: res.cnic });
      router.push("/identity");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
      setLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 gov-stripe" />
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Fingerprint className="h-5 w-5" />
          </span>
          <div>
            <CardTitle>Verify Your Identity</CardTitle>
            <CardDescription>
              Enter your 13-digit NIC / CNIC number to continue.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="cnic">NIC / CNIC Number</Label>
            <Input
              id="cnic"
              inputMode="numeric"
              autoComplete="off"
              placeholder="35201-1234567-1"
              value={cnic}
              onChange={(e) => setCnic(formatCnic(e.target.value))}
              className="font-mono tracking-wider text-base"
              required
            />
            <p className="text-xs text-muted-foreground">
              Format: 5 digits &mdash; 7 digits &mdash; 1 digit. Try{" "}
              <span className="font-mono">35201-1234567-1</span> for the demo.
            </p>
          </div>

          <AnimatedError message={error} />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Proceed <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Your information is encrypted and never shared with third parties.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

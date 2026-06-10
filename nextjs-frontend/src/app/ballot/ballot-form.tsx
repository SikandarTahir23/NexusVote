"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Vote, Loader2, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CandidateSymbol, isImageSymbol } from "@/components/candidate-symbol";
import { AnimatedError } from "@/components/animated-error";
import { api, type Candidate } from "@/lib/api";
import { getSession, setSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getAuthManager, voteEmailManager } from "@/lib/oop";

function CandidateSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-xl shimmer" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-2/3 shimmer rounded" />
          <div className="h-3 w-1/2 shimmer rounded" />
        </div>
      </div>
      <div className="mt-6 h-10 w-full shimmer rounded-lg" />
    </div>
  );
}

export function BallotForm() {
  const router = useRouter();
  const [cnic, setCnic] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: must have completed Email → OTP → CNIC → Name before the ballot.
    const auth = getAuthManager();
    if (!auth.hasPassedOtp()) {
      router.replace("/auth/email");
      return;
    }
    if (!auth.isAuthenticated()) {
      router.replace(auth.hasPassedCnic() ? "/identity" : "/verify");
      return;
    }

    const s = getSession();
    setCnic(auth.cnic || s.cnic || "");
    setName(auth.name || s.name || "");
    // Capture the email now — casting a vote resets the AuthenticationManager
    // (clearing auth.email), so we snapshot it before that happens to send
    // the confirmation email afterwards.
    setEmail(auth.email || s.email || "");
    api
      .candidates()
      .then((res) => setCandidates(res.candidates))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load ballot.")
      );
  }, [router]);

  async function castVote() {
    if (!selected || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.castVote(cnic, selected);

      // The vote is now recorded server-side. Send the confirmation email
      // as a best-effort follow-up: sendConfirmation() never throws, so a
      // mail failure can't roll back or block the successful vote — we just
      // log it and carry the status through to the success page.
      let mailed = false;
      try {
        const mail = await voteEmailManager.sendConfirmation({
          email,
          name,
          referenceNumber: res.receipt.reference,
          timestamp: res.receipt.timestamp,
        });
        mailed = mail.ok;
        if (!mail.ok) {
          // eslint-disable-next-line no-console
          console.error(
            "[ballot] Confirmation email not sent:",
            mail.error || (mail.skipped ? "no email on file" : "unknown error")
          );
        }
      } catch (mailErr) {
        // Defensive — sendConfirmation is designed not to throw, but never
        // let an email problem surface as a vote failure.
        // eslint-disable-next-line no-console
        console.error("[ballot] Confirmation email threw unexpectedly:", mailErr);
      }

      // Wipe legacy session + AuthenticationManager so a refreshed tab
      // can't replay the receipt.
      setSession({});
      getAuthManager().reset();
      const params = new URLSearchParams({
        ref: res.receipt.reference,
        cid: res.receipt.candidateId,
        ts: res.receipt.timestamp,
        name,
        mailed: mailed ? "1" : "0",
      });
      router.push(`/success?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cast vote.");
      setSubmitting(false);
    }
  }

  return (
    <section>
      <Card className="mb-6 overflow-hidden">
        <div className="h-1 gov-stripe" />
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Select Your Candidate</CardTitle>
            <CardDescription>
              Pick one candidate, then cast your vote. This action cannot be
              undone.
            </CardDescription>
          </div>
          {name && (
            <div className="hidden sm:block rounded-md border border-border bg-secondary/60 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Voting as
              </div>
              <div className="text-sm font-semibold">{name}</div>
            </div>
          )}
        </CardHeader>
      </Card>

      <div className="mb-4">
        <AnimatedError message={error} />
      </div>

      <motion.div
        // Replace the CSS stagger with a Framer Motion version so the
        // ballot cards float in one after another.
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
        }}
        className="grid gap-5 sm:grid-cols-2"
      >
        {!candidates &&
          Array.from({ length: 4 }).map((_, i) => (
            <CandidateSkeleton key={i} />
          ))}

        {candidates?.map((c) => {
          const isSelected = selected === c.id;
          return (
            <motion.button
              key={c.id}
              type="button"
              onClick={() => setSelected(c.id)}
              variants={{
                hidden: { opacity: 0, y: 16 },
                show: { opacity: 1, y: 0 },
              }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className={cn(
                "group relative text-left rounded-2xl border glass p-6 shadow-md shadow-primary/5 transition-shadow",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "hover:shadow-xl hover:shadow-primary/20",
                isSelected
                  ? "border-primary ring-2 ring-primary/40 shadow-xl shadow-primary/25"
                  : "border-border"
              )}
            >
              <div className="flex items-center gap-4">
                <CandidateSymbol name={c.symbol} color={c.partyColor} />
                <div className="flex-1">
                  <div className="text-lg font-semibold leading-tight">
                    {c.name}
                  </div>
                  <div
                    className="mt-1 text-xs font-medium uppercase tracking-wider"
                    style={{ color: c.partyColor }}
                  >
                    {c.party}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-6 w-6 text-primary animate-scale-in" />
                )}
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Symbol:{" "}
                  <span className="font-medium">
                    {isImageSymbol(c.symbol) ? "official image" : c.symbol}
                  </span>
                </span>
                <span>ID: {c.id}</span>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={() => router.push("/identity")}
          disabled={submitting}
        >
          Back
        </Button>
        <Button
          size="lg"
          onClick={castVote}
          disabled={!selected || submitting}
          className="w-full sm:w-auto btn-gradient hover:opacity-95"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Casting vote...
            </>
          ) : (
            <>
              <Vote className="h-4 w-4" /> Cast My Vote
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

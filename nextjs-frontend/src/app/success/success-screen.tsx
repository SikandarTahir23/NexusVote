"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function SuccessScreen() {
  const params = useSearchParams();
  const reference = params.get("ref") || "—";
  const candidateId = params.get("cid") || "—";
  const timestamp = params.get("ts");
  const name = params.get("name") || "Voter";

  const when = timestamp
    ? new Date(timestamp).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <Card className="relative overflow-hidden animate-fade-up">
      <div className="h-1 gov-stripe" />
      <CardContent className="p-10 text-center">
        <div className="relative mx-auto h-28 w-28">
          <span className="absolute inset-0 rounded-full bg-success/20 animate-pulse-ring" />
          <span className="absolute inset-2 rounded-full bg-success/30 animate-pulse-ring [animation-delay:0.4s]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="grid h-24 w-24 place-items-center rounded-full bg-success text-success-foreground shadow-xl shadow-success/30 animate-scale-in">
              <svg
                viewBox="0 0 60 60"
                className="h-14 w-14"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 31 L26 43 L46 19" className="animate-draw-check" />
              </svg>
            </div>
          </div>
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
          className="mt-8 text-3xl md:text-4xl font-semibold tracking-tight"
        >
          Your vote has been{" "}
          <span className="text-gradient">successfully casted</span>.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
          className="mt-3 text-muted-foreground"
        >
          Thank you, <span className="font-semibold text-foreground">{name}</span>.
          Your participation has been securely recorded by NexusVote.
        </motion.p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3 text-left">
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Reference No.
            </div>
            <div className="mt-1 font-mono text-sm font-semibold">
              {reference}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Candidate ID
            </div>
            <div className="mt-1 font-mono text-sm font-semibold">
              {candidateId}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-secondary/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Cast At
            </div>
            <div className="mt-1 text-sm font-semibold">{when}</div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <Button asChild variant="outline" size="lg">
            <Link href="/">
              <Home className="h-4 w-4" />
              Return to Home
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          This receipt is your proof of participation. Please keep the reference
          number for your records.
        </p>
      </CardContent>
    </Card>
  );
}

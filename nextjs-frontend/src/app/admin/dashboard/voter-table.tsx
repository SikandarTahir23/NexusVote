"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Inbox } from "lucide-react";
import { User } from "@/lib/oop";

export type VoterRow = {
  reference: string;
  candidateId: string;
  candidateName: string;
  voterCnic: string;
  voterEmail: string;
  voterName: string;
  timestamp: string;
};

type Candidate = {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  symbol: string;
};

type Props = {
  rows: VoterRow[];
  candidateById: Map<string, Candidate>;
};

/**
 * Presentational voter table. Receives already-filtered rows and renders
 * them inside a sticky-header, scrollable container. Framer Motion's
 * `AnimatePresence` animates rows entering at the top when polling picks
 * up a new vote, and animates removals on filter change.
 */
export function VoterTable({ rows, candidateById }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-primary/5">
      <div className="h-1 gov-stripe" />

      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium w-12">#</th>
              <th className="px-4 py-3 font-medium">Voter</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Email</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">CNIC</th>
              <th className="px-4 py-3 font-medium">Candidate</th>
              <th className="px-4 py-3 font-medium text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((r, idx) => {
                const candidate = candidateById.get(r.candidateId);
                const color = candidate?.partyColor || "#64748b";
                return (
                  <motion.tr
                    key={r.reference}
                    layout
                    initial={{ opacity: 0, y: -8, backgroundColor: "rgba(99, 102, 241, 0.14)" }}
                    animate={{ opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.35, ease: [0.22, 0.8, 0.2, 1] }}
                    className="border-t border-border/60 hover:bg-secondary/40"
                  >
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium leading-tight">{r.voterName || "—"}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {r.reference}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {r.voterEmail || "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs">
                      {User.formatCnic(r.voterCnic)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <div className="font-medium leading-tight">
                            {candidate?.name || r.candidateName}
                          </div>
                          {candidate?.party && (
                            <div
                              className="text-[10px] uppercase tracking-wider font-medium"
                              style={{ color }}
                            >
                              {candidate.party}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground tabular-nums">
                      <span title={r.timestamp}>{formatRelative(r.timestamp)}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>

        {rows.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground"
          >
            <Inbox className="h-8 w-8 opacity-60" />
            <p className="text-sm">No votes match your filters.</p>
            <p className="text-xs">
              Try clearing the search or selecting a different candidate.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/** Compact relative time: "12s ago", "4m ago", "2h ago", or absolute date. */
function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

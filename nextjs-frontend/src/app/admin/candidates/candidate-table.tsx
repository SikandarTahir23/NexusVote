"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Loader2, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API_ORIGIN, type AdminCandidate } from "@/lib/api";

/**
 * CandidateTable — the professional roster table for the admin panel.
 *
 * Columns: symbol (uploaded image or emoji), candidate (+ description
 * snippet), party, live vote count, status badge, edit/delete actions.
 * Visual language matches voter-table.tsx: glass card, gov-stripe top
 * bar, sticky header, animated row enter/exit.
 */
export function CandidateTable({
  candidates,
  loading,
  onEdit,
  onDelete,
}: {
  candidates: AdminCandidate[];
  loading: boolean;
  onEdit: (c: AdminCandidate) => void;
  onDelete: (c: AdminCandidate) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="overflow-hidden rounded-2xl border border-border glass shadow-md shadow-primary/5 gov-stripe"
    >
      <div className="max-h-[60vh] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur text-left">
            <tr className="border-b border-border">
              <Th className="w-20">Symbol</Th>
              <Th>Candidate</Th>
              <Th>Party</Th>
              <Th className="text-right">Votes</Th>
              <Th>Status</Th>
              <Th className="text-right w-28">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  <div className="mt-2 text-xs text-muted-foreground">
                    Loading candidates…
                  </div>
                </td>
              </tr>
            )}

            {!loading && candidates.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center">
                  <UsersRound className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <div className="mt-2 text-sm text-muted-foreground">
                    No candidates match — add one or adjust the filters.
                  </div>
                </td>
              </tr>
            )}

            <AnimatePresence initial={false}>
              {!loading &&
                candidates.map((c) => (
                  <motion.tr
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <SymbolCell symbol={c.symbol} color={c.partyColor} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium leading-tight">{c.name}</div>
                      {c.description && (
                        <div className="mt-0.5 max-w-[28ch] truncate text-xs text-muted-foreground">
                          {c.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background"
                          style={{ backgroundColor: c.partyColor }}
                        />
                        <span style={{ color: c.partyColor }}>{c.party}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {c.totalVotes}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={c.status === "active" ? "success" : "muted"}
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(c)}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(c)}
                          aria-label={`Delete ${c.name}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
    >
      {children}
    </th>
  );
}

/**
 * Renders the candidate symbol — an uploaded image when the value is an
 * "/uploads/..." path (or absolute URL), otherwise the emoji/text in a
 * party-colored tile.
 */
export function SymbolCell({
  symbol,
  color,
  size = "h-11 w-11",
}: {
  symbol: string;
  color: string;
  size?: string;
}) {
  const isImage =
    typeof symbol === "string" &&
    (symbol.startsWith("/uploads/") || /^https?:\/\//.test(symbol));

  if (isImage) {
    const src = symbol.startsWith("/") ? `${API_ORIGIN}${symbol}` : symbol;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Candidate symbol"
        className={`${size} rounded-xl object-cover ring-1 ring-border`}
      />
    );
  }

  return (
    <span
      className={`grid ${size} place-items-center rounded-xl text-xl`}
      style={{
        backgroundColor: `${color}1A`,
        boxShadow: `inset 0 0 0 1px ${color}33`,
      }}
    >
      {symbol || "🗳️"}
    </span>
  );
}

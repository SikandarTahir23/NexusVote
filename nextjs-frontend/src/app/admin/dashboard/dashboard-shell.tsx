"use client";

import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  Search,
  LogOut,
  Users,
  UserCheck,
  UserCog,
  Vote as VoteIcon,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getAdminAuthManager } from "@/lib/oop";
import { api } from "@/lib/api";
import { VoterTable, type VoterRow } from "./voter-table";

type Candidate = {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  symbol: string;
};

type AdminSnapshot = {
  email: string;
  name: string;
  displayName: string;
  department: string;
  loggedInAt: number;
};

/**
 * Live-updating admin dashboard for NexusVote.
 *
 * Data source: Express backend (`/api/admin/stats` + `/api/admin/voters`),
 * which reads directly from MySQL — totals, candidate roster, voter
 * activity, and recent votes are all the real numbers, not a client-side
 * cache. The shell polls both endpoints every 2 s so new votes from a
 * different tab (or another machine) show up automatically.
 *
 * Architecture:
 *   - On mount, gate access via `AdminAuthManager.isLoggedIn`. If not
 *     logged in, bounce to `/admin/login`.
 *   - Kick off the first fetch and start a 2 s polling loop. Track the
 *     last error so we can warn the admin if MySQL/Express is offline
 *     instead of silently showing stale data.
 *   - Map the backend payloads into the same `VoterRow` / `Candidate`
 *     shapes the table + breakdown widget already render — no UI
 *     component had to change.
 *   - All derived data (filter, recent activity, candidate counts) is
 *     computed locally with `useMemo` so a search-box keystroke never
 *     hits the network.
 *
 * The `useDeferredValue` on the search input keeps typing snappy on slow
 * machines even when the dataset grows.
 */
export function DashboardShell() {
  const router = useRouter();

  const [admin, setAdmin] = useState<AdminSnapshot | null>(null);
  const [rows, setRows] = useState<VoterRow[]>([]);
  const [totals, setTotals] = useState({
    totalVotes: 0,
    totalCandidates: 0,
    activeCandidates: 0,
    totalVoters: 0,
  });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [candidateFilter, setCandidateFilter] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const deferredSearch = useDeferredValue(search);

  // Guard + initial load + 2 s polling loop.
  useEffect(() => {
    const authMgr = getAdminAuthManager();
    if (!authMgr.isLoggedIn) {
      router.replace("/admin/login");
      return;
    }
    setAdmin(authMgr.snapshot());

    let cancelled = false;

    /**
     * One round of live-data fetch. Reads stats + voters in parallel —
     * the two endpoints don't depend on each other so we don't pay for
     * sequential round-trips.
     */
    async function refresh() {
      setRefreshing(true);
      try {
        const [statsRes, votersRes] = await Promise.all([
          api.stats(),
          api.voters(),
        ]);
        if (cancelled) return;

        // Map the backend candidate shape onto the UI shape — only thing
        // to fix is the id, which is INT on the wire and string in the UI
        // (the existing voter-table + filter dropdown both use strings).
        const nextCandidates: Candidate[] = statsRes.byCandidate.map((c) => ({
          id: String(c.id),
          name: c.name,
          party: c.party,
          partyColor: c.partyColor,
          symbol: c.symbol,
        }));

        // Only voters who have actually cast a ballot show up in the
        // table — the column layout ("voted for X" + receipt ref) only
        // makes sense for those. Registered-but-not-voted voters still
        // contribute to the total count via stats.byCandidate / totals.
        const nextRows: VoterRow[] = votersRes.voters
          .filter((v) => v.hasVoted && v.votedAt != null)
          .map((v) => ({
            // `reference` is synthesised server-side from the voted_at
            // timestamp; non-null because hasVoted is true.
            reference: v.reference || `VR-${v.cnic}-${v.votedAt}`,
            candidateId: v.candidateId != null ? String(v.candidateId) : "",
            candidateName: v.candidateName || "—",
            voterCnic: v.cnic,
            voterEmail: v.email || "",
            voterName: v.name || "",
            timestamp: v.votedAt as string,
          }));

        setCandidates(nextCandidates);
        setRows(nextRows);
        setTotals({
          totalVotes: statsRes.totalVotes,
          totalCandidates: statsRes.totalCandidates ?? nextCandidates.length,
          activeCandidates:
            statsRes.activeCandidates ??
            statsRes.byCandidate.filter((c) => c.status === "active").length,
          totalVoters: statsRes.totalVoters ?? 0,
        });
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        // Token expired or backend restarted (in-memory sessions) — force
        // a clean re-login instead of erroring every 2 s forever.
        if (err instanceof Error && err.name === "AdminUnauthorized") {
          getAdminAuthManager().logout();
          router.replace("/admin/login");
          return;
        }
        setLoadError(
          err instanceof Error
            ? err.message
            : "Could not reach the backend."
        );
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    refresh();
    const id = window.setInterval(refresh, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [router]);

  function onLogout() {
    getAdminAuthManager().logout();
    router.replace("/admin/login");
  }

  /** Trigger a one-off refresh outside the polling loop (Refresh button). */
  async function refreshNow() {
    setRefreshing(true);
    try {
      const [statsRes, votersRes] = await Promise.all([api.stats(), api.voters()]);
      const nextCandidates: Candidate[] = statsRes.byCandidate.map((c) => ({
        id: String(c.id),
        name: c.name,
        party: c.party,
        partyColor: c.partyColor,
        symbol: c.symbol,
      }));
      const nextRows: VoterRow[] = votersRes.voters
        .filter((v) => v.hasVoted && v.votedAt != null)
        .map((v) => ({
          reference: v.reference || `VR-${v.cnic}-${v.votedAt}`,
          candidateId: v.candidateId != null ? String(v.candidateId) : "",
          candidateName: v.candidateName || "—",
          voterCnic: v.cnic,
          voterEmail: v.email || "",
          voterName: v.name || "",
          timestamp: v.votedAt as string,
        }));
      setCandidates(nextCandidates);
      setRows(nextRows);
      setTotals({
        totalVotes: statsRes.totalVotes,
        totalCandidates: statsRes.totalCandidates ?? nextCandidates.length,
        activeCandidates:
          statsRes.activeCandidates ??
          statsRes.byCandidate.filter((c) => c.status === "active").length,
        totalVoters: statsRes.totalVoters ?? 0,
      });
      setLoadError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AdminUnauthorized") {
        getAdminAuthManager().logout();
        router.replace("/admin/login");
        return;
      }
      setLoadError(
        err instanceof Error ? err.message : "Could not reach the backend."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // Candidate-wise vote breakdown — derived purely from polled rows so it
  // updates automatically when a new vote comes in. Sorted descending so the
  // leader sits at the top of the bar chart.
  const votesByCandidate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      counts.set(r.candidateId, (counts.get(r.candidateId) || 0) + 1);
    }
    const max = Math.max(1, ...Array.from(counts.values())); // avoid /0
    return candidates
      .map((c) => ({
        ...c,
        count: counts.get(c.id) || 0,
        pct: ((counts.get(c.id) || 0) / max) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }, [rows, candidates]);

  // Recent activity = the 5 most-recent votes. Backend already returns
  // voters newest-first; after filtering to hasVoted that ordering holds.
  const recentActivity = useMemo(() => rows.slice(0, 5), [rows]);

  // Local filter pass. Cheap; the table animates row enter/exit on changes.
  const filteredRows = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return rows.filter((r) => {
      if (candidateFilter && r.candidateId !== candidateFilter) return false;
      if (!needle) return true;
      return (
        r.voterName.toLowerCase().includes(needle) ||
        r.voterEmail.toLowerCase().includes(needle) ||
        r.voterCnic.includes(needle) ||
        r.reference.toLowerCase().includes(needle)
      );
    });
  }, [rows, deferredSearch, candidateFilter]);

  // Lookup map used by both the table and the recent-activity widget.
  const candidateById = useMemo(
    () => new Map(candidates.map((c) => [c.id, c])),
    [candidates]
  );

  if (!admin) {
    // Render nothing during the redirect — avoids a flash of dashboard UI.
    return null;
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.8, 0.2, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-lg shadow-primary/30 ring-1 ring-white/10"
            style={{
              backgroundImage:
                "linear-gradient(135deg, hsl(var(--grad-from)), hsl(var(--grad-via)) 55%, hsl(var(--grad-to)))",
            }}
          >
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight">
              NexusVote <span className="text-gradient">Dashboard</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">
                {admin.displayName}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/candidates")}
          >
            <UserCog className="h-4 w-4" />
            Manage Candidates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshNow}
            disabled={refreshing}
            aria-label="Refresh now"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </motion.div>

      {/* Backend connectivity banner — only visible when something's wrong. */}
      {loadError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <div className="font-semibold">Live data unavailable</div>
            <div className="opacity-90">
              {loadError}. Check that the Express backend is running on{" "}
              <code>NEXT_PUBLIC_API_URL</code>; numbers below may be stale.
            </div>
          </div>
        </motion.div>
      )}

      {/* Stat cards — top-level metrics, animated counter on change */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Candidates"
          value={totals.totalCandidates}
          accent="from-indigo-500 to-violet-500"
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Active Candidates"
          value={totals.activeCandidates}
          accent="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Total Voters"
          value={totals.totalVoters}
          accent="from-violet-500 to-fuchsia-500"
        />
        <StatCard
          icon={<VoteIcon className="h-5 w-5" />}
          label="Total Votes Cast"
          value={totals.totalVotes}
          subtitle={
            votesByCandidate[0]?.count
              ? `Leader: ${votesByCandidate[0]?.name}`
              : undefined
          }
          accent="from-fuchsia-500 to-pink-500"
        />
      </motion.div>

      {/* Candidate-wise vote distribution + recent activity */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="grid gap-4 lg:grid-cols-[1.4fr_1fr]"
      >
        <CandidateBreakdown rows={votesByCandidate} total={totals.totalVotes} />
        <RecentActivity rows={recentActivity} candidateById={candidateById} />
      </motion.div>

      {/* Filter row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
      >
        <div className="space-y-1.5">
          <Label
            htmlFor="dash-search"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Search voters
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="dash-search"
              type="search"
              placeholder="Name, email, CNIC, or receipt ref…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="dash-candidate"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Filter by candidate
          </Label>
          <select
            id="dash-candidate"
            value={candidateFilter}
            onChange={(e) => setCandidateFilter(e.target.value)}
            className="flex h-11 w-full sm:w-64 rounded-lg border border-input bg-secondary/50 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:bg-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="">All candidates</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.party}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      {/* Voter table */}
      <VoterTable rows={filteredRows} candidateById={candidateById} />
    </section>
  );
}

/* -----------------------------------------------------------------------
   Internal widgets — kept colocated so the dashboard reads top-to-bottom
   ----------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
  subtitle,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border glass p-5 shadow-md shadow-primary/5">
      {/* Decorative gradient halo in the corner */}
      <span
        className={`pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-30 blur-2xl`}
      />
      <div className="relative flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </div>
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-md`}
        >
          {icon}
        </span>
      </div>
      <motion.div
        key={value}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="relative mt-3 text-3xl font-semibold tabular-nums tracking-tight"
      >
        {value}
      </motion.div>
      {subtitle && (
        <div className="relative mt-1 text-xs text-muted-foreground truncate">
          {subtitle}
        </div>
      )}
    </div>
  );
}

type BreakdownRow = Candidate & { count: number; pct: number };

function CandidateBreakdown({
  rows,
  total,
}: {
  rows: BreakdownRow[];
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-border glass p-5 shadow-md shadow-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Candidate-wise Votes</h2>
          <p className="text-xs text-muted-foreground">
            Distribution updates in real time.
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {total} total
        </span>
      </div>

      {rows.length === 0 && (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No candidates loaded yet.
        </div>
      )}

      <ul className="space-y-3">
        {rows.map((c) => {
          const share = total > 0 ? (c.count / total) * 100 : 0;
          return (
            <li key={c.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-background"
                    style={{ backgroundColor: c.partyColor }}
                  />
                  <span className="font-medium truncate">{c.name}</span>
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: c.partyColor }}
                  >
                    {c.party}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums shrink-0">
                  <span className="font-semibold text-foreground">
                    {c.count}
                  </span>{" "}
                  · {share.toFixed(1)}%
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.pct}%` }}
                  transition={{ duration: 0.45, ease: [0.22, 0.8, 0.2, 1] }}
                  className="h-full rounded-full"
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${c.partyColor}, ${c.partyColor}cc)`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RecentActivity({
  rows,
  candidateById,
}: {
  rows: VoterRow[];
  candidateById: Map<string, Candidate>;
}) {
  return (
    <div className="rounded-2xl border border-border glass p-5 shadow-md shadow-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Recent Activity</h2>
          <p className="text-xs text-muted-foreground">Latest 5 votes.</p>
        </div>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No votes cast yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const c = candidateById.get(r.candidateId);
            return (
              <li key={r.reference} className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{
                    backgroundColor: c?.partyColor || "hsl(var(--primary))",
                  }}
                >
                  {(r.voterName || "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight truncate">
                    {r.voterName || "Anonymous voter"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    voted for{" "}
                    <span className="font-medium text-foreground/80">
                      {c?.name || r.candidateName}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {formatRelative(r.timestamp)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Local copy of the formatter from voter-table.tsx — kept inline to avoid a
 *  cyclic-feeling import. Identical behaviour. */
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

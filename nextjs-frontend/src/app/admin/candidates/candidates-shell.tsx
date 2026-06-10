"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Search,
  UserCog,
  AlertTriangle,
  Users,
  UserCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { getAdminAuthManager } from "@/lib/oop";
import { api, type AdminCandidate } from "@/lib/api";
import { CandidateTable } from "./candidate-table";
import { CandidateFormModal } from "./candidate-form-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";

type StatusFilter = "all" | "active" | "inactive";

/**
 * Candidate Management — the admin CRUD page.
 *
 * Mirrors the dashboard-shell architecture: sessionStorage auth guard on
 * mount, data loaded from the protected Express API, all filtering done
 * locally with useMemo. Mutations (create/update/delete) happen in the
 * modals; this shell owns the list state and refetches after each
 * successful mutation so the table always reflects the database.
 */
export function CandidatesShell() {
  return (
    <ToastProvider>
      <CandidatesInner />
    </ToastProvider>
  );
}

function CandidatesInner() {
  const router = useRouter();
  const toast = useToast();

  const [authed, setAuthed] = useState(false);
  const [candidates, setCandidates] = useState<AdminCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const deferredSearch = useDeferredValue(search);

  // null = closed; "create" = new candidate; AdminCandidate = editing it.
  const [formTarget, setFormTarget] = useState<"create" | AdminCandidate | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminCandidate | null>(null);

  /** Expired/restarted backend session → clear state and re-login. */
  const handleUnauthorized = useCallback(() => {
    getAdminAuthManager().logout();
    router.replace("/admin/login");
  }, [router]);

  const reload = useCallback(async () => {
    try {
      const res = await api.adminCandidates();
      setCandidates(res.candidates);
      setLoadError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AdminUnauthorized") {
        handleUnauthorized();
        return;
      }
      setLoadError(
        err instanceof Error ? err.message : "Could not reach the backend."
      );
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  // Auth guard + initial load.
  useEffect(() => {
    if (!getAdminAuthManager().isLoggedIn) {
      router.replace("/admin/login");
      return;
    }
    setAuthed(true);
    reload();
  }, [router, reload]);

  // Local filter pass — search across name/party/description + status.
  const filtered = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    return candidates.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        c.name.toLowerCase().includes(needle) ||
        c.party.toLowerCase().includes(needle) ||
        (c.description || "").toLowerCase().includes(needle)
      );
    });
  }, [candidates, deferredSearch, statusFilter]);

  const counts = useMemo(
    () => ({
      total: candidates.length,
      active: candidates.filter((c) => c.status === "active").length,
    }),
    [candidates]
  );

  if (!authed) return null; // redirecting — avoid a flash of UI

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
            <UserCog className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight">
              Candidate <span className="text-gradient">Management</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{counts.total}</span>{" "}
              candidates ·{" "}
              <span className="font-medium text-foreground">{counts.active}</span>{" "}
              active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <Button size="sm" onClick={() => setFormTarget("create")}>
            <Plus className="h-4 w-4" />
            Add Candidate
          </Button>
        </div>
      </motion.div>

      {/* Backend connectivity banner */}
      {loadError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <div className="font-semibold">Could not load candidates</div>
            <div className="opacity-90">
              {loadError}. Check that the Express backend is running on{" "}
              <code>NEXT_PUBLIC_API_URL</code>.
            </div>
          </div>
        </motion.div>
      )}

      {/* Summary chips */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <SummaryCard
          icon={<Users className="h-5 w-5" />}
          label="Total Candidates"
          value={counts.total}
          accent="from-indigo-500 to-violet-500"
        />
        <SummaryCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Active Candidates"
          value={counts.active}
          accent="from-emerald-500 to-teal-500"
        />
      </motion.div>

      {/* Search + status filter */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="grid gap-3 sm:grid-cols-[1fr_auto]"
      >
        <div className="space-y-1.5">
          <Label
            htmlFor="cand-search"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Search candidates
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cand-search"
              type="search"
              placeholder="Name, party, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="cand-status"
            className="text-xs uppercase tracking-wider text-muted-foreground"
          >
            Filter by status
          </Label>
          <select
            id="cand-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="flex h-11 w-full sm:w-48 rounded-lg border border-input bg-secondary/50 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:bg-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </motion.div>

      {/* Table */}
      <CandidateTable
        candidates={filtered}
        loading={loading}
        onEdit={(c) => setFormTarget(c)}
        onDelete={(c) => setDeleteTarget(c)}
      />

      {/* Create / edit modal */}
      <CandidateFormModal
        target={formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={(message) => {
          setFormTarget(null);
          toast.success(message);
          reload();
        }}
        onUnauthorized={handleUnauthorized}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDone={(message) => {
          setDeleteTarget(null);
          toast.success(message);
          reload();
        }}
        onError={(message) => toast.error(message)}
        onUnauthorized={handleUnauthorized}
      />
    </section>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border glass p-5 shadow-md shadow-primary/5">
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
    </div>
  );
}

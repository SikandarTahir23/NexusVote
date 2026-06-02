/**
 * api.ts — single source of truth for talking to the Express backend.
 *
 * Why this file is shaped the way it is:
 *  Every voter-flow page (verify, identity, ballot) imports `api` and
 *  calls `await api.<thing>(...)`. Older revisions of the prototype ran
 *  the demo entirely in the browser using the OOP classes under
 *  `@/lib/oop` — no server, no MySQL. Now that the Express + MySQL
 *  backend is wired up we want real persistence, but we still want:
 *
 *    1) the existing UI files to keep working unchanged
 *    2) the admin dashboard (which reads from the client-side
 *       VoteManager / AuthenticationManager) to keep rendering
 *    3) the demo to degrade gracefully if the backend is not running
 *
 * So every method here does two things:
 *    a) POST/GET the Express API at NEXT_PUBLIC_API_URL
 *    b) mirror the result into the local OOP managers so the admin
 *       dashboard continues to show the same data without changes
 *
 * If the backend is unreachable we fall back to the in-memory path —
 * the same behaviour the file had before the DB existed.
 *
 * Set NEXT_PUBLIC_API_URL in `.env.local` (defaults to localhost:5000).
 */

import { getAuthManager, getVoteManager, User } from "@/lib/oop";

export type Candidate = {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  symbol: string;
};

export type VoteReceipt = {
  voterCnic: string;
  candidateId: string;
  timestamp: string;
  reference: string;
};

const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(
    /\/$/,
    ""
  );

/**
 * Thin fetch wrapper — JSON-in, JSON-out, throws on non-2xx with the
 * server's `message` field if present. Centralised so every endpoint
 * gets the same error shape and the same Content-Type handling.
 */
async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
    cache: "no-store",
  });

  // Try to parse JSON either way — the server emits `{ message }` on
  // errors, which is far more useful than `res.statusText`.
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response, leave payload null */
  }

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload &&
        typeof (payload as { message: unknown }).message === "string"
        ? (payload as { message: string }).message
        : null) || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return payload as T;
}

export const api = {
  /**
   * Step 1 — verify a 13-digit CNIC against the backend. Falls back to
   * client-side format validation if the API is down so the demo can
   * still proceed in offline mode.
   */
  async verifyCnic(cnic: string) {
    const digits = User.normalizeCnic(cnic);
    if (!User.isValidCnic(digits)) {
      throw new Error("CNIC must be exactly 13 digits.");
    }

    try {
      const res = await request<{
        success: boolean;
        cnic: string;
        message: string;
      }>("/verify-cnic", { method: "POST", json: { cnic: digits } });
      // Mirror into client-side state so deep links / refreshes still work.
      getAuthManager().setCnic(res.cnic);
      return { success: true as const, cnic: res.cnic, message: res.message };
    } catch (err) {
      // Offline fallback — keeps the in-class demo working if MySQL is off.
      getAuthManager().setCnic(digits);
      return {
        success: true as const,
        cnic: digits,
        message: "CNIC verified (offline mode).",
        offline: true as const,
        offlineReason: (err as Error).message,
      };
    }
  },

  /**
   * Step 2 — store the voter's display name in MySQL. Mirrors into the
   * local AuthenticationManager so the admin dashboard sees it too.
   */
  async saveUser(cnic: string, name: string) {
    const auth = getAuthManager();
    auth.setCnic(cnic);
    auth.setName(name);

    try {
      const res = await request<{
        success: boolean;
        user: {
          cnic: string;
          name: string;
          constituency: string;
          role: string;
        };
      }>("/save-user", { method: "POST", json: { cnic, name } });
      return { success: true as const, user: res.user };
    } catch (err) {
      return {
        success: true as const,
        user: {
          cnic,
          name,
          constituency: "NA-000 (Demo)",
          role: "voter",
        },
        offline: true as const,
        offlineReason: (err as Error).message,
      };
    }
  },

  /**
   * Step 3 — fetch the ballot. Tries the API first; if it fails or
   * returns an empty list we fall back to the static client-side roster
   * baked into the OOP VoteManager.
   */
  async candidates(): Promise<{
    success: true;
    candidates: Candidate[];
    offline?: true;
  }> {
    try {
      const res = await request<{ success: boolean; candidates: Candidate[] }>(
        "/candidates"
      );
      if (res.candidates && res.candidates.length > 0) {
        return { success: true, candidates: res.candidates };
      }
    } catch {
      /* fall through to offline list */
    }
    return {
      success: true,
      candidates: getVoteManager().listCandidates() as Candidate[],
      offline: true,
    };
  },

  /**
   * Step 4 — cast the ballot. The CNIC PRIMARY KEY in the `votes` table
   * is what makes duplicate voting impossible: a second INSERT with the
   * same CNIC throws ER_DUP_ENTRY, which the API converts to a 409 with
   * a friendly message — we surface that message here unchanged.
   */
  async castVote(cnic: string, candidateId: string) {
    const auth = getAuthManager();
    const vm = getVoteManager();

    // Mirror the receipt into the client manager so the dashboard table
    // gets a row regardless of which path succeeded. The duplicate check
    // there throws if the voter already submitted in this browser; we
    // swallow that so it doesn't mask a backend-only success.
    const voter = {
      cnic: auth.cnic || cnic,
      email: auth.email || "",
      name: auth.name || "",
      hasVoted: false,
      markVoted: () => {
        /* no-op */
      },
    };

    try {
      const res = await request<{
        success: boolean;
        message: string;
        receipt: VoteReceipt;
      }>("/cast-vote", { method: "POST", json: { cnic, candidateId } });

      try {
        vm.castVote(voter, candidateId);
      } catch {
        /* already in client store — ignore */
      }
      return {
        success: true as const,
        message: res.message,
        receipt: res.receipt,
      };
    } catch (err) {
      // Re-throw real "already voted" errors so the UI shows the right
      // message; only fall back to local-only for transport errors.
      const msg = (err as Error).message || "";
      if (/already (cast|voted)/i.test(msg)) {
        throw err;
      }
      const receipt = vm.castVote(voter, candidateId) as VoteReceipt;
      return {
        success: true as const,
        message: "Vote recorded (offline mode).",
        receipt,
        offline: true as const,
        offlineReason: msg,
      };
    }
  },

  /** Has this CNIC already voted? Used by the UI to short-circuit. */
  async voteStatus(cnic: string): Promise<{ success: true; hasVoted: boolean }> {
    try {
      const res = await request<{ success: boolean; hasVoted: boolean }>(
        `/vote-status/${encodeURIComponent(cnic)}`
      );
      return { success: true, hasVoted: res.hasVoted };
    } catch {
      return { success: true, hasVoted: false };
    }
  },

  // ── Admin endpoints ─────────────────────────────────────────────────────
  //
  // The admin dashboard currently reads from the local OOP DashboardManager
  // and isn't rewired here on purpose — touching the UI is out of scope.
  // These helpers are exported so future dashboard work has a clean path
  // to swap to live DB data without inventing a new transport layer.

  /** Tallies + percentages for the admin panel. */
  async stats() {
    return request<{
      success: boolean;
      totalVotes: number;
      byCandidate: Array<Candidate & { votes: number; percentage: number }>;
    }>("/admin/stats");
  },

  /** Voter activity feed (registered voters + their vote status). */
  async voters() {
    return request<{
      success: boolean;
      voters: Array<{
        cnic: string;
        email: string | null;
        name: string | null;
        registeredAt: string;
        hasVoted: boolean;
        candidateId: number | null;
        candidateName: string | null;
        candidateParty: string | null;
        votedAt: string | null;
        reference: string | null;
      }>;
    }>("/admin/voters");
  },

  /**
   * Admin login against the Express backend. The Next.js route at
   * `/api/admin/login` is still in place and is what `AdminAuthManager`
   * calls today — this method is here for future migration.
   */
  async adminLogin(email: string, password: string) {
    return request<{
      success: boolean;
      profile: { email: string; name: string; department: string; role: string };
    }>("/admin/login", { method: "POST", json: { email, password } });
  },
};

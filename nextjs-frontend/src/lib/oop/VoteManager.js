import { Candidate } from "./Candidate.js";

/**
 * VoteManager — owns the candidate registry, vote tallying, and the
 * append-only vote log that powers the admin dashboard.
 *
 * Demonstrates ENCAPSULATION (private candidate map, private tally, private
 * duplicate-guard set, private append-only log) and ABSTRACTION (callers use
 * `castVote(user, candidateId)` without seeing how duplicates are detected,
 * how receipts are minted, or how results are persisted).
 *
 * Storage strategy: the prototype has no MySQL yet, but the admin dashboard
 * needs results that survive a page refresh. So we mirror the in-memory
 * state into `localStorage["voting.votes"]` on every write, and rehydrate
 * from it on construction. When the real backend lands, swap the `#persist`
 * and `#hydrate` methods for `fetch(...)` calls — no other class changes.
 *
 * The admin dashboard reads votes through `getRecentVotes({ search,
 * candidateId, limit })`, which returns a filtered + sorted snapshot of the
 * private log so the React layer never gets a live reference to mutate.
 */
export class VoteManager {
  static #STORAGE_KEY = "voting.votes";

  /** @type {Map<string, Candidate>} */
  #candidates = new Map();
  /** @type {Map<string, number>} candidateId → vote count */
  #tally = new Map();
  /** @type {Set<string>} CNICs that have already voted (duplicate guard). */
  #voted = new Set();
  /**
   * Append-only log of every vote cast. Each entry captures the full voter
   * snapshot plus the receipt — the shape the admin dashboard wants.
   * @type {Array<{
   *   reference: string,
   *   candidateId: string,
   *   candidateName: string,
   *   voterCnic: string,
   *   voterEmail: string,
   *   voterName: string,
   *   timestamp: string,
   * }>}
   */
  #log = [];

  /** @param {Array<ConstructorParameters<typeof Candidate>[0]>} seeds */
  constructor(seeds = []) {
    for (const seed of seeds) {
      const c = new Candidate(seed);
      this.#candidates.set(c.id, c);
      this.#tally.set(c.id, 0);
    }
    this.#hydrate();
    // First-run demo data so the admin dashboard never looks empty.
    if (this.#log.length === 0 && process.env.NODE_ENV !== "production") {
      this.#seedDemoVotes();
    }
  }

  // ---- Read-only views --------------------------------------------------

  /** Public list snapshot — never the live internals. */
  listCandidates() {
    return Array.from(this.#candidates.values()).map((c) => c.toJSON());
  }

  /** Read-only tally snapshot for the admin dashboard. */
  getResults() {
    return Array.from(this.#tally.entries()).map(([candidateId, votes]) => ({
      candidateId,
      candidateName: this.#candidates.get(candidateId)?.name || "Unknown",
      votes,
    }));
  }

  /** Total ballots cast (sum of the tally). */
  getTotalVotes() {
    let total = 0;
    for (const v of this.#tally.values()) total += v;
    return total;
  }

  /**
   * Filtered + sorted snapshot of the vote log. The dashboard polls this
   * every couple of seconds; the search and filter inputs feed straight in.
   *
   * @param {{ search?: string, candidateId?: string, limit?: number }} opts
   * @returns {Array<{
   *   reference: string,
   *   candidateId: string,
   *   candidateName: string,
   *   voterCnic: string,
   *   voterEmail: string,
   *   voterName: string,
   *   timestamp: string,
   * }>}
   */
  getRecentVotes({ search = "", candidateId = "", limit } = {}) {
    const needle = String(search || "").trim().toLowerCase();
    const wantCid = String(candidateId || "").trim();

    let rows = this.#log.slice(); // shallow copy — entries are plain objects
    // Newest first.
    rows.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    if (wantCid) {
      rows = rows.filter((r) => r.candidateId === wantCid);
    }
    if (needle) {
      rows = rows.filter(
        (r) =>
          r.voterName.toLowerCase().includes(needle) ||
          r.voterEmail.toLowerCase().includes(needle) ||
          r.voterCnic.includes(needle) ||
          r.reference.toLowerCase().includes(needle)
      );
    }
    if (typeof limit === "number" && limit > 0) {
      rows = rows.slice(0, limit);
    }
    return rows;
  }

  // ---- Write paths ------------------------------------------------------

  /**
   * Cast a vote.
   *
   * Accepts the full voter shape (a `User` instance or an adapter object)
   * so the admin dashboard can show name + email + CNIC per row. CNIC is
   * still the unique key for the duplicate guard.
   *
   * @param {{
   *   cnic: string,
   *   email?: string,
   *   name?: string,
   *   hasVoted?: boolean,
   *   markVoted?: () => void,
   * }} user
   * @param {string} candidateId
   * @returns {{
   *   reference: string,
   *   candidateId: string,
   *   candidateName: string,
   *   voterCnic: string,
   *   voterEmail: string,
   *   voterName: string,
   *   timestamp: string,
   * }}
   */
  castVote(user, candidateId) {
    if (!user || !user.cnic) {
      throw new Error("Voter identity is missing.");
    }
    if (this.#voted.has(user.cnic) || user.hasVoted) {
      throw new Error("This voter has already cast a ballot.");
    }
    if (!this.#candidates.has(candidateId)) {
      throw new Error("Unknown candidate.");
    }

    this.#tally.set(candidateId, (this.#tally.get(candidateId) || 0) + 1);
    this.#voted.add(user.cnic);
    if (typeof user.markVoted === "function") user.markVoted();

    const receipt = this.#issueReceipt({
      cnic: user.cnic,
      email: user.email || "",
      name: user.name || "",
      candidateId,
    });
    this.#log.push(receipt);
    this.#persist();
    return receipt;
  }

  /**
   * Wipe every recorded vote. Handy when an admin wants to reset between
   * demo runs. Does NOT remove the candidate registry — that's static.
   */
  clearAllVotes() {
    this.#tally = new Map();
    for (const id of this.#candidates.keys()) this.#tally.set(id, 0);
    this.#voted = new Set();
    this.#log = [];
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(VoteManager.#STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  // ---- Private helpers --------------------------------------------------

  /** Build a tamper-evident-looking reference number + full receipt. */
  #issueReceipt({ cnic, email, name, candidateId }) {
    const ts = new Date();
    const ref =
      "EC-" +
      ts.getFullYear() +
      "-" +
      Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      reference: ref,
      candidateId,
      candidateName: this.#candidates.get(candidateId)?.name || "Unknown",
      voterCnic: cnic,
      voterEmail: email,
      voterName: name,
      timestamp: ts.toISOString(),
    };
  }

  /** Write tally + voted set + log to localStorage. SSR-safe. */
  #persist() {
    if (typeof window === "undefined") return;
    try {
      const payload = {
        tally: Array.from(this.#tally.entries()),
        voted: Array.from(this.#voted.values()),
        log: this.#log,
      };
      localStorage.setItem(VoteManager.#STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Quota exceeded or storage disabled — fall back to in-memory only.
    }
  }

  /** Re-read persisted state on startup. SSR-safe. */
  #hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(VoteManager.#STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.tally)) {
        for (const [cid, n] of data.tally) {
          // Only restore counts for candidates we still recognise.
          if (this.#candidates.has(cid)) this.#tally.set(cid, Number(n) || 0);
        }
      }
      if (Array.isArray(data.voted)) {
        this.#voted = new Set(data.voted.map((x) => String(x)));
      }
      if (Array.isArray(data.log)) {
        this.#log = data.log.filter(
          (r) =>
            r &&
            typeof r.reference === "string" &&
            typeof r.candidateId === "string" &&
            typeof r.timestamp === "string"
        );
      }
    } catch {
      // Corrupt payload — wipe so we recover cleanly next write.
      try {
        localStorage.removeItem(VoteManager.#STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Seed a handful of plausible historical votes so the admin dashboard
   * has content on first run. Demo-only — gated by NODE_ENV upstream.
   */
  #seedDemoVotes() {
    const now = Date.now();
    /** @type {Array<[string, string, string, string, number]>} */
    // [name, email, cnic, candidateId, minutesAgo]
    const seeds = [
      ["Sara Ahmed",   "sara.ahmed@example.com",   "3520112345671", "C-001", 7],
      ["Usman Khan",   "usman.khan@example.com",   "3520198765432", "C-003", 22],
      ["Maryam Iqbal", "maryam.iqbal@example.com", "3520155544433", "C-001", 41],
      ["Fahad Riaz",   "fahad.riaz@example.com",   "3520177788866", "C-002", 63],
      ["Zainab Ali",   "zainab.ali@example.com",   "3520122233344", "C-004", 88],
    ];
    for (const [name, email, cnic, cid, mins] of seeds) {
      if (!this.#candidates.has(cid)) continue;
      this.#tally.set(cid, (this.#tally.get(cid) || 0) + 1);
      this.#voted.add(cnic);
      const ts = new Date(now - mins * 60_000);
      this.#log.push({
        reference:
          "EC-" +
          ts.getFullYear() +
          "-" +
          Math.random().toString(36).slice(2, 8).toUpperCase(),
        candidateId: cid,
        candidateName: this.#candidates.get(cid).name,
        voterCnic: cnic,
        voterEmail: email,
        voterName: name,
        timestamp: ts.toISOString(),
      });
    }
    this.#persist();
  }
}

// ---------------------------------------------------------------------------
// Static demo registry. Replace with a fetched/DB-backed list when wiring up
// the backend. The party colours mirror the original Express seed data so
// the UI looks identical to the previous prototype.
// ---------------------------------------------------------------------------
const DEMO_SEEDS = [
  {
    id: "C-001",
    name: "Ayesha Tariq",
    party: "Civic Alliance",
    partyColor: "#0f766e",
    symbol: "Star",
  },
  {
    id: "C-002",
    name: "Bilal Hussain",
    party: "Progress Front",
    partyColor: "#b45309",
    symbol: "Arrow",
  },
  {
    id: "C-003",
    name: "Hina Raza",
    party: "People's Coalition",
    partyColor: "#1d4ed8",
    symbol: "Book",
  },
  {
    id: "C-004",
    name: "Omar Sheikh",
    party: "National Reform",
    partyColor: "#15803d",
    symbol: "Tree",
  },
];

let _voteManager = null;
export function getVoteManager() {
  if (!_voteManager) _voteManager = new VoteManager(DEMO_SEEDS);
  return _voteManager;
}

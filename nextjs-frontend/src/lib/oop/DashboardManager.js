import { getVoteManager } from "./VoteManager.js";
import { getAdminAuthManager } from "./AdminAuthManager.js";

/**
 * DashboardManager — façade over `VoteManager` and `AdminAuthManager`.
 *
 * The admin dashboard would otherwise have to import three classes and
 * three singletons. This class hides which manager owns which data so the
 * React layer only sees one API.
 *
 * Demonstrates ABSTRACTION: callers ask `getVoterRows({ search, ... })` and
 * get rows back; they don't know (and don't care) that the search runs
 * inside `VoteManager` while the auth gate runs through `AdminAuthManager`.
 *
 * The constructor accepts the two managers as dependencies so unit tests
 * can inject mocks. The exported `getDashboardManager()` singleton wires
 * up the real ones for production use.
 */
export class DashboardManager {
  #votes;
  #auth;

  /**
   * @param {{
   *   votes: ReturnType<typeof getVoteManager>,
   *   auth: ReturnType<typeof getAdminAuthManager>,
   * }} deps
   */
  constructor({ votes, auth }) {
    this.#votes = votes;
    this.#auth = auth;
  }

  // ---- Auth ---------------------------------------------------------------

  /** Throws if no admin is signed in. Used as a defence-in-depth check. */
  requireAdmin() {
    if (!this.#auth.isLoggedIn) {
      throw new Error("Admin session required.");
    }
    return this.#auth.admin;
  }

  /** Snapshot of the current admin, for the dashboard header. */
  getAdminSnapshot() {
    return this.#auth.snapshot();
  }

  // ---- Aggregates ---------------------------------------------------------

  /**
   * The two scalars the dashboard header chip shows. Kept small on purpose
   * (the user opted out of stat cards / charts).
   */
  getTotals() {
    return {
      totalVotes: this.#votes.getTotalVotes(),
      totalCandidates: this.#votes.listCandidates().length,
    };
  }

  /** Candidate list, used to populate the filter dropdown. */
  getCandidates() {
    return this.#votes.listCandidates();
  }

  /** Per-candidate tally, in case a future view wants it. */
  getCandidateResults() {
    return this.#votes.getResults();
  }

  // ---- Voter table --------------------------------------------------------

  /**
   * Filtered, sorted snapshot of every vote — the data the voter table
   * renders. Pure delegation to `VoteManager.getRecentVotes`, kept here so
   * future filters (date range, role, etc.) have a natural home.
   */
  getVoterRows({ search = "", candidateId = "", limit } = {}) {
    return this.#votes.getRecentVotes({ search, candidateId, limit });
  }
}

let _instance = null;
export function getDashboardManager() {
  if (!_instance) {
    _instance = new DashboardManager({
      votes: getVoteManager(),
      auth: getAdminAuthManager(),
    });
  }
  return _instance;
}

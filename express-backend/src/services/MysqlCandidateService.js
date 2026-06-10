const Candidate = require("../models/Candidate");

/**
 * MysqlCandidateService — reads the candidate roster from MySQL.
 *
 * Schema this class talks to:
 *   candidates(id INT PK auto, candidate_name, party_name, symbol_image,
 *              total_votes, description, status, created_at, updated_at)
 *
 * Party color isn't stored in the DB (the design treats it as a UI
 * concern), so we keep a small palette here keyed by party name. New
 * parties not in the palette fall back to a neutral slate color.
 *
 * Mirrors the surface of the original in-memory CandidateService
 * (findAll, findById) so VoteManager and candidateController only need
 * to learn how to `await`.
 *
 * Note: an earlier revision cached the roster for the process lifetime.
 * Now that admins can create/edit/delete candidates at runtime (see
 * CandidateManager) a stale cache would serve ghosts on the ballot, so
 * every call hits MySQL — the table is a handful of rows, reads are cheap.
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: the pool is private.
 *  - ABSTRACTION: callers ask for candidates by id; the persistence
 *    layer is invisible.
 */

// Stable colors for the parties we ship by default. Extend as needed.
const PARTY_COLORS = {
  "Student Voice":       "#2563eb", // blue-600
  "Campus Reform":       "#16a34a", // green-600
  "United Students":     "#ea580c", // orange-600
  "Progressive Society": "#9333ea", // purple-600
};
const DEFAULT_COLOR = "#475569"; // slate-600

/** Build a Candidate model instance from a candidates table row. */
function rowToCandidate(r) {
  return new Candidate({
    id: r.id, // integer — the UI just echoes it back, doesn't parse it
    name: r.candidate_name,
    party: r.party_name,
    partyColor: PARTY_COLORS[r.party_name] || DEFAULT_COLOR,
    symbol: r.symbol_image,
    description: r.description,
    status: r.status || "active",
    totalVotes: r.total_votes || 0,
    createdAt: r.created_at || null,
    updatedAt: r.updated_at || null,
  });
}

class MysqlCandidateService {
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  /**
   * The full roster, oldest first. Pass `{ activeOnly: true }` to get
   * just the candidates that should appear on the voter ballot.
   */
  async findAll({ activeOnly = false } = {}) {
    const [rows] = await this.#pool.query(
      `SELECT id, candidate_name, party_name, symbol_image, total_votes,
              description, status, created_at, updated_at
         FROM candidates
        ${activeOnly ? "WHERE status = 'active'" : ""}
        ORDER BY id ASC`
    );
    return rows.map(rowToCandidate);
  }

  /**
   * Look up a single candidate regardless of status (callers decide
   * whether inactive matters). We accept the id loosely (string or
   * number) because the JSON body coming off the API parses ids as
   * whatever JSON.parse gives us — coerce to number for the query.
   */
  async findById(candidateId) {
    const id = Number(candidateId);
    if (!Number.isFinite(id)) return null;
    const [rows] = await this.#pool.execute(
      `SELECT id, candidate_name, party_name, symbol_image, total_votes,
              description, status, created_at, updated_at
         FROM candidates WHERE id = ?`,
      [id]
    );
    return rows.length > 0 ? rowToCandidate(rows[0]) : null;
  }
}

module.exports = MysqlCandidateService;
module.exports.rowToCandidate = rowToCandidate;
module.exports.PARTY_COLORS = PARTY_COLORS;
module.exports.DEFAULT_COLOR = DEFAULT_COLOR;

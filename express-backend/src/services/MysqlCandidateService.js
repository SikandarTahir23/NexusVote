const Candidate = require("../models/Candidate");

/**
 * MysqlCandidateService — reads the candidate roster from MySQL.
 *
 * Schema this class talks to:
 *   candidates(id INT PK auto, candidate_name, party_name,
 *              symbol_image, total_votes)
 *
 * Party color isn't stored in the DB (the design treats it as a UI
 * concern), so we keep a small palette here keyed by party name. New
 * parties not in the palette fall back to a neutral slate color.
 *
 * Mirrors the surface of the original in-memory CandidateService
 * (findAll, findById) so VoteManager and candidateController only need
 * to learn how to `await`.
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: pool + cache are private.
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

class MysqlCandidateService {
  #pool;
  #cache = null;

  constructor(pool) {
    this.#pool = pool;
  }

  /**
   * Load + cache the roster. The candidates table is seeded once and
   * never mutated at runtime (total_votes is bumped but that's not
   * read here), so caching for the lifetime of the process is fine.
   */
  async #load() {
    if (this.#cache) return this.#cache;
    const [rows] = await this.#pool.query(
      `SELECT id, candidate_name, party_name, symbol_image
         FROM candidates ORDER BY id ASC`
    );
    this.#cache = rows.map(
      (r) =>
        new Candidate({
          id: r.id, // integer — the UI just echoes it back, doesn't parse it
          name: r.candidate_name,
          party: r.party_name,
          partyColor: PARTY_COLORS[r.party_name] || DEFAULT_COLOR,
          symbol: r.symbol_image,
        })
    );
    return this.#cache;
  }

  async findAll() {
    const list = await this.#load();
    return [...list];
  }

  /**
   * Look up a single candidate. We accept the id loosely (string or
   * number) because the JSON body coming off the API parses ids as
   * whatever JSON.parse gives us — coerce to number for comparison.
   */
  async findById(candidateId) {
    const id = Number(candidateId);
    if (!Number.isFinite(id)) return null;
    const list = await this.#load();
    return list.find((c) => c.getId() === id) || null;
  }
}

module.exports = MysqlCandidateService;

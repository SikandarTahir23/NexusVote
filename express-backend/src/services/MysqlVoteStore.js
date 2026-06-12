const VoteStore = require("./VoteStore");
const { deriveLegacyReference } = require("../utils/referenceNumber");

/**
 * MysqlVoteStore — concrete VoteStore backed by the `votes` table.
 *
 * Schema this class talks to:
 *   votes(id INT PK auto, voter_id INT UNIQUE,
 *         candidate_id INT, reference_number VARCHAR(32), voted_at TIMESTAMP)
 *
 * The API speaks CNIC (a string) and the votes table joins by integer
 * voter_id. We translate the CNIC → voters.id at the boundary, so the
 * rest of the app stays CNIC-only and never has to think about the
 * internal integer key.
 *
 * Duplicate-vote prevention happens at the DB layer: voter_id has a
 * UNIQUE constraint (added by initDatabase()), so a second INSERT for
 * the same voter throws ER_DUP_ENTRY. We translate that back into a
 * human-friendly message the same way the original implementation did.
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends the abstract VoteStore.
 *  - POLYMORPHISM: satisfies the VoteStore contract so VoteManager talks
 *    to it through the parent type — identical to how it talks to
 *    InMemoryVoteStore.
 *  - ENCAPSULATION: pool + voter store are held privately.
 */
class MysqlVoteStore extends VoteStore {
  #pool;
  #voters;

  /**
   * @param {*} pool - mysql2 pool
   * @param {*} voters - MysqlVoterStore (used to translate CNIC → id)
   */
  constructor(pool, voters) {
    super();
    this.#pool = pool;
    this.#voters = voters;
  }

  async hasVoted(voterCnic) {
    // Single read: join votes back to voters by CNIC. Cheaper than
    // two round-trips (lookup id, then lookup vote).
    const [rows] = await this.#pool.execute(
      `SELECT 1
         FROM votes v
         JOIN voters u ON u.id = v.voter_id
        WHERE u.cnic = ? LIMIT 1`,
      [voterCnic]
    );
    return rows.length > 0;
  }

  async save(vote) {
    const cnic = vote.getVoterCnic();
    const voterId = await this.#voters.findIdByCnic(cnic);
    if (voterId == null) {
      // Saving a vote for an unregistered CNIC is a programming error —
      // /api/save-user should run before /api/cast-vote. Fail loudly.
      throw new Error("Voter is not registered. Save the user first.");
    }

    try {
      await this.#pool.execute(
        `INSERT INTO votes (voter_id, candidate_id, reference_number)
         VALUES (?, ?, ?)`,
        [voterId, vote.getCandidateId(), vote.getReference()]
      );
    } catch (err) {
      if (err && err.code === "ER_DUP_ENTRY") {
        throw new Error(`Voter ${cnic} has already voted.`);
      }
      throw err;
    }

    // Keep the cached flag on `voters` in sync. Best-effort — if this
    // fails the vote is still recorded; the dashboard just won't see
    // has_voted=1 until the next refresh recomputes it.
    try {
      await this.#voters.markVoted(cnic);
    } catch {
      /* non-fatal */
    }

    // Bump the cached tally on the candidate row. Same logic — useful
    // for quick reads from MySQL Workbench, but not load-bearing
    // (getStatistics() recomputes from votes every time).
    try {
      await this.#pool.execute(
        `UPDATE candidates SET total_votes = total_votes + 1 WHERE id = ?`,
        [vote.getCandidateId()]
      );
    } catch {
      /* non-fatal */
    }

    return vote;
  }

  /**
   * Return every cast vote as a plain object the admin layer can ship
   * to the UI. We don't re-hydrate Vote instances because the Vote
   * constructor stamps a fresh timestamp on every build — and the
   * dashboard only needs read-shaped data.
   */
  async all() {
    const [rows] = await this.#pool.query(`
      SELECT u.cnic             AS voter_cnic,
             v.candidate_id     AS candidate_id,
             v.reference_number AS reference_number,
             v.voted_at         AS voted_at
        FROM votes v
        JOIN voters u ON u.id = v.voter_id
       ORDER BY v.voted_at ASC
    `);
    return rows.map((r) => ({
      voterCnic: r.voter_cnic,
      candidateId: r.candidate_id,
      // Prefer the stored reference; legacy rows (cast before the
      // reference_number column existed) fall back to a derived ref so
      // the admin UI still has a stable receipt id to show.
      reference: r.reference_number || deriveLegacyReference(r.voted_at, r.voter_cnic),
      timestamp: r.voted_at,
    }));
  }

  /**
   * Fully-denormalised vote rows for the Excel/Drive backup. Unlike all()
   * this joins in the voter's name/email and the candidate's name/party so
   * the spreadsheet is human-readable without any further lookups.
   *
   * INNER JOINs on both sides: a backup row only makes sense when the vote
   * still references a live voter and candidate. Each returned object maps
   * 1:1 to a spreadsheet row (the column labels are applied in
   * ExcelExportService).
   */
  async allForBackup() {
    const [rows] = await this.#pool.query(`
      SELECT v.reference_number AS reference_number,
             u.full_name        AS voter_name,
             u.cnic             AS cnic,
             u.email            AS email,
             c.candidate_name   AS candidate_name,
             c.party_name       AS party_name,
             v.voted_at         AS voted_at
        FROM votes v
        JOIN voters     u ON u.id = v.voter_id
        JOIN candidates c ON c.id = v.candidate_id
       ORDER BY v.voted_at ASC
    `);
    return rows.map((r) => ({
      reference: r.reference_number || deriveLegacyReference(r.voted_at, r.cnic),
      voterName: r.voter_name,
      cnic: r.cnic,
      email: r.email,
      candidateName: r.candidate_name,
      partyName: r.party_name,
      timestamp: r.voted_at,
    }));
  }
}

module.exports = MysqlVoteStore;

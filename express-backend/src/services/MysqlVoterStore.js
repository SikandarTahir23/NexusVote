const UserStore = require("./UserStore");
const User = require("../models/User");
const { deriveLegacyReference } = require("../utils/referenceNumber");

/**
 * MysqlVoterStore — concrete UserStore backed by the `voters` table.
 *
 * Schema this class talks to:
 *   voters(id INT PK auto, email, cnic UNIQUE, full_name,
 *          has_voted TINYINT, created_at)
 *
 * Voter identity at the API layer is the CNIC (the citizen ID); the
 * integer `id` is internal — votes.voter_id points at it, but no
 * consumer outside this module ever sees it.
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends the abstract UserStore.
 *  - POLYMORPHISM: satisfies the UserStore contract, so the auth service
 *    keeps working unchanged whether it talks to this class or any
 *    future replacement (e.g. an in-memory test double).
 *  - ENCAPSULATION: the connection pool is private.
 */
class MysqlVoterStore extends UserStore {
  #pool;

  constructor(pool) {
    super();
    this.#pool = pool;
  }

  /**
   * Insert-or-update by CNIC. Returns the User the caller passed in so
   * the controller can ship it straight back to the UI.
   *
   * `email` is optional and best-effort: it's captured client-side at the
   * OTP step and threaded through so the Excel backup has a populated Email
   * column. The voters.email column has a UNIQUE constraint, so the same
   * email arriving under a different CNIC would throw ER_DUP_ENTRY — we
   * retry without the email rather than fail registration over a backup
   * nicety. Voter identity is the CNIC; email is supplementary.
   */
  async upsert(user, email = null) {
    const cnic = user.getCnic();
    const name = user.getName();
    const cleanEmail =
      typeof email === "string" && email.trim() ? email.trim() : null;

    try {
      await this.#pool.execute(
        `INSERT INTO voters (cnic, full_name, email)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           full_name = VALUES(full_name),
           email     = COALESCE(VALUES(email), email)`,
        [cnic, name, cleanEmail]
      );
    } catch (err) {
      if (err && err.code === "ER_DUP_ENTRY") {
        // Almost certainly the UNIQUE(email) guard. Re-run without the email
        // so the name still persists and registration succeeds.
        console.error(
          `[voters] email "${cleanEmail}" already in use — saving voter without it.`
        );
        await this.#pool.execute(
          `INSERT INTO voters (cnic, full_name)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
          [cnic, name]
        );
      } else {
        throw err;
      }
    }
    return user;
  }

  /** Find a voter by CNIC and re-hydrate them as a User instance. */
  async find(cnic) {
    const [rows] = await this.#pool.execute(
      `SELECT cnic, full_name, has_voted
         FROM voters WHERE cnic = ? LIMIT 1`,
      [cnic]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return new User({
      cnic: r.cnic,
      name: r.full_name,
      // constituency isn't stored in voters — fall back to the model default.
    });
  }

  /**
   * Return the integer voters.id for a given CNIC.
   *
   * Why this method exists:
   *   The votes table joins by integer voter_id, but the API speaks
   *   CNIC. This is the one place that bridges those two — MysqlVoteStore
   *   uses it to translate before INSERT/SELECT.
   */
  async findIdByCnic(cnic) {
    const [rows] = await this.#pool.execute(
      `SELECT id FROM voters WHERE cnic = ? LIMIT 1`,
      [cnic]
    );
    return rows.length === 0 ? null : rows[0].id;
  }

  /**
   * Mark the cached `has_voted` flag — keeps the column in sync with
   * the actual votes row. Called by MysqlVoteStore after a successful
   * cast so a single column read is enough to answer "has this voter voted?"
   */
  async markVoted(cnic) {
    await this.#pool.execute(
      `UPDATE voters SET has_voted = 1 WHERE cnic = ?`,
      [cnic]
    );
  }

  async all() {
    const [rows] = await this.#pool.query(
      `SELECT cnic, full_name, has_voted, created_at
         FROM voters ORDER BY created_at ASC`
    );
    return rows.map(
      (r) => new User({ cnic: r.cnic, name: r.full_name })
    );
  }

  /**
   * Activity feed for the admin dashboard. One row per registered voter,
   * LEFT JOIN with votes so voters who haven't cast yet still appear
   * (hasVoted: false, votedAt: null).
   *
   * Done in SQL because the alternative is two big result sets + a JS
   * merge — cheap to express as a join.
   */
  async activity() {
    const [rows] = await this.#pool.query(`
      SELECT v.cnic,
             v.email                AS email,
             v.full_name            AS name,
             v.created_at           AS registered_at,
             votes.candidate_id,
             votes.reference_number AS reference_number,
             c.candidate_name       AS candidate_name,
             c.party_name           AS candidate_party,
             votes.voted_at
        FROM voters v
        LEFT JOIN votes      ON votes.voter_id     = v.id
        LEFT JOIN candidates c ON c.id              = votes.candidate_id
       ORDER BY v.created_at DESC
    `);
    return rows.map((r) => ({
      cnic: r.cnic,
      email: r.email,
      name: r.name,
      registeredAt: r.registered_at,
      hasVoted: r.voted_at !== null,
      candidateId: r.candidate_id,
      candidateName: r.candidate_name,
      candidateParty: r.candidate_party,
      votedAt: r.voted_at,
      // Prefer the stored reference; legacy rows (cast before the
      // reference_number column existed) fall back to a derived ref in
      // the same VOTE-YYYYMMDD-XXXX format. Voters who haven't cast → null.
      reference:
        r.reference_number ||
        (r.voted_at ? deriveLegacyReference(r.voted_at, r.cnic) : null),
    }));
  }
}

module.exports = MysqlVoterStore;

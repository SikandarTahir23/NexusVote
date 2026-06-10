const fs = require("fs");
const path = require("path");
const { rowToCandidate } = require("./MysqlCandidateService");

/**
 * CandidateManager — the admin-side service that owns candidate CRUD.
 *
 * MysqlCandidateService stays the *read* path used by the voter flow
 * (ballot, vote casting); this class is the *write* path used only by
 * the protected admin endpoints. Splitting them keeps the voter flow
 * untouched by the new feature.
 *
 * Validation lives here (not in the controller) so the rules hold no
 * matter which transport calls them. Errors carry a `code` so the
 * controller can map them to the right HTTP status:
 *  - VALIDATION → 400
 *  - HAS_VOTES  → 409 (delete blocked, candidate has received votes)
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: pool + validation are private.
 *  - ABSTRACTION: controllers never see SQL or the filesystem.
 *  - COMPOSITION: builds and returns Candidate model instances.
 */

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

function fail(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

class CandidateManager {
  #pool;

  constructor(pool) {
    this.#pool = pool;
  }

  // ---- Reads (admin table needs live vote counts) -----------------------

  /**
   * All candidates with a live vote count from the votes table — the
   * `total_votes` column is a best-effort counter, the JOIN is the truth.
   * Optional `status` filter ("active" | "inactive").
   */
  async list({ status } = {}) {
    const where = status ? "WHERE c.status = ?" : "";
    const [rows] = await this.#pool.query(
      `SELECT c.*, COUNT(v.id) AS live_votes
         FROM candidates c
         LEFT JOIN votes v ON v.candidate_id = c.id
        ${where}
        GROUP BY c.id
        ORDER BY c.id ASC`,
      status ? [status] : []
    );
    return rows.map((r) => rowToCandidate({ ...r, total_votes: r.live_votes }));
  }

  /** One candidate (with live vote count), or null. */
  async getById(candidateId) {
    const id = Number(candidateId);
    if (!Number.isFinite(id)) return null;
    const [rows] = await this.#pool.execute(
      `SELECT c.*, COUNT(v.id) AS live_votes
         FROM candidates c
         LEFT JOIN votes v ON v.candidate_id = c.id
        WHERE c.id = ?
        GROUP BY c.id`,
      [id]
    );
    if (rows.length === 0 || rows[0].id === null) return null;
    return rowToCandidate({ ...rows[0], total_votes: rows[0].live_votes });
  }

  // ---- Writes ------------------------------------------------------------

  /**
   * Create a candidate. `symbol` is an emoji string or an
   * "/uploads/<file>" path the controller resolved from the upload.
   */
  async create({ name, party, description, status, symbol }) {
    const clean = this.#validate({ name, party, description, status });
    const [result] = await this.#pool.execute(
      `INSERT INTO candidates
         (candidate_name, party_name, symbol_image, description, status, total_votes)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [clean.name, clean.party, symbol || "🗳️", clean.description, clean.status]
    );
    return this.getById(result.insertId);
  }

  /**
   * Update a candidate. Only the provided fields change; passing a new
   * `symbol` replaces the old one (and deletes the old uploaded file,
   * best-effort — a failed unlink never fails the request).
   */
  async update(candidateId, { name, party, description, status, symbol }) {
    const existing = await this.getById(candidateId);
    if (!existing) throw fail("NOT_FOUND", "Candidate not found.");

    const clean = this.#validate({
      name: name !== undefined ? name : existing.getName(),
      party: party !== undefined ? party : existing.getParty(),
      description:
        description !== undefined ? description : existing.getDescription(),
      status: status !== undefined ? status : existing.getStatus(),
    });
    const newSymbol = symbol !== undefined ? symbol : existing.getSymbol();

    await this.#pool.execute(
      `UPDATE candidates
          SET candidate_name = ?, party_name = ?, symbol_image = ?,
              description = ?, status = ?
        WHERE id = ?`,
      [
        clean.name,
        clean.party,
        newSymbol,
        clean.description,
        clean.status,
        existing.getId(),
      ]
    );

    // The symbol changed away from an uploaded file → tidy up the orphan.
    if (symbol !== undefined && symbol !== existing.getSymbol()) {
      this.#unlinkUpload(existing.getSymbol());
    }
    return this.getById(existing.getId());
  }

  /**
   * Delete a candidate — refused if they've received any votes, because
   * removing them would orphan ballot history (and the votes FK would
   * reject it anyway). The right tool for retiring a voted-for candidate
   * is status = "inactive".
   */
  async remove(candidateId) {
    const existing = await this.getById(candidateId);
    if (!existing) throw fail("NOT_FOUND", "Candidate not found.");

    const [[{ n }]] = await this.#pool.execute(
      `SELECT COUNT(*) AS n FROM votes WHERE candidate_id = ?`,
      [existing.getId()]
    );
    if (n > 0) {
      throw fail(
        "HAS_VOTES",
        "This candidate has received votes and cannot be deleted. " +
          "Set their status to Inactive instead."
      );
    }

    await this.#pool.execute(`DELETE FROM candidates WHERE id = ?`, [
      existing.getId(),
    ]);
    this.#unlinkUpload(existing.getSymbol());
    return existing;
  }

  // ---- Private helpers ----------------------------------------------------

  /**
   * Normalise + validate the text fields. Throws VALIDATION errors with
   * messages safe to show in the admin form.
   */
  #validate({ name, party, description, status }) {
    const cleanName = String(name ?? "").trim();
    const cleanParty = String(party ?? "").trim();
    const cleanDescription =
      description === null || description === undefined
        ? null
        : String(description).trim() || null;
    const cleanStatus = String(status ?? "active").trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 100) {
      throw fail("VALIDATION", "Candidate name must be 2–100 characters.");
    }
    if (cleanParty.length < 2 || cleanParty.length > 100) {
      throw fail("VALIDATION", "Party name must be 2–100 characters.");
    }
    if (cleanDescription && cleanDescription.length > 1000) {
      throw fail("VALIDATION", "Description must be 1000 characters or fewer.");
    }
    if (cleanStatus !== "active" && cleanStatus !== "inactive") {
      throw fail("VALIDATION", "Status must be 'active' or 'inactive'.");
    }
    return {
      name: cleanName,
      party: cleanParty,
      description: cleanDescription,
      status: cleanStatus,
    };
  }

  /**
   * Delete a previously uploaded symbol file. Best-effort: emojis and
   * external URLs are skipped, and unlink failures are only logged —
   * a missing file must never break an admin action.
   */
  #unlinkUpload(symbol) {
    if (typeof symbol !== "string" || !symbol.startsWith("/uploads/")) return;
    const file = path.join(UPLOAD_DIR, path.basename(symbol));
    fs.unlink(file, (err) => {
      if (err && err.code !== "ENOENT") {
        console.warn(`[candidates] Could not remove old symbol ${file}:`, err.message);
      }
    });
  }
}

module.exports = CandidateManager;

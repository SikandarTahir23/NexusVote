const crypto = require("crypto");

/**
 * AdminSessionService — issues and verifies admin bearer tokens.
 *
 * After a successful /admin/login the controller asks this service for a
 * token; every subsequent admin request carries it back in an
 * `Authorization: Bearer <token>` header which the requireAdmin
 * middleware verifies here.
 *
 * Sessions live in an in-memory Map, which is the right level of
 * complexity for this project: no extra table, no JWT library, and a
 * 64-char random hex token is unguessable. The tradeoffs (documented so
 * the report can discuss them):
 *  - tokens vanish on server restart → the frontend treats a 401 as
 *    "session expired, sign in again"
 *  - a single process only — a real deployment would swap this class for
 *    a JWT or Redis-backed implementation behind the same interface
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: the session map and TTL are private fields.
 *  - ABSTRACTION: callers only know issue / verify / revoke.
 */
class AdminSessionService {
  /** @type {Map<string, { profile: object, expiresAt: number }>} */
  #sessions = new Map();
  #ttlMs;

  constructor(ttlMs = 8 * 60 * 60 * 1000) {
    this.#ttlMs = ttlMs; // default: 8 hours
  }

  /**
   * Create a session for a verified admin profile.
   * @returns {string} the bearer token to hand to the client
   */
  issue(profile) {
    const token = crypto.randomBytes(32).toString("hex");
    this.#sessions.set(token, {
      profile,
      expiresAt: Date.now() + this.#ttlMs,
    });
    return token;
  }

  /**
   * Look up a token. Returns the admin profile, or null if the token is
   * unknown or expired (expired entries are pruned on touch).
   */
  verify(token) {
    const session = this.#sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.#sessions.delete(token);
      return null;
    }
    return session.profile;
  }

  /** End a session (logout). Safe to call with an unknown token. */
  revoke(token) {
    this.#sessions.delete(token);
  }
}

module.exports = AdminSessionService;

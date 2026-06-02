const User = require("../models/User");

/**
 * AuthenticationService — verifies CNIC numbers and registers active voters.
 *
 * For this prototype we accept any well-formed CNIC (13 digits, optional
 * dashes) and persist the resulting User via the injected UserStore.
 * Phase 2 would replace this with NADRA lookup + signed session tokens.
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: the user store is private.
 *  - ABSTRACTION: callers say "verify this CNIC" without knowing the
 *    validation rules or storage details.
 *  - POLYMORPHISM: the constructor accepts any UserStore subclass.
 */
class AuthenticationService {
  #userStore;
  #adminStore;

  constructor(userStore, adminStore = null) {
    this.#userStore = userStore;
    // adminStore is optional — if not supplied we fall back to env vars
    // (ADMIN_EMAIL / ADMIN_PASSWORD) so the existing behaviour stays intact.
    this.#adminStore = adminStore;
  }

  /**
   * Validate the format of a Pakistani CNIC.
   * Accepts "3520112345671" or "35201-1234567-1".
   */
  isValidCnicFormat(cnic) {
    if (typeof cnic !== "string") return false;
    const digits = cnic.replace(/-/g, "");
    return /^\d{13}$/.test(digits);
  }

  /**
   * Normalize a CNIC to the 13-digit canonical form (no dashes).
   */
  normalizeCnic(cnic) {
    return cnic.replace(/-/g, "");
  }

  /**
   * Step 1 of the flow: confirm the CNIC is well-formed and eligible to vote.
   * Pure validation — no I/O — so it stays synchronous.
   */
  verifyCnic(rawCnic) {
    if (!this.isValidCnicFormat(rawCnic)) {
      return { ok: false, error: "Invalid CNIC. Expected 13 digits." };
    }
    return { ok: true, cnic: this.normalizeCnic(rawCnic) };
  }

  /**
   * Step 2 of the flow: persist the user's display name against their CNIC.
   * Returns the User instance (idempotent — UPSERT updates name if called twice).
   */
  async registerUser({ cnic, name }) {
    if (!this.isValidCnicFormat(cnic)) {
      throw new Error("Invalid CNIC.");
    }
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new Error("Name must be at least 2 characters.");
    }
    const canonical = this.normalizeCnic(cnic);
    const user = new User({ cnic: canonical, name: name.trim() });
    return this.#userStore.upsert(user);
  }

  async getUser(cnic) {
    return this.#userStore.find(this.normalizeCnic(cnic));
  }

  /**
   * Length-independent constant-time string compare. Cheap defence against
   * timing attacks on the admin password — overkill for a demo, but matches
   * what the existing Next.js admin route already does.
   */
  static #safeEqual(a, b) {
    if (typeof a !== "string" || typeof b !== "string") return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  /**
   * Admin login.
   *
   * Resolution order:
   *  1. If an AdminStore was injected, look the email up in the DB and
   *     verify the password via the Admin model.
   *  2. Otherwise (or if the DB row is missing) fall back to the
   *     ADMIN_EMAIL / ADMIN_PASSWORD environment variables — keeps the
   *     existing university-demo credentials working unchanged.
   *
   * Returns { ok: true, profile } on success, { ok: false, error } on failure.
   */
  async loginAdmin({ email, password }) {
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPassword = typeof password === "string" ? password : "";

    if (!cleanEmail || !cleanPassword) {
      return { ok: false, error: "Email and password are required." };
    }

    // DB-backed lookup first.
    if (this.#adminStore) {
      const admin = await this.#adminStore.find(cleanEmail);
      if (admin && admin.verifyPassword(cleanPassword)) {
        return {
          ok: true,
          profile: {
            email: admin.email || cleanEmail,
            name: admin.getName(),
            department: admin.department || "NexusVote Operations",
            role: admin.getRole(),
          },
        };
      }
    }

    // Env-var fallback (matches the legacy Next.js /api/admin/login route).
    const envEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD || "";
    if (envEmail && envPassword) {
      const okEmail = AuthenticationService.#safeEqual(cleanEmail, envEmail);
      const okPassword = AuthenticationService.#safeEqual(cleanPassword, envPassword);
      if (okEmail && okPassword) {
        return {
          ok: true,
          profile: {
            email: envEmail,
            name: "Platform Administrator",
            department: "NexusVote Operations",
            role: "ADMIN",
          },
        };
      }
    }

    return { ok: false, error: "Invalid administrator credentials." };
  }
}

module.exports = AuthenticationService;

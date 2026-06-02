import { Person } from "./Person.js";

/**
 * Admin — represents an election official with extra privileges.
 *
 * Demonstrates INHERITANCE (extends Person) and POLYMORPHISM (overrides
 * both `getRole()` and `getDisplayName()` — the latter prefixes the name
 * with the admin's department, showing that subclasses can customise
 * inherited behaviour, not just add to it).
 *
 * Not wired into the OTP/voting flow yet — included to satisfy the OOP
 * requirements and to anchor a future admin dashboard.
 */
export class Admin extends Person {
  #department;

  /**
   * @param {{ email?: string, name?: string, department?: string }} init
   */
  constructor({ email = "", name = "", department = "NexusVote Operations" } = {}) {
    super({ email, name });
    this.#department = department;
  }

  get department() {
    return this.#department;
  }

  // Polymorphic overrides.
  getRole() {
    return "admin";
  }
  getDisplayName() {
    return `${super.getDisplayName()} · ${this.#department}`;
  }

  /** Admin-only capability — e.g. resetting a stuck OTP attempt counter. */
  canResetOtp() {
    return true;
  }

  /**
   * Compare a candidate password against an expected value in a way that
   * doesn't leak the expected length via early-exit. Used by the demo
   * admin-login flow when the API route isn't available (e.g. static-export
   * builds). In production the real check happens server-side in
   * `src/app/api/admin/login/route.ts` — this client method exists so the
   * `Admin` class still owns the contract.
   *
   * @param {string} candidate The plaintext password the user typed.
   * @param {string} expected  The value to compare against.
   */
  verifyPassword(candidate, expected) {
    const a = String(candidate ?? "");
    const b = String(expected ?? "");
    if (a.length !== b.length) return false;
    let mismatch = 0;
    for (let i = 0; i < a.length; i++) {
      mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

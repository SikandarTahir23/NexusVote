import { Person } from "./Person.js";

/**
 * User — represents a regular voter.
 *
 * Demonstrates INHERITANCE: extends `Person` and reuses its encapsulated
 * email/name plumbing.
 *
 * Adds voter-specific state (CNIC, hasVoted flag) and overrides `getRole()`
 * (POLYMORPHISM).
 */
export class User extends Person {
  #cnic;
  #hasVoted;

  /**
   * @param {{ email?: string, name?: string, cnic?: string }} init
   */
  constructor({ email = "", name = "", cnic = "" } = {}) {
    super({ email, name });
    this.#cnic = User.normalizeCnic(cnic);
    this.#hasVoted = false;
  }

  get cnic() {
    return this.#cnic;
  }
  set cnic(value) {
    const normalized = User.normalizeCnic(value);
    if (!User.isValidCnic(normalized)) {
      throw new Error("CNIC must be exactly 13 digits.");
    }
    this.#cnic = normalized;
  }

  get hasVoted() {
    return this.#hasVoted;
  }

  /** Mark voter as having cast a ballot. One-way flag — cannot be unset. */
  markVoted() {
    this.#hasVoted = true;
  }

  // Polymorphic override.
  getRole() {
    return "voter";
  }

  /** CNIC is 13 digits, optionally with two dashes (XXXXX-XXXXXXX-X). */
  static normalizeCnic(raw) {
    return String(raw || "").replace(/\D/g, "").slice(0, 13);
  }

  static isValidCnic(value) {
    return /^\d{13}$/.test(String(value));
  }

  /** Pretty 35201-1234567-1 format for receipts and confirmations. */
  static formatCnic(value) {
    const d = User.normalizeCnic(value);
    if (d.length !== 13) return d;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
  }
}

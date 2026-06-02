/**
 * Person — abstract base class.
 *
 * Demonstrates ABSTRACTION: it defines the shape and shared behaviour of
 * everyone in the system (voters, admins, candidates) but is not meant to
 * be instantiated directly. Subclasses MUST override `getRole()`.
 *
 * Also demonstrates ENCAPSULATION: identifying fields (#email, #name) are
 * private and only accessible through public getters/setters that can run
 * validation.
 */
export class Person {
  // Private (encapsulated) state — only this class can touch these slots.
  #email;
  #name;

  /**
   * @param {{ email?: string, name?: string }} init
   */
  constructor({ email = "", name = "" } = {}) {
    // Block direct `new Person(...)` to enforce abstraction.
    if (new.target === Person) {
      throw new Error(
        "Person is abstract and cannot be instantiated directly. " +
          "Use User, Admin or Candidate instead."
      );
    }
    this.#email = email.trim().toLowerCase();
    this.#name = name.trim();
  }

  // ---- Encapsulated accessors -------------------------------------------

  get email() {
    return this.#email;
  }
  set email(value) {
    if (typeof value !== "string" || !Person.isValidEmail(value)) {
      throw new Error("Invalid email address.");
    }
    this.#email = value.trim().toLowerCase();
  }

  get name() {
    return this.#name;
  }
  set name(value) {
    if (typeof value !== "string" || value.trim().length < 2) {
      throw new Error("Name must be at least 2 characters.");
    }
    this.#name = value.trim();
  }

  // ---- Abstract contract -------------------------------------------------

  /**
   * Each subclass returns its own role. Demonstrates POLYMORPHISM: callers
   * (e.g. an audit log) use `person.getRole()` without caring about the
   * concrete type.
   */
  getRole() {
    throw new Error(
      `${this.constructor.name} must override getRole().`
    );
  }

  /**
   * Default display-name implementation; subclasses may override.
   */
  getDisplayName() {
    return this.#name || this.#email || "Unknown";
  }

  // ---- Static helpers ----------------------------------------------------

  /** Loose RFC-5322-ish email check — good enough for a university demo. */
  static isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
  }
}

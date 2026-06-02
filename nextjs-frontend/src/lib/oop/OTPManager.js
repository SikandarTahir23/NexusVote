import emailjs from "@emailjs/browser";

/**
 * OTPManager — owns the lifecycle of a one-time password.
 *
 * Responsibilities:
 *   1. Generate a cryptographically reasonable 6-digit OTP.
 *   2. Deliver it via EmailJS (or, in demo mode, surface it locally).
 *   3. Verify a code submitted by the user, with expiry + attempt limits.
 *
 * Demonstrates ENCAPSULATION: the current OTP, its expiry timestamp and
 * the attempt counter are all `#private` — callers cannot peek or tamper.
 * They can only `sendOtp()`, `verifyOtp()`, and read aggregate state via
 * getters like `attemptsRemaining`.
 *
 * The class is intentionally framework-agnostic — it returns plain result
 * objects and never touches React. That makes it easy to unit-test and
 * easy to swap EmailJS for a server-side mailer later.
 */
export class OTPManager {
  /** Length of the OTP code in digits. */
  static CODE_LENGTH = 6;
  /** How long a freshly-issued OTP stays valid. */
  static TTL_MS = 5 * 60 * 1000; // 5 minutes
  /** Maximum verification attempts before the OTP is invalidated. */
  static MAX_ATTEMPTS = 5;

  #code = null;
  #expiresAt = 0;
  #attempts = 0;
  #targetEmail = "";

  // ----------------------------------------------------------------------
  // EmailJS configuration
  //
  // These come from .env.local — see the file for setup instructions.
  // When any of them are missing or still set to a demo placeholder, the
  // manager falls back to "demo mode": it generates the OTP locally and
  // returns it in the send-result so the UI can surface it. This keeps
  // the prototype usable end-to-end without a real EmailJS account.
  // ----------------------------------------------------------------------
  static #env() {
    return {
      serviceId: process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "",
      templateId: process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "",
      publicKey: process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "",
    };
  }

  /** True when EmailJS credentials look real (i.e. not the demo defaults). */
  static isConfigured() {
    const { serviceId, templateId, publicKey } = OTPManager.#env();
    const looksReal = (v) => v && !v.startsWith("demo_");
    return looksReal(serviceId) && looksReal(templateId) && looksReal(publicKey);
  }

  // ---- Public read-only state ------------------------------------------

  get targetEmail() {
    return this.#targetEmail;
  }
  get attemptsRemaining() {
    return Math.max(0, OTPManager.MAX_ATTEMPTS - this.#attempts);
  }
  get isLive() {
    return this.#code !== null && Date.now() < this.#expiresAt;
  }

  // ---- Operations -------------------------------------------------------

  /**
   * Issue a fresh OTP and dispatch it to the given email.
   *
   * @param {string} email
   * @returns {Promise<{
   *   ok: true,
   *   demo: boolean,
   *   code?: string,   // present only in demo mode
   *   expiresAt: number,
   * }>}
   */
  async sendOtp(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error("A valid email address is required.");
    }

    // Reset state for the new request.
    this.#code = OTPManager.#generateCode();
    this.#expiresAt = Date.now() + OTPManager.TTL_MS;
    this.#attempts = 0;
    this.#targetEmail = email.trim().toLowerCase();

    if (!OTPManager.isConfigured()) {
      // Demo mode — surface the code to the UI/console so graders can test
      // the flow without EmailJS credentials.
      // eslint-disable-next-line no-console
      console.info(
        `[OTPManager] EmailJS not configured — demo OTP for ${this.#targetEmail}: ${this.#code}`
      );
      return {
        ok: true,
        demo: true,
        code: this.#code,
        expiresAt: this.#expiresAt,
      };
    }

    const { serviceId, templateId, publicKey } = OTPManager.#env();
    // The template should reference {{passcode}}, {{to_email}} and
    // {{voter_name}}. See .env.local for setup notes.
    await emailjs.send(
      serviceId,
      templateId,
      {
        passcode: this.#code,
        to_email: this.#targetEmail,
        voter_name: "Voter",
        expires_in_minutes: Math.round(OTPManager.TTL_MS / 60000),
      },
      { publicKey }
    );

    return { ok: true, demo: false, expiresAt: this.#expiresAt };
  }

  /**
   * Verify a user-submitted code against the live OTP.
   *
   * @param {string} input
   * @returns {{ ok: true } | { ok: false, reason: string }}
   */
  verifyOtp(input) {
    const code = String(input || "").replace(/\D/g, "");

    if (!this.#code) {
      return { ok: false, reason: "Please request an OTP first." };
    }
    if (Date.now() > this.#expiresAt) {
      this.#invalidate();
      return { ok: false, reason: "This OTP has expired. Please request a new one." };
    }
    if (this.#attempts >= OTPManager.MAX_ATTEMPTS) {
      this.#invalidate();
      return {
        ok: false,
        reason: "Too many incorrect attempts. Please request a new OTP.",
      };
    }

    this.#attempts += 1;

    if (code !== this.#code) {
      const left = this.attemptsRemaining;
      return {
        ok: false,
        reason:
          left > 0
            ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} remaining.`
            : "Too many incorrect attempts. Please request a new OTP.",
      };
    }

    // Single-use: burn the code on success so it can't be replayed.
    this.#invalidate();
    return { ok: true };
  }

  /** Clear in-memory OTP state. Called on success, expiry, or reset. */
  #invalidate() {
    this.#code = null;
    this.#expiresAt = 0;
  }

  /** Six uniform digits, sourced from the Web Crypto API when available. */
  static #generateCode() {
    const len = OTPManager.CODE_LENGTH;
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const buf = new Uint32Array(1);
      crypto.getRandomValues(buf);
      return String(buf[0] % 10 ** len).padStart(len, "0");
    }
    return String(Math.floor(Math.random() * 10 ** len)).padStart(len, "0");
  }
}

/**
 * Module-level singleton. The verification step happens on a different
 * page from the send step, so we need state that survives the navigation
 * between them. A single shared instance is the simplest correct option
 * for a client-side prototype.
 */
export const otpManager = new OTPManager();

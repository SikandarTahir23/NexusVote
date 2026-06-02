import { User } from "./User.js";
import { otpManager } from "./OTPManager.js";

/**
 * AuthenticationManager — orchestrates the full pre-vote auth flow:
 *   Email  →  OTP  →  CNIC  →  Name
 *
 * Demonstrates ABSTRACTION: the UI components don't need to know how an
 * OTP is generated, how a CNIC is validated, or how session state is
 * stored. They just call `requestOtp`, `confirmOtp`, `setCnic`, `setName`,
 * and ask `isAuthenticated()`.
 *
 * Demonstrates ENCAPSULATION: the in-progress `User` and the auth-stage
 * flag are both private; callers can read derived state via getters but
 * cannot, for example, flip the stage forward without going through the
 * matching method.
 *
 * State is persisted to `sessionStorage` so the user survives page
 * navigation between /auth/email, /auth/otp, /verify, /identity, /ballot.
 */
export class AuthenticationManager {
  /** Auth stages, in order. */
  static STAGES = Object.freeze({
    EMAIL: "email",
    OTP_SENT: "otp_sent",
    OTP_VERIFIED: "otp_verified",
    CNIC_VERIFIED: "cnic_verified",
    NAME_CONFIRMED: "name_confirmed",
  });

  static #STORAGE_KEY = "voting.auth";

  #user;
  #stage;

  constructor() {
    this.#user = new User();
    this.#stage = AuthenticationManager.STAGES.EMAIL;
    this.#hydrate();
  }

  // ---- Read-only views --------------------------------------------------

  get stage() {
    return this.#stage;
  }
  get email() {
    return this.#user.email;
  }
  get cnic() {
    return this.#user.cnic;
  }
  get name() {
    return this.#user.name;
  }

  /** Has the user completed every step needed to reach the ballot? */
  isAuthenticated() {
    return this.#stage === AuthenticationManager.STAGES.NAME_CONFIRMED;
  }

  /** Has the user at least verified their OTP? Used for route guards. */
  hasPassedOtp() {
    const s = this.#stage;
    const S = AuthenticationManager.STAGES;
    return (
      s === S.OTP_VERIFIED || s === S.CNIC_VERIFIED || s === S.NAME_CONFIRMED
    );
  }

  hasPassedCnic() {
    const s = this.#stage;
    const S = AuthenticationManager.STAGES;
    return s === S.CNIC_VERIFIED || s === S.NAME_CONFIRMED;
  }

  // ---- Stage transitions ------------------------------------------------

  /** Issue an OTP to `email`. Throws on invalid email. */
  async requestOtp(email) {
    this.#user.email = email; // setter validates the email format
    const result = await otpManager.sendOtp(this.#user.email);
    this.#stage = AuthenticationManager.STAGES.OTP_SENT;
    this.#persist();
    return result;
  }

  /**
   * Verify the OTP the user typed. On success the stage advances; on
   * failure the stage is unchanged and a reason is returned.
   */
  confirmOtp(code) {
    const result = otpManager.verifyOtp(code);
    if (result.ok) {
      this.#stage = AuthenticationManager.STAGES.OTP_VERIFIED;
      this.#persist();
    }
    return result;
  }

  setCnic(cnic) {
    this.#user.cnic = cnic; // setter validates
    this.#stage = AuthenticationManager.STAGES.CNIC_VERIFIED;
    this.#persist();
  }

  setName(name) {
    this.#user.name = name; // setter validates
    this.#stage = AuthenticationManager.STAGES.NAME_CONFIRMED;
    this.#persist();
  }

  /** Wipe all auth state. Called after a successful vote, or on cancel. */
  reset() {
    this.#user = new User();
    this.#stage = AuthenticationManager.STAGES.EMAIL;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(AuthenticationManager.#STORAGE_KEY);
    }
  }

  /** Snapshot for the success page / receipt. */
  snapshot() {
    return {
      email: this.#user.email,
      cnic: this.#user.cnic,
      formattedCnic: User.formatCnic(this.#user.cnic),
      name: this.#user.name,
      stage: this.#stage,
    };
  }

  // ---- Persistence (private) -------------------------------------------

  #persist() {
    if (typeof window === "undefined") return;
    const payload = {
      email: this.#user.email,
      cnic: this.#user.cnic,
      name: this.#user.name,
      stage: this.#stage,
    };
    sessionStorage.setItem(
      AuthenticationManager.#STORAGE_KEY,
      JSON.stringify(payload)
    );
  }

  #hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(AuthenticationManager.#STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      // Rebuild the User through setters so validation re-runs.
      this.#user = new User();
      if (data.email) this.#user.email = data.email;
      if (data.cnic) this.#user.cnic = data.cnic;
      if (data.name) this.#user.name = data.name;
      if (
        typeof data.stage === "string" &&
        Object.values(AuthenticationManager.STAGES).includes(data.stage)
      ) {
        this.#stage = data.stage;
      }
    } catch {
      // Corrupt session — start fresh.
      this.reset();
    }
  }
}

/**
 * Shared singleton. One auth session per browser tab.
 *
 * We lazy-create on the client to avoid touching `sessionStorage` during
 * Next.js server rendering.
 */
let _instance = null;
export function getAuthManager() {
  if (!_instance) _instance = new AuthenticationManager();
  return _instance;
}

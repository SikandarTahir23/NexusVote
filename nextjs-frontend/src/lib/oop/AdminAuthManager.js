import { Admin } from "./Admin.js";

/**
 * AdminAuthManager — orchestrates the admin sign-in session.
 *
 * Mirrors `AuthenticationManager` but for the dashboard side of the app:
 * one login step, no OTP, no CNIC. State is persisted to `sessionStorage`
 * so a page refresh while on `/admin/dashboard` keeps the admin signed in
 * for the duration of the tab.
 *
 * Demonstrates ABSTRACTION (the dashboard never sees the API route or the
 * session shape — it just asks `isLoggedIn` and calls `login()` / `logout()`)
 * and ENCAPSULATION (the live `Admin` instance is private; callers read it
 * through the getter).
 *
 * Verification of credentials happens **server-side** in
 * `src/app/api/admin/login/route.ts` so the password is never bundled into
 * the browser. This class is the thin client-side facade in front of it.
 */
export class AdminAuthManager {
  static #STORAGE_KEY = "voting.admin";

  /** @type {Admin | null} */
  #admin = null;
  /** @type {number} */
  #loggedInAt = 0;

  constructor() {
    this.#hydrate();
  }

  // ---- Read-only views --------------------------------------------------

  /** The currently signed-in admin, or null. */
  get admin() {
    return this.#admin;
  }

  get isLoggedIn() {
    return this.#admin !== null;
  }

  get loggedInAt() {
    return this.#loggedInAt;
  }

  /**
   * Snapshot for the dashboard header.
   * @returns {{ email: string, name: string, displayName: string,
   *   department: string, loggedInAt: number } | null}
   */
  snapshot() {
    if (!this.#admin) return null;
    return {
      email: this.#admin.email,
      name: this.#admin.name,
      displayName: this.#admin.getDisplayName(),
      department: this.#admin.department,
      loggedInAt: this.#loggedInAt,
    };
  }

  // ---- Operations -------------------------------------------------------

  /**
   * Attempt to sign in. POSTs to the server route which checks the
   * credentials against env vars. Returns `{ ok }` on success, throws on
   * network failure, returns `{ ok: false, reason }` on rejection.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ ok: true } | { ok: false, reason: string }>}
   */
  async login(email, password) {
    let res;
    try {
      res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (err) {
      return {
        ok: false,
        reason: "Network error — please try again.",
      };
    }

    let data;
    try {
      data = await res.json();
    } catch {
      return { ok: false, reason: "Unexpected server response." };
    }

    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        reason: data?.reason || "Invalid administrator credentials.",
      };
    }

    // Build the polymorphic Admin instance from the profile the server
    // returned. We never trust the client-supplied password again.
    this.#admin = new Admin({
      email: data.profile?.email || email,
      name: data.profile?.name || "Platform Administrator",
      department: data.profile?.department || "NexusVote Operations",
    });
    this.#loggedInAt = Date.now();
    this.#persist();
    return { ok: true };
  }

  /** End the admin session. */
  logout() {
    this.#admin = null;
    this.#loggedInAt = 0;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(AdminAuthManager.#STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }

  // ---- Persistence (private) -------------------------------------------

  #persist() {
    if (typeof window === "undefined" || !this.#admin) return;
    try {
      sessionStorage.setItem(
        AdminAuthManager.#STORAGE_KEY,
        JSON.stringify({
          email: this.#admin.email,
          name: this.#admin.name,
          department: this.#admin.department,
          loggedInAt: this.#loggedInAt,
        })
      );
    } catch {
      /* storage disabled — session simply won't survive a refresh */
    }
  }

  #hydrate() {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(AdminAuthManager.#STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data?.email || !data?.name) return;
      this.#admin = new Admin({
        email: data.email,
        name: data.name,
        department: data.department || "NexusVote Operations",
      });
      this.#loggedInAt = Number(data.loggedInAt) || Date.now();
    } catch {
      // Corrupt payload — start anonymous.
      try {
        sessionStorage.removeItem(AdminAuthManager.#STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Shared singleton — one admin session per browser tab.
 * Lazy so we don't touch sessionStorage during Next.js server rendering.
 */
let _instance = null;
export function getAdminAuthManager() {
  if (!_instance) _instance = new AdminAuthManager();
  return _instance;
}

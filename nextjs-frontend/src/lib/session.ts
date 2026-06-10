/**
 * Lightweight client-side session — persists CNIC + name across the
 * multi-step flow using sessionStorage. Cleared on tab close.
 */

const KEY = "voting.session";

export type Session = {
  cnic?: string;
  name?: string;
  email?: string;
};

export function getSession(): Session {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function setSession(patch: Session) {
  if (typeof window === "undefined") return;
  const next = { ...getSession(), ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

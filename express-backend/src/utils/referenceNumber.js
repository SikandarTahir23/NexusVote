/**
 * referenceNumber.js — reusable vote reference-number generator.
 *
 * Produces a human-readable, sortable receipt id in the format:
 *
 *     VOTE-YYYYMMDD-XXXX
 *     e.g. VOTE-20260611-1024
 *
 * Where:
 *   - YYYYMMDD is the calendar date the vote was cast (local time).
 *   - XXXX is a 4-digit suffix. By default it is random (0000–9999),
 *     which keeps the reference short and unguessable enough for a receipt
 *     while staying easy to read out loud. Callers that need a deterministic
 *     suffix (e.g. tests, or deriving a stable ref from an existing row) can
 *     pass one in.
 *
 * This is the single source of truth for the reference format — the Vote
 * model and the MySQL store both call it, so the format can never drift
 * between "the ref we email" and "the ref we store".
 */

/**
 * Format a Date as YYYYMMDD using its local components.
 * @param {Date} date
 * @returns {string}
 */
function formatDatePart(date) {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * Generate a vote reference number of the form VOTE-YYYYMMDD-XXXX.
 *
 * @param {Object} [options]
 * @param {Date}   [options.date]   - Date the vote was cast. Defaults to now.
 * @param {number|string} [options.suffix] - Explicit 4-digit suffix. When
 *        omitted a random 0000–9999 value is used. Numbers are zero-padded;
 *        strings are taken as-is after stripping non-digits and padding.
 * @returns {string} e.g. "VOTE-20260611-1024"
 */
function generateReferenceNumber(options = {}) {
  const { date = new Date(), suffix } = options;

  const datePart = formatDatePart(date instanceof Date ? date : new Date(date));

  let suffixPart;
  if (suffix === undefined || suffix === null || suffix === "") {
    // Random 0–9999, zero-padded to 4 digits.
    suffixPart = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  } else {
    // Normalise an explicit suffix: keep digits, take the last 4, pad to 4.
    const digits = String(suffix).replace(/\D/g, "").slice(-4);
    suffixPart = digits.padStart(4, "0");
  }

  return `VOTE-${datePart}-${suffixPart}`;
}

/** True if `value` matches the canonical VOTE-YYYYMMDD-XXXX shape. */
function isValidReferenceNumber(value) {
  return typeof value === "string" && /^VOTE-\d{8}-\d{4}$/.test(value);
}

/**
 * Derive a canonical-format reference for a legacy votes row that predates
 * the reference_number column (so its stored value is NULL). We build it
 * from the row's own timestamp + CNIC so it is stable across reads — the
 * same row always derives the same ref — without colliding for two ballots
 * cast on the same day.
 *
 * @param {string|Date} votedAt - the row's voted_at value
 * @param {string} [cnic] - the voter CNIC, used for the 4-digit suffix
 * @returns {string|null} VOTE-YYYYMMDD-XXXX, or null if votedAt is missing
 */
function deriveLegacyReference(votedAt, cnic = "") {
  if (!votedAt) return null;
  const date = votedAt instanceof Date ? votedAt : new Date(votedAt);
  if (Number.isNaN(date.getTime())) return null;
  // Suffix from the last 4 digits of the CNIC, falling back to the time
  // portion of the timestamp when no CNIC is available.
  const cnicDigits = String(cnic).replace(/\D/g, "");
  const suffix =
    cnicDigits.length >= 4
      ? cnicDigits.slice(-4)
      : String(votedAt).replace(/\D/g, "").slice(-4);
  return generateReferenceNumber({ date, suffix });
}

module.exports = {
  generateReferenceNumber,
  isValidReferenceNumber,
  deriveLegacyReference,
};

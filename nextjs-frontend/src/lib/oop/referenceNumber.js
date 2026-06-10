/**
 * referenceNumber.js — client-side mirror of the backend reference-number
 * generator (express-backend/src/utils/referenceNumber.js). Used only on the
 * OFFLINE fallback path, so a vote recorded when the API is unreachable still
 * gets a receipt id in the same canonical format the server would have minted:
 *
 *     VOTE-YYYYMMDD-XXXX
 *
 * Keeping the format identical means the success page and admin dashboard
 * render the same shape regardless of whether the online or offline path ran.
 */

/** Format a Date as YYYYMMDD from its local components. */
function formatDatePart(date) {
  const yyyy = String(date.getFullYear()).padStart(4, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * Generate a vote reference number (VOTE-YYYYMMDD-XXXX).
 *
 * @param {Object} [options]
 * @param {Date}   [options.date]   - vote date; defaults to now.
 * @param {number|string} [options.suffix] - explicit 4-digit suffix; random when omitted.
 * @returns {string}
 */
export function generateReferenceNumber(options = {}) {
  const { date = new Date(), suffix } = options;
  const datePart = formatDatePart(date instanceof Date ? date : new Date(date));

  let suffixPart;
  if (suffix === undefined || suffix === null || suffix === "") {
    suffixPart = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  } else {
    suffixPart = String(suffix).replace(/\D/g, "").slice(-4).padStart(4, "0");
  }
  return `VOTE-${datePart}-${suffixPart}`;
}

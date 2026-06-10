/**
 * Tests for the reference-number generator. Uses Node's built-in test
 * runner (node:test) + assert — no extra dependencies. Run with:
 *
 *     npm test
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  generateReferenceNumber,
  isValidReferenceNumber,
} = require("./referenceNumber");

test("matches the VOTE-YYYYMMDD-XXXX format", () => {
  const ref = generateReferenceNumber();
  assert.match(ref, /^VOTE-\d{8}-\d{4}$/, `unexpected format: ${ref}`);
  assert.ok(isValidReferenceNumber(ref));
});

test("uses the supplied date for the YYYYMMDD part", () => {
  // 2026-06-11 — note month is 0-indexed in the Date constructor.
  const ref = generateReferenceNumber({ date: new Date(2026, 5, 11) });
  assert.ok(ref.startsWith("VOTE-20260611-"), `got: ${ref}`);
});

test("zero-pads single-digit months and days", () => {
  const ref = generateReferenceNumber({ date: new Date(2026, 0, 3) }); // Jan 3
  assert.ok(ref.startsWith("VOTE-20260103-"), `got: ${ref}`);
});

test("zero-pads a numeric suffix to four digits", () => {
  const ref = generateReferenceNumber({
    date: new Date(2026, 5, 11),
    suffix: 42,
  });
  assert.equal(ref, "VOTE-20260611-0042");
});

test("accepts the example from the spec", () => {
  const ref = generateReferenceNumber({
    date: new Date(2026, 5, 11),
    suffix: 1024,
  });
  assert.equal(ref, "VOTE-20260611-1024");
});

test("normalises an over-long / noisy string suffix to the last 4 digits", () => {
  const ref = generateReferenceNumber({
    date: new Date(2026, 5, 11),
    suffix: "ab12-3456",
  });
  assert.equal(ref, "VOTE-20260611-3456");
});

test("random suffixes stay within 0000–9999", () => {
  for (let i = 0; i < 1000; i++) {
    const ref = generateReferenceNumber();
    const suffix = ref.slice(-4);
    assert.match(suffix, /^\d{4}$/);
    const n = Number(suffix);
    assert.ok(n >= 0 && n <= 9999);
  }
});

test("isValidReferenceNumber rejects malformed values", () => {
  assert.equal(isValidReferenceNumber("VOTE-2026611-1024"), false); // 7-digit date
  assert.equal(isValidReferenceNumber("VOTE-20260611-12"), false); // short suffix
  assert.equal(isValidReferenceNumber("VR-20260611-1024"), false); // wrong prefix
  assert.equal(isValidReferenceNumber(""), false);
  assert.equal(isValidReferenceNumber(null), false);
});

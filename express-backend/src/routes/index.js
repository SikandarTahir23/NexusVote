const express = require("express");
const authController = require("../controllers/authController");
const candidateController = require("../controllers/candidateController");
const voteController = require("../controllers/voteController");
const adminController = require("../controllers/adminController");

const router = express.Router();

// ── Voter flow ────────────────────────────────────────────────────────────

// Step 1 — verify CNIC format / eligibility.
router.post("/verify-cnic", authController.verifyCnic);

// Step 2 — store the voter's display name against the verified CNIC.
router.post("/save-user", authController.saveUser);

// Step 3 — list candidates for the ballot.
router.get("/candidates", candidateController.listCandidates);

// Step 4 — cast a vote (duplicate-protected at the DB layer).
router.post("/cast-vote", voteController.castVote);

// Helper used by the UI to short-circuit users who've already voted.
router.get("/vote-status/:cnic", voteController.checkStatus);

// ── Admin panel ───────────────────────────────────────────────────────────

// Sign-in (DB-backed, falls back to ADMIN_EMAIL / ADMIN_PASSWORD env vars).
router.post("/admin/login", adminController.login);

// Live tally + per-candidate percentages.
router.get("/admin/stats", adminController.stats);

// Roster of registered voters + their cast-vote status (activity feed).
router.get("/admin/voters", adminController.voters);

module.exports = router;

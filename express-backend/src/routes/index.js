const express = require("express");
const multer = require("multer");
const authController = require("../controllers/authController");
const candidateController = require("../controllers/candidateController");
const voteController = require("../controllers/voteController");
const adminController = require("../controllers/adminController");
const adminCandidateController = require("../controllers/adminCandidateController");
const requireAdmin = require("../middleware/requireAdmin");
const uploadSymbol = require("../middleware/uploadSymbol");

const router = express.Router();

// ── Voter flow ────────────────────────────────────────────────────────────

// Step 1 — verify CNIC format / eligibility.
router.post("/verify-cnic", authController.verifyCnic);

// Step 2 — store the voter's display name against the verified CNIC.
router.post("/save-user", authController.saveUser);

// Step 3 — list candidates for the ballot (active candidates only).
router.get("/candidates", candidateController.listCandidates);

// Step 4 — cast a vote (duplicate-protected at the DB layer).
router.post("/cast-vote", voteController.castVote);

// Helper used by the UI to short-circuit users who've already voted.
router.get("/vote-status/:cnic", voteController.checkStatus);

// ── Admin panel ───────────────────────────────────────────────────────────

// Sign-in (DB-backed, falls back to ADMIN_EMAIL / ADMIN_PASSWORD env vars).
// Returns a bearer token the client must send on every other admin route.
router.post("/admin/login", adminController.login);

// Everything below this line requires `Authorization: Bearer <token>`.
// Order matters: login above stays public, the rest is protected.
router.use("/admin", requireAdmin);

router.post("/admin/logout", adminController.logout);

// Live tally + per-candidate percentages + dashboard headline counts.
router.get("/admin/stats", adminController.stats);

// Roster of registered voters + their cast-vote status (activity feed).
router.get("/admin/voters", adminController.voters);

// Candidate management (CRUD). Create/update accept multipart bodies with
// an optional `symbolImage` file (parsed by the uploadSymbol middleware)
// or a `symbolEmoji` text field.
router.get("/admin/candidates", adminCandidateController.list);
router.get("/admin/candidates/:id", adminCandidateController.getOne);
router.post(
  "/admin/candidates",
  uploadSymbol.single("symbolImage"),
  adminCandidateController.create
);
router.put(
  "/admin/candidates/:id",
  uploadSymbol.single("symbolImage"),
  adminCandidateController.update
);
router.delete("/admin/candidates/:id", adminCandidateController.destroy);

// ── Error handler ─────────────────────────────────────────────────────────
//
// Multer throws on oversized or wrong-type uploads *before* the route
// handler runs; without this, the client would get an HTML 500 page.
// Convert those (and our fileFilter error) into the same JSON error
// shape the rest of the API uses.
router.use((err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image is too large — maximum size is 2 MB."
        : `Upload failed: ${err.message}.`;
    return res.status(400).json({ success: false, message });
  }
  if (err && err.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;

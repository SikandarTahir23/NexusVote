const multer = require("multer");
const path = require("path");
const fs = require("fs");

/**
 * uploadSymbol — multer middleware for candidate symbol images.
 *
 * Files land in express-backend/uploads/ and are served statically by
 * server.js at http://localhost:5000/uploads/<filename>. The database
 * stores just the "/uploads/<filename>" path in candidates.symbol_image
 * (the same column that holds an emoji for symbol-less candidates).
 *
 * Validation lives in two places on purpose:
 *  - fileFilter rejects anything that isn't PNG/JPEG/WebP
 *  - limits.fileSize caps uploads at 2 MB
 * Both produce errors that the router-level error handler converts into
 * a clean 400 JSON response instead of an HTML stack trace.
 */

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true }); // idempotent, at module load

// mimetype → extension we trust. We never reuse the client's filename —
// it's attacker-controlled and could contain path tricks.
const ALLOWED = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(
      null,
      `symbol-${Date.now()}-${Math.round(Math.random() * 1e9)}${ALLOWED[file.mimetype]}`
    ),
});

module.exports = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const err = new Error("Only PNG, JPEG, or WebP images are allowed.");
    err.code = "INVALID_FILE_TYPE";
    cb(err);
  },
});

module.exports.UPLOAD_DIR = UPLOAD_DIR;

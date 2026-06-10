/**
 * adminCandidateController — HTTP layer for admin candidate CRUD.
 *
 * Every route here sits behind the requireAdmin middleware (see
 * routes/index.js), so by the time these handlers run the caller has a
 * valid bearer token and `req.admin` is set.
 *
 * Same philosophy as the other controllers: thin handlers that read the
 * request, delegate to CandidateManager, and map its typed errors onto
 * HTTP statuses. Multipart bodies are parsed by the uploadSymbol multer
 * middleware before we get here — text fields land in req.body, the
 * optional image in req.file.
 */

/** Map CandidateManager errors → HTTP responses. */
function sendError(res, err, fallback) {
  if (err.code === "VALIDATION") {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err.code === "NOT_FOUND") {
    return res.status(404).json({ success: false, message: err.message });
  }
  if (err.code === "HAS_VOTES") {
    return res.status(409).json({ success: false, message: err.message });
  }
  console.error(`[admin.candidates] ${fallback}:`, err);
  return res.status(500).json({ success: false, message: fallback });
}

/**
 * Resolve the symbol for a create/update request:
 *  - an uploaded file wins → "/uploads/<filename>"
 *  - else a non-empty symbolEmoji text field
 *  - else undefined → "keep existing" (update) / default (create)
 */
function resolveSymbol(req) {
  if (req.file) return `/uploads/${req.file.filename}`;
  const emoji = typeof req.body.symbolEmoji === "string" ? req.body.symbolEmoji.trim() : "";
  if (emoji) {
    if (emoji.length > 16) return emoji.slice(0, 16); // emoji, not an essay
    return emoji;
  }
  return undefined;
}

/** GET /api/admin/candidates?status=active|inactive */
exports.list = async (req, res) => {
  const { candidateManager } = req.app.locals.services;
  const status = ["active", "inactive"].includes(req.query.status)
    ? req.query.status
    : undefined;
  try {
    const list = await candidateManager.list({ status });
    return res.json({ success: true, candidates: list.map((c) => c.toJSON()) });
  } catch (err) {
    return sendError(res, err, "Could not load candidates.");
  }
};

/** GET /api/admin/candidates/:id */
exports.getOne = async (req, res) => {
  const { candidateManager } = req.app.locals.services;
  try {
    const candidate = await candidateManager.getById(req.params.id);
    if (!candidate) {
      return res
        .status(404)
        .json({ success: false, message: "Candidate not found." });
    }
    return res.json({ success: true, candidate: candidate.toJSON() });
  } catch (err) {
    return sendError(res, err, "Could not load candidate.");
  }
};

/** POST /api/admin/candidates — multipart (optional symbolImage file). */
exports.create = async (req, res) => {
  const { candidateManager } = req.app.locals.services;
  const { name, party, description, status } = req.body || {};
  try {
    const candidate = await candidateManager.create({
      name,
      party,
      description,
      status,
      symbol: resolveSymbol(req),
    });
    return res.status(201).json({
      success: true,
      message: "Candidate created.",
      candidate: candidate.toJSON(),
    });
  } catch (err) {
    return sendError(res, err, "Could not create candidate.");
  }
};

/** PUT /api/admin/candidates/:id — multipart (optional symbolImage file). */
exports.update = async (req, res) => {
  const { candidateManager } = req.app.locals.services;
  const { name, party, description, status } = req.body || {};
  try {
    const candidate = await candidateManager.update(req.params.id, {
      name,
      party,
      description,
      status,
      symbol: resolveSymbol(req), // undefined → keep the existing symbol
    });
    return res.json({
      success: true,
      message: "Candidate updated.",
      candidate: candidate.toJSON(),
    });
  } catch (err) {
    return sendError(res, err, "Could not update candidate.");
  }
};

/** DELETE /api/admin/candidates/:id */
exports.destroy = async (req, res) => {
  const { candidateManager } = req.app.locals.services;
  try {
    const removed = await candidateManager.remove(req.params.id);
    return res.json({
      success: true,
      message: `Candidate "${removed.getName()}" deleted.`,
    });
  } catch (err) {
    return sendError(res, err, "Could not delete candidate.");
  }
};

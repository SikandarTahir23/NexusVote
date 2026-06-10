exports.listCandidates = async (req, res) => {
  const { candidates } = req.app.locals.services;
  // The voter ballot only ever shows candidates an admin has left active;
  // inactive candidates remain in the DB (and in the admin panel) but are
  // invisible here.
  const list = await candidates.findAll({ activeOnly: true });
  return res.json({ success: true, candidates: list.map((c) => c.toJSON()) });
};

exports.listCandidates = async (req, res) => {
  const { candidates } = req.app.locals.services;
  const list = await candidates.findAll();
  return res.json({ success: true, candidates: list.map((c) => c.toJSON()) });
};

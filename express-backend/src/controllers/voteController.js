exports.castVote = async (req, res) => {
  const { voteManager, authService } = req.app.locals.services;
  const { cnic, candidateId } = req.body || {};
  if (!cnic || !candidateId) {
    return res.status(400).json({
      success: false,
      message: "CNIC and candidateId are required.",
    });
  }

  const verification = authService.verifyCnic(cnic);
  if (!verification.ok) {
    return res.status(400).json({ success: false, message: verification.error });
  }

  try {
    const vote = await voteManager.cast({
      voterCnic: verification.cnic,
      candidateId,
    });
    return res.json({
      success: true,
      message: "Your vote has been successfully casted.",
      receipt: vote.toJSON(),
    });
  } catch (err) {
    return res.status(409).json({ success: false, message: err.message });
  }
};

exports.checkStatus = async (req, res) => {
  const { voteManager, authService } = req.app.locals.services;
  const { cnic } = req.params;
  const verification = authService.verifyCnic(cnic);
  if (!verification.ok) {
    return res.status(400).json({ success: false, message: verification.error });
  }
  return res.json({
    success: true,
    hasVoted: await voteManager.hasVoted(verification.cnic),
  });
};

exports.castVote = async (req, res) => {
  const { voteManager, authService, backup } = req.app.locals.services;
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

    // Fire-and-forget Excel + Google Drive backup. Intentionally NOT awaited:
    // the vote is already committed to MySQL above, so a slow or failing
    // backup must never delay the voter's response or roll the vote back.
    // Any error is swallowed here and recorded in the backup status.
    backup?.run().catch((e) => console.error("[backup] run failed:", e));

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

/**
 * adminController — HTTP layer for the admin panel.
 *
 * As with the other controllers we keep these functions thin:
 *  - read input from req
 *  - delegate to a service via req.app.locals.services
 *  - shape and return the response
 *
 * The business rules (credential check, statistics math, joins) live in
 * the services. That way these handlers stay testable and the dashboard
 * page can swap to a different transport (e.g. GraphQL) without rewriting
 * any logic.
 */

/** POST /api/admin/login — verifies credentials, issues a bearer token. */
exports.login = async (req, res) => {
  const { authService, adminSessions } = req.app.locals.services;
  const { email, password } = req.body || {};
  try {
    const result = await authService.loginAdmin({ email, password });
    if (!result.ok) {
      return res.status(401).json({ success: false, message: result.error });
    }
    // The token is what authorises every subsequent admin request — the
    // requireAdmin middleware checks it on the whole /admin/* surface.
    const token = adminSessions.issue(result.profile);
    return res.json({ success: true, token, profile: result.profile });
  } catch (err) {
    console.error("[admin.login] error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Login failed. Try again." });
  }
};

/** POST /api/admin/logout — revokes the caller's session token. */
exports.logout = (req, res) => {
  const { adminSessions } = req.app.locals.services;
  adminSessions.revoke(req.adminToken);
  return res.json({ success: true, message: "Signed out." });
};

/**
 * GET /api/admin/stats — vote tallies + dashboard headline numbers.
 *
 * On top of VoteManager's per-candidate breakdown we add the counts the
 * dashboard stat cards need: total/active candidates and total voters.
 */
exports.stats = async (req, res) => {
  const { voteManager, candidates, userStore } = req.app.locals.services;
  try {
    const [stats, roster, voters] = await Promise.all([
      voteManager.getStatistics(),
      candidates.findAll(),
      userStore.all(),
    ]);
    return res.json({
      success: true,
      ...stats,
      totalCandidates: roster.length,
      activeCandidates: roster.filter((c) => c.isActive()).length,
      totalVoters: voters.length,
    });
  } catch (err) {
    console.error("[admin.stats] error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not load statistics." });
  }
};

/** GET /api/admin/voters — full voter roster with vote status (activity feed). */
exports.voters = async (req, res) => {
  const { userStore } = req.app.locals.services;
  try {
    const activity = await userStore.activity();
    return res.json({ success: true, voters: activity });
  } catch (err) {
    console.error("[admin.voters] error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Could not load voter activity." });
  }
};

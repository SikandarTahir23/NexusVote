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

/** POST /api/admin/login */
exports.login = async (req, res) => {
  const { authService } = req.app.locals.services;
  const { email, password } = req.body || {};
  try {
    const result = await authService.loginAdmin({ email, password });
    if (!result.ok) {
      return res.status(401).json({ success: false, message: result.error });
    }
    return res.json({ success: true, profile: result.profile });
  } catch (err) {
    console.error("[admin.login] error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Login failed. Try again." });
  }
};

/** GET /api/admin/stats — vote tallies + totals. */
exports.stats = async (req, res) => {
  const { voteManager } = req.app.locals.services;
  try {
    const stats = await voteManager.getStatistics();
    return res.json({ success: true, ...stats });
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

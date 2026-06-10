/**
 * requireAdmin — Express middleware that protects the admin API.
 *
 * Mounted in routes/index.js with `router.use("/admin", requireAdmin)`
 * AFTER the public /admin/login route, so everything else under /admin
 * (stats, voters, candidate CRUD, logout) demands a valid bearer token.
 *
 * On success the verified admin profile is attached as `req.admin` so
 * downstream handlers know who is acting.
 */
module.exports = function requireAdmin(req, res, next) {
  const { adminSessions } = req.app.locals.services;

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const profile = token ? adminSessions.verify(token) : null;

  if (!profile) {
    return res.status(401).json({
      success: false,
      message: "Admin session expired. Please sign in again.",
    });
  }

  req.admin = profile;
  req.adminToken = token; // logout needs the raw token to revoke it
  next();
};

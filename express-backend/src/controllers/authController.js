/**
 * Controllers are the thin HTTP layer — they parse the request, delegate
 * the work to a service (where the OOP/business logic lives), and shape
 * the response. Services are resolved from req.app.locals.services, which
 * server.js populates after the DB is initialised.
 */

exports.verifyCnic = (req, res) => {
  const { authService } = req.app.locals.services;
  const { cnic } = req.body || {};
  const result = authService.verifyCnic(cnic);
  if (!result.ok) {
    return res.status(400).json({ success: false, message: result.error });
  }
  return res.json({
    success: true,
    cnic: result.cnic,
    message: "CNIC verified. Please continue.",
  });
};

exports.saveUser = async (req, res) => {
  const { authService } = req.app.locals.services;
  // email is optional — supplied so the Excel backup has a populated Email
  // column. Absent/empty is fine; registration only needs cnic + name.
  const { cnic, name, email } = req.body || {};
  try {
    const user = await authService.registerUser({ cnic, name, email });
    return res.json({ success: true, user: user.toJSON() });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

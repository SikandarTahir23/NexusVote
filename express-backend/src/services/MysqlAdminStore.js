const AdminStore = require("./AdminStore");
const Admin = require("../models/Admin");

/**
 * MysqlAdminStore — looks admin accounts up in the `admins` table.
 *
 * The `admins` table stores `password_hash` as a plain string in this
 * prototype to keep the demo readable; a real deployment would use bcrypt
 * (see Admin.verifyPassword in models/Admin.js for the upgrade point).
 *
 * OOP concepts demonstrated:
 *  - INHERITANCE: extends AdminStore.
 *  - POLYMORPHISM: drop-in replacement for any AdminStore implementation.
 *  - ENCAPSULATION: the pool is held privately.
 */
class MysqlAdminStore extends AdminStore {
  #pool;

  constructor(pool) {
    super();
    this.#pool = pool;
  }

  async find(email) {
    const [rows] = await this.#pool.execute(
      `SELECT email, name, department, password_hash
         FROM admins WHERE email = ? LIMIT 1`,
      [String(email || "").trim().toLowerCase()]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    // Build a domain object so the rest of the app keeps working with
    // Admin instances rather than raw DB rows.
    const admin = new Admin({
      id: r.email,
      name: r.name,
      passwordHash: r.password_hash,
    });
    // Stash the cosmetic fields on the instance so the controller can
    // ship them to the UI without another round-trip.
    admin.department = r.department;
    admin.email = r.email;
    return admin;
  }

  async all() {
    const [rows] = await this.#pool.query(
      `SELECT email, name, department FROM admins ORDER BY created_at ASC`
    );
    return rows;
  }
}

module.exports = MysqlAdminStore;

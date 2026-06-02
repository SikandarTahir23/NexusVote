/**
 * check-db.js — quick connectivity probe.
 *
 * Run with `npm run db:check` from the express-backend folder. Connects
 * to MySQL using the credentials in `.env`, lists the tables and the
 * number of rows in each one. Use this when you want to confirm the
 * backend can actually reach the database without booting the full
 * server.
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });

const { initDatabase, getPool } = require("../db");

async function main() {
  console.log("[check-db] Connecting to MySQL…");
  await initDatabase();
  const pool = getPool();

  // Walk every table the app cares about and print its row count. If a
  // table is missing the IF NOT EXISTS DDL in initDatabase() should have
  // created it — so a failure here usually means a permissions issue.
  for (const table of ["voters", "candidates", "votes", "admins"]) {
    const [rows] = await pool.query(`SELECT COUNT(*) AS n FROM ${table}`);
    console.log(`[check-db]   ${table.padEnd(12)} → ${rows[0].n} rows`);
  }

  await pool.end();
  console.log("[check-db] OK — database connection is healthy.");
}

main().catch((err) => {
  console.error("[check-db] FAILED:", err.message);
  process.exit(1);
});

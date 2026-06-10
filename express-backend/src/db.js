/**
 * db.js — MySQL connection pool + lightweight startup checks.
 *
 * Why a connection pool?
 *  A pool re-uses a fixed number of physical TCP connections to MySQL
 *  instead of opening a new one for every query. For a long-running API
 *  this is faster, kinder to MySQL's `max_connections` budget, and the
 *  only sane way to talk to a database under any kind of load.
 *
 * What `initDatabase()` does:
 *  1. Reads credentials from the environment (loaded by dotenv in server.js).
 *  2. Creates a single shared pool.
 *  3. Pings MySQL so we fail at startup, not on the first user request.
 *  4. Verifies the tables this app needs (`voters`, `candidates`, `votes`,
 *     `admins`) all exist. If a table is missing it throws so you know
 *     to (re-)create it in MySQL Workbench from `schema.sql`.
 *  5. Adds a UNIQUE INDEX on `votes.voter_id` if it isn't already there.
 *     This is the database-level guard that makes duplicate voting
 *     impossible — a second INSERT for the same voter throws
 *     ER_DUP_ENTRY which the API translates into "you've already voted."
 *  6. Seeds the `candidates` table the first time it sees it empty.
 *
 * The pool returned here is the single source of truth for every store
 * and service in the app.
 */

const mysql = require("mysql2/promise");

let pool = null;

/**
 * Read DB settings from process.env and build the pool. Kept in its own
 * function so the config is easy to unit-test and easy to override.
 */
function buildPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "voting_system",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // Keeps DATETIME columns as ISO-ish strings instead of JS Date —
    // easier to ship straight back to the React UI without timezone surprises.
    dateStrings: true,
  });
}

/**
 * Confirm every table the app reads from is actually present. We don't
 * create tables here on purpose — you maintain the schema in Workbench,
 * and silently creating a misspelled table would mask real configuration
 * problems. If something is missing the error message tells you exactly
 * what to fix.
 */
async function verifyTablesExist(pool) {
  const required = ["voters", "candidates", "votes", "admins"];
  const [rows] = await pool.query(
    `SELECT TABLE_NAME AS name
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()`
  );
  const present = new Set(rows.map((r) => r.name.toLowerCase()));
  const missing = required.filter((t) => !present.has(t));
  if (missing.length > 0) {
    throw new Error(
      `Missing required table(s): ${missing.join(", ")}. ` +
        `Create them in MySQL Workbench using express-backend/schema.sql.`
    );
  }
}

/**
 * The `votes` table you created has its PRIMARY KEY on the auto-increment
 * `id` column, which means the same voter_id could be inserted twice and
 * the database wouldn't stop you. The whole duplicate-vote prevention
 * feature relies on a UNIQUE constraint on voter_id.
 *
 * This idempotent migration adds that constraint if it isn't already
 * present. Run it every startup — once it's installed the IF NOT EXISTS
 * check makes subsequent runs no-ops.
 */
async function ensureDuplicateVoteGuard(pool) {
  const [rows] = await pool.query(
    `SELECT INDEX_NAME
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'votes'
        AND COLUMN_NAME  = 'voter_id'
        AND NON_UNIQUE   = 0`
  );
  if (rows.length > 0) return; // already protected

  try {
    await pool.query(
      `ALTER TABLE votes ADD UNIQUE KEY uk_votes_voter (voter_id)`
    );
    console.log("[db] Added UNIQUE(voter_id) on votes — duplicate voting blocked.");
  } catch (err) {
    // If voter_id already has a non-unique index MySQL will complain
    // about the duplicate index name. Try dropping the redundant
    // non-unique index first, then add the unique one.
    if (err && err.code === "ER_DUP_KEYNAME") {
      await pool.query(`ALTER TABLE votes DROP INDEX voter_id`);
      await pool.query(
        `ALTER TABLE votes ADD UNIQUE KEY uk_votes_voter (voter_id)`
      );
      console.log("[db] Upgraded voter_id index to UNIQUE.");
    } else {
      throw err;
    }
  }
}

/**
 * The original `votes` table predates the vote-confirmation feature and is
 * missing the `reference_number` column the receipt/email flow needs. Same
 * idempotent-migration pattern as the guards above: check information_schema
 * and ALTER it in once. Existing rows get NULL; the stores fall back to a
 * derived reference for those legacy rows so the admin view still renders.
 */
async function ensureVoteReferenceColumn(pool) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME AS name
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'votes'
        AND COLUMN_NAME  = 'reference_number'`
  );
  if (rows.length > 0) return; // already present

  await pool.query(
    `ALTER TABLE votes ADD COLUMN reference_number VARCHAR(32) AFTER candidate_id`
  );
  console.log("[db] votes table upgraded — added reference_number.");
}

/**
 * The original `candidates` table predates the admin candidate-management
 * feature and is missing the columns it needs (description, status,
 * created_at, updated_at). Like ensureDuplicateVoteGuard above, this is
 * an idempotent startup migration: check information_schema for what's
 * missing and ALTER it in once. Existing rows pick up status='active'
 * via the column DEFAULT, so the live ballot is unaffected.
 */
async function ensureCandidateColumns(pool) {
  const [rows] = await pool.query(
    `SELECT COLUMN_NAME AS name
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'candidates'`
  );
  const present = new Set(rows.map((r) => r.name.toLowerCase()));

  const wanted = [
    ["description", "ADD COLUMN description TEXT NULL"],
    ["status", "ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active'"],
    ["created_at", "ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP"],
    ["updated_at", "ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"],
  ];
  const missing = wanted.filter(([col]) => !present.has(col));
  if (missing.length === 0) return; // already up to date

  await pool.query(
    `ALTER TABLE candidates ${missing.map(([, ddl]) => ddl).join(", ")}`
  );
  console.log(
    `[db] candidates table upgraded — added: ${missing.map(([c]) => c).join(", ")}`
  );
}

/**
 * Seed the candidate roster the first time the table is empty.
 *
 * Your `candidates` table uses an integer auto-increment id. The
 * frontend just echoes whatever id the API returns straight back when
 * casting a vote, so integer ids are fine — the React UI never has to
 * know the names "pti" / "pmln" / etc. that the old in-memory demo used.
 */
async function seedCandidatesIfEmpty(pool) {
  const [rows] = await pool.query("SELECT COUNT(*) AS n FROM candidates");
  if (rows[0].n > 0) return;

  const seed = [
    { name: "Ayesha Tariq", party: "Student Voice",       symbol: "📚" },
    { name: "Hamza Raza",   party: "Campus Reform",       symbol: "🎓" },
    { name: "Maryam Iqbal", party: "United Students",     symbol: "🤝" },
    { name: "Usman Shah",   party: "Progressive Society", symbol: "🌟" },
  ];

  for (const c of seed) {
    await pool.execute(
      `INSERT INTO candidates (candidate_name, party_name, symbol_image, total_votes)
       VALUES (?, ?, ?, 0)`,
      [c.name, c.party, c.symbol]
    );
  }
  console.log(`[db] Seeded ${seed.length} candidates.`);
}

/**
 * Public entry point — call once from server.js at startup. Returns the
 * live pool so the caller can hand it to stores and services.
 */
async function initDatabase() {
  if (pool) return pool;

  pool = buildPool();

  // Ping first — a bad password or unreachable host should crash boot,
  // not the first /api request.
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log(
      `[db] Connected to MySQL at ${process.env.DB_HOST || "localhost"}/${
        process.env.DB_NAME || "voting_system"
      }`
    );
  } finally {
    conn.release();
  }

  await verifyTablesExist(pool);
  await ensureDuplicateVoteGuard(pool);
  await ensureVoteReferenceColumn(pool);
  await ensureCandidateColumns(pool);
  await seedCandidatesIfEmpty(pool);

  return pool;
}

/**
 * Accessor for code that needs the pool after init. Most modules
 * receive it via constructor injection — this is for scripts and
 * one-off helpers (e.g. the db:check probe).
 */
function getPool() {
  if (!pool) {
    throw new Error("Database not initialised — call initDatabase() first.");
  }
  return pool;
}

module.exports = { initDatabase, getPool };

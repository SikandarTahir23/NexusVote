// dotenv loads `.env` from the backend root. Path is resolved relative to
// this file so `npm start` works no matter what directory it's launched from.
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");

const apiRoutes = require("./routes");
const { initDatabase } = require("./db");

const VoteManager = require("./services/VoteManager");
const AuthenticationService = require("./services/AuthenticationService");
const MysqlVoteStore = require("./services/MysqlVoteStore");
const MysqlVoterStore = require("./services/MysqlVoterStore");
const MysqlCandidateService = require("./services/MysqlCandidateService");
const MysqlAdminStore = require("./services/MysqlAdminStore");

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // 1. Bring up MySQL: create DB + tables + seed candidates.
  const pool = await initDatabase();

  // 2. Wire concrete MySQL stores into the OOP service layer.
  //    Polymorphism in action: VoteManager and AuthenticationService accept
  //    any subclass of VoteStore / UserStore — we hand them the MySQL ones.
  // Voter store first — the vote store depends on it to translate
  // CNIC ↔ integer voter_id when reading/writing the votes table.
  const userStore = new MysqlVoterStore(pool);
  const voteStore = new MysqlVoteStore(pool, userStore);
  const candidates = new MysqlCandidateService(pool);
  const adminStore = new MysqlAdminStore(pool);

  const voteManager = new VoteManager(voteStore, candidates);
  const authService = new AuthenticationService(userStore, adminStore);

  // 3. Build the Express app and expose services via app.locals so
  //    controllers can pull them off req.app.locals.services. We expose
  //    the stores too because the admin endpoints query them directly
  //    (statistics, voter activity) without an intermediate service.
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.locals.services = {
    voteManager,
    authService,
    candidates,
    userStore,
    voteStore,
    adminStore,
  };

  app.get("/", (_req, res) => {
    res.json({
      service: "Secure Digital Voting System API",
      status: "online",
      storage: "mysql",
      endpoints: [
        "POST /api/verify-cnic",
        "POST /api/save-user",
        "GET  /api/candidates",
        "POST /api/cast-vote",
        "GET  /api/vote-status/:cnic",
        "POST /api/admin/login",
        "GET  /api/admin/stats",
        "GET  /api/admin/voters",
      ],
    });
  });

  app.use("/api", apiRoutes);

  app.use((_req, res) => {
    res.status(404).json({ success: false, message: "Route not found." });
  });

  app.listen(PORT, () => {
    console.log(`Secure Voting API running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  // Fail loud — a half-broken server returning 500s for every request is
  // worse than a hard exit the operator can see immediately.
  console.error("[startup] Failed to initialise backend:", err);
  process.exit(1);
});

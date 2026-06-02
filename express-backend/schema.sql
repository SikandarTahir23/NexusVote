-- ─────────────────────────────────────────────────────────────────────────
-- Secure Digital Voting System — MySQL schema reference.
--
-- This mirrors the tables you already created in MySQL Workbench so the
-- Express backend can talk to them without surprises. If a fresh
-- environment is missing a table, copy the matching CREATE block here
-- into Workbench. The backend will REFUSE to start if any table below
-- is missing (so you can't silently run against a half-broken schema).
--
-- Run order: create database → use it → run each CREATE statement.
-- ─────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS voting_system
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE voting_system;

-- Voters — citizens registered to vote. Auto-increment INT primary key;
-- email and cnic are unique secondary keys so the API can look a voter
-- up by either one. `has_voted` is a cached flag the API keeps in sync
-- with the `votes` table for quick reads.
CREATE TABLE IF NOT EXISTS voters (
  id         INT          NOT NULL AUTO_INCREMENT,
  email      VARCHAR(255) DEFAULT NULL,
  cnic       VARCHAR(20)  DEFAULT NULL,
  full_name  VARCHAR(255) DEFAULT NULL,
  has_voted  TINYINT(1)   DEFAULT 0,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_voters_email (email),
  UNIQUE KEY uk_voters_cnic  (cnic)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Candidates — the ballot roster. The backend seeds four rows on first
-- boot if this table is empty.
CREATE TABLE IF NOT EXISTS candidates (
  id             INT          NOT NULL AUTO_INCREMENT,
  candidate_name VARCHAR(255) DEFAULT NULL,
  party_name     VARCHAR(255) DEFAULT NULL,
  symbol_image   VARCHAR(255) DEFAULT NULL,
  total_votes    INT          DEFAULT 0,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Votes — one row per ballot. Foreign keys point at voters.id and
-- candidates.id. The UNIQUE KEY on voter_id is what physically
-- prevents the same voter from casting twice; the backend adds it
-- automatically at startup if it isn't already present.
CREATE TABLE IF NOT EXISTS votes (
  id           INT       NOT NULL AUTO_INCREMENT,
  voter_id     INT       DEFAULT NULL,
  candidate_id INT       DEFAULT NULL,
  voted_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_votes_voter (voter_id),
  KEY candidate_id (candidate_id),
  CONSTRAINT votes_ibfk_1 FOREIGN KEY (voter_id)     REFERENCES voters     (id),
  CONSTRAINT votes_ibfk_2 FOREIGN KEY (candidate_id) REFERENCES candidates (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admins — DB-backed admin login. If you leave this empty the backend
-- falls back to ADMIN_EMAIL / ADMIN_PASSWORD environment variables.
CREATE TABLE IF NOT EXISTS admins (
  email         VARCHAR(120) NOT NULL,
  name          VARCHAR(120) NOT NULL DEFAULT 'Administrator',
  department    VARCHAR(120) NOT NULL DEFAULT 'NexusVote Operations',
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: seed a demo admin. Password is stored plain for demo only;
-- swap for a bcrypt hash + bcrypt.compare in models/Admin.js before any
-- real deployment.
-- INSERT INTO admins (email, name, department, password_hash)
--   VALUES ('admin@example.com', 'Platform Administrator',
--           'NexusVote Operations', 'admin123');

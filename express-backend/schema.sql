
-- Database schema for the voting system
-- Run this in MySQL Workbench once before starting the backend.

CREATE DATABASE IF NOT EXISTS voting_system;
USE voting_system;


-- Voters table
CREATE TABLE IF NOT EXISTS voters (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) UNIQUE,
  cnic       VARCHAR(20)  UNIQUE,
  full_name  VARCHAR(255),
  has_voted  TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP
);


-- Candidates table
-- symbol_image holds either an emoji ("📚") or an uploaded image path
-- ("/uploads/symbol-....png") served statically by the Express backend.
CREATE TABLE IF NOT EXISTS candidates (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  candidate_name VARCHAR(255),
  party_name     VARCHAR(255),
  symbol_image   VARCHAR(255),
  total_votes    INT DEFAULT 0,
  description    TEXT NULL,
  status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Migration for databases created before the candidate-management feature.
-- The backend applies this automatically on startup (see src/db.js,
-- ensureCandidateColumns) — kept here for reference / manual runs:
--
-- ALTER TABLE candidates
--   ADD COLUMN description TEXT NULL,
--   ADD COLUMN status ENUM('active','inactive') NOT NULL DEFAULT 'active',
--   ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--   ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;


-- Votes table
-- One row per ballot. UNIQUE on voter_id stops a voter from voting twice.
-- reference_number is the voter-facing receipt id (format VOTE-YYYYMMDD-XXXX)
-- emailed to the voter and shown on the success page.
CREATE TABLE IF NOT EXISTS votes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  voter_id         INT UNIQUE,
  candidate_id     INT,
  reference_number VARCHAR(32),
  voted_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (voter_id)     REFERENCES voters(id),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id)
);

-- Migration for databases created before the vote-confirmation feature.
-- The backend applies this automatically on startup (see src/db.js,
-- ensureVoteReferenceColumn) — kept here for reference / manual runs:
--
-- ALTER TABLE votes ADD COLUMN reference_number VARCHAR(32) AFTER candidate_id;


-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  email         VARCHAR(120) PRIMARY KEY,
  name          VARCHAR(120) DEFAULT 'Administrator',
  department    VARCHAR(120) DEFAULT 'NexusVote Operations',
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Optional: add a demo admin
-- INSERT INTO admins (email, password_hash)
-- VALUES ('admin@example.com', 'admin123');

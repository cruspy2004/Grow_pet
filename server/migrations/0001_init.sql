-- Grow Buddy Pro — initial schema.
-- Run: wrangler d1 execute grow-buddy --local --file=./migrations/0001_init.sql

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- One row per issued magic-link code. Consumed on verify.
CREATE TABLE IF NOT EXISTS magic_codes (
  code TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_magic_codes_email ON magic_codes(email);

-- One row per bearer token. Rotated by the client on request.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- A share created by an owner. Owners push snapshots; joiners read them.
CREATE TABLE IF NOT EXISTS shares (
  code TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  goal_label TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shares_owner ON shares(owner_user_id);

-- A user (joiner) has joined a share so it appears in their buddy list.
CREATE TABLE IF NOT EXISTS share_participants (
  share_code TEXT NOT NULL,
  user_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (share_code, user_id),
  FOREIGN KEY (share_code) REFERENCES shares(code) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_share_participants_user ON share_participants(user_id);

-- Latest snapshot per share (owner-pushed). Overwritten on each push.
CREATE TABLE IF NOT EXISTS snapshots (
  share_code TEXT PRIMARY KEY,
  reported_at INTEGER NOT NULL,
  payload TEXT NOT NULL,
  FOREIGN KEY (share_code) REFERENCES shares(code) ON DELETE CASCADE
);

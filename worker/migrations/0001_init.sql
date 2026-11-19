-- Chovatelé: public backyard register. Times are epoch milliseconds.

CREATE TABLE users (
  discord_id    TEXT PRIMARY KEY,           -- Discord snowflake, always a string
  avatar        TEXT,                       -- Discord avatar hash (null = default avatar)
  banned        INTEGER NOT NULL DEFAULT 0,
  last_write_at INTEGER NOT NULL DEFAULT 0, -- rate limit for PUT /me
  created_at    INTEGER NOT NULL
);

-- one entry per user; `no` is the public entry number ("č. 001") and is never reused
CREATE TABLE breeders (
  no         INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_id TEXT NOT NULL UNIQUE REFERENCES users (discord_id),
  nick       TEXT NOT NULL,                 -- FishAO nickname as typed
  nick_key   TEXT NOT NULL UNIQUE,          -- lower case: nicknames are unique ignoring case
  fish       TEXT NOT NULL DEFAULT '[]',    -- JSON array of backyard fish ids, sorted
  hidden     INTEGER NOT NULL DEFAULT 0,    -- 1 = hidden by an admin
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 3 reports from different users hide an entry until an admin restores it (which clears them)
CREATE TABLE reports (
  target_id   TEXT NOT NULL,                -- discord_id of the reported entry
  reporter_id TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (target_id, reporter_id)
);
CREATE INDEX reports_by_reporter ON reports (reporter_id, created_at);

-- bearer tokens are stored hashed (SHA-256), the token itself only lives in the browser
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_by_user ON sessions (discord_id);

-- OAuth `state` (CSRF) and where to send the user back to, valid for 10 minutes
CREATE TABLE oauth_states (
  state      TEXT PRIMARY KEY,
  return_url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

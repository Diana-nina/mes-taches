const db = require('./db');

// Crée le schéma s'il n'existe pas. Idempotent — appelé à chaque démarrage.
function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      emoji      TEXT NOT NULL DEFAULT '🙂',
      color      TEXT NOT NULL DEFAULT '#ff8fab',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      freq       TEXT NOT NULL DEFAULT 'daily',         -- 'daily' | 'monthly'
      day_idx    INTEGER,                                -- 0..6 (Lundi=0) pour daily, NULL pour monthly
      emoji      TEXT NOT NULL DEFAULT '✨',
      name       TEXT NOT NULL,
      detail     TEXT,
      cat        TEXT NOT NULL DEFAULT 'cat-maison',
      assignee   TEXT NOT NULL DEFAULT 'tous',           -- '<member_id>' | 'tous' | 'rotation'
      points     INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active     INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS completions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
      period_key TEXT NOT NULL,
      points     INTEGER NOT NULL DEFAULT 1,
      done_at    TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, period_key)
    );

    CREATE TABLE IF NOT EXISTS shopping_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      label      TEXT NOT NULL,
      emoji      TEXT NOT NULL DEFAULT '🛒',
      price      REAL,
      checked    INTEGER NOT NULL DEFAULT 0,
      added_by   INTEGER REFERENCES members(id) ON DELETE SET NULL,
      checked_by INTEGER REFERENCES members(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      checked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      label       TEXT NOT NULL,
      emoji       TEXT NOT NULL DEFAULT '🎁',
      cost_points INTEGER NOT NULL DEFAULT 10,
      active      INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      reward_id   INTEGER REFERENCES rewards(id) ON DELETE SET NULL,
      member_id   INTEGER REFERENCES members(id) ON DELETE SET NULL,
      cost_points INTEGER NOT NULL,
      redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- Streaks Deen, un blob JSON par profil (younes / shrouk / …).
    CREATE TABLE IF NOT EXISTS deen_state (
      profile    TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_completions_period ON completions(period_key);
    CREATE INDEX IF NOT EXISTS idx_completions_member ON completions(member_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(freq, day_idx, active);
  `);
}

module.exports = migrate;

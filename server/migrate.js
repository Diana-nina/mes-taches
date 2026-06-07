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
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS completions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
      period_key TEXT NOT NULL,
      points     INTEGER NOT NULL DEFAULT 1,
      done_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
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
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
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
      redeemed_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- Streaks Deen, un blob JSON par profil (younes / shrouk / …).
    CREATE TABLE IF NOT EXISTS deen_state (
      profile    TEXT PRIMARY KEY,
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- Journal append-only daté : 1 ligne par action (pour l'historique / calendrier).
    CREATE TABLE IF NOT EXISTS activity (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      kind      TEXT NOT NULL,              -- 'task' | 'entretien' | 'inventory' | 'deen'
      ref       TEXT NOT NULL,              -- task_id | id périodique | id streak
      label     TEXT NOT NULL,              -- dénormalisé (survit aux renommages/suppressions)
      emoji     TEXT,
      member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
      date      TEXT NOT NULL,              -- 'YYYY-MM-DD' local (pivot calendrier)
      points    INTEGER NOT NULL DEFAULT 0,
      done_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    -- État des tâches d'entretien / périodiques (remplace mt_per + mt_chk).
    CREATE TABLE IF NOT EXISTS periodic_state (
      ref        TEXT NOT NULL,
      period_key TEXT NOT NULL,
      member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,
      checks     TEXT,                       -- JSON des sous-cases d'inventaire {"0":1,...}
      done_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      PRIMARY KEY (ref, period_key)
    );

    -- Blobs JSON partagés (notes, profils). Pattern identique à deen_state.
    CREATE TABLE IF NOT EXISTS notes_state (
      scope      TEXT PRIMARY KEY DEFAULT 'shared',
      data       TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_completions_period ON completions(period_key);
    CREATE INDEX IF NOT EXISTS idx_completions_member ON completions(member_id);
    CREATE INDEX IF NOT EXISTS idx_completions_done_at ON completions(done_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_day ON tasks(freq, day_idx, active);
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity(date);
    CREATE INDEX IF NOT EXISTS idx_activity_kind_ref_date ON activity(kind, ref, date);
  `);

  // Colonne `date` sur tasks pour les tâches ponctuelles (freq='once'). ALTER idempotent.
  const cols = db.prepare(`PRAGMA table_info(tasks)`).all().map(c => c.name);
  if (!cols.includes('date')) db.exec(`ALTER TABLE tasks ADD COLUMN date TEXT`);
}

module.exports = migrate;

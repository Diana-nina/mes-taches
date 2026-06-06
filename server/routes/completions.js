const express = require('express');
const db = require('../db');
const { periodKeyForTask } = require('../helpers');
const { getState, setState, getWeekKey } = require('../rollover');
const router = express.Router();

const MASCOTS_COUNT = 7; // doit correspondre à MASCOTS.length côté front

// POST /api/completions {task_id, member_id} — coche (idempotent).
router.post('/', (req, res) => {
  const { task_id, member_id } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(task_id);
  if (!task) return res.status(404).json({ error: 'tâche introuvable' });

  const periodKey = periodKeyForTask(task);
  db.prepare(`INSERT INTO completions(task_id, member_id, period_key, points)
              VALUES(?,?,?,?)
              ON CONFLICT(task_id, period_key)
              DO UPDATE SET member_id=excluded.member_id, done_at=datetime('now')`)
    .run(task_id, member_id ?? null, periodKey, task.points);

  // Jour complet ? (uniquement pour les tâches quotidiennes)
  let dayComplete = false;
  if (task.freq === 'daily') {
    const wk = getWeekKey();
    const tasks = db.prepare(`SELECT id FROM tasks WHERE active=1 AND freq='daily' AND day_idx=?`).all(task.day_idx);
    dayComplete = tasks.length > 0 && tasks.every(t =>
      db.prepare('SELECT 1 FROM completions WHERE task_id=? AND period_key=?').get(t.id, wk));
    if (dayComplete) {
      const next = (Number(getState('mascot_idx') || 0) + 1) % MASCOTS_COUNT;
      setState('mascot_idx', next);
    }
  }

  res.json({ ok: true, done: true, dayComplete, mascotIdx: Number(getState('mascot_idx') || 0) });
});

// DELETE /api/completions {task_id} — décoche.
router.delete('/', (req, res) => {
  const { task_id } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(task_id);
  if (!task) return res.status(404).json({ error: 'tâche introuvable' });
  const periodKey = periodKeyForTask(task);
  db.prepare('DELETE FROM completions WHERE task_id=? AND period_key=?').run(task_id, periodKey);
  res.json({ ok: true, done: false });
});

module.exports = router;

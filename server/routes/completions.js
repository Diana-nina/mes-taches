const express = require('express');
const db = require('../db');
const { periodKeyForTask } = require('../helpers');
const { getState, setState, getWeekKey, getMonday } = require('../rollover');
const router = express.Router();

const MASCOTS_COUNT = 7; // doit correspondre à MASCOTS.length côté front

const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Bornes (dates locales YYYY-MM-DD) de la période d'une tâche, pour retirer la bonne
// ligne d'historique au décochage.
function periodDateRange(task) {
  const now = new Date();
  if (task.freq === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: fmtDate(start), end: fmtDate(end) };
  }
  const monday = getMonday(now);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  return { start: fmtDate(monday), end: fmtDate(sunday) };
}

// POST /api/completions {task_id, member_id} — coche (idempotent).
router.post('/', (req, res) => {
  const { task_id, member_id } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(task_id);
  if (!task) return res.status(404).json({ error: 'tâche introuvable' });

  const periodKey = periodKeyForTask(task);
  const existed = db.prepare('SELECT 1 FROM completions WHERE task_id=? AND period_key=?').get(task_id, periodKey);

  db.prepare(`INSERT INTO completions(task_id, member_id, period_key, points, done_at)
              VALUES(?,?,?,?,datetime('now','localtime'))
              ON CONFLICT(task_id, period_key)
              DO UPDATE SET member_id=excluded.member_id, done_at=datetime('now','localtime')`)
    .run(task_id, member_id ?? null, periodKey, task.points);

  // Journal daté : une ligne par coche réelle (pas sur re-coche idempotente).
  if (!existed) {
    db.prepare(`INSERT INTO activity(kind, ref, label, emoji, member_id, date, points, done_at)
                VALUES('task', ?, ?, ?, ?, date('now','localtime'), ?, datetime('now','localtime'))`)
      .run(String(task_id), task.name, task.emoji, member_id ?? null, task.points);
  }

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

// DELETE /api/completions {task_id} — décoche (+ retire l'historique de la période).
router.delete('/', (req, res) => {
  const { task_id } = req.body || {};
  const task = db.prepare('SELECT * FROM tasks WHERE id=?').get(task_id);
  if (!task) return res.status(404).json({ error: 'tâche introuvable' });
  const periodKey = periodKeyForTask(task);
  db.prepare('DELETE FROM completions WHERE task_id=? AND period_key=?').run(task_id, periodKey);

  const { start, end } = periodDateRange(task);
  db.prepare(`DELETE FROM activity WHERE kind='task' AND ref=? AND date BETWEEN ? AND ?`)
    .run(String(task_id), start, end);

  res.json({ ok: true, done: false });
});

module.exports = router;

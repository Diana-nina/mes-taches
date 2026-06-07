const express = require('express');
const db = require('../db');
const { listMembers, enrichTask } = require('../helpers');
const { getWeekKey, getMonthKey, getWeekIndex, getTodayCol, getState } = require('../rollover');
const router = express.Router();

// GET /api/board?date=YYYY-MM-DD (ou ?day=2) — tout l'écran pour le jour demandé.
router.get('/', (req, res) => {
  const dateStr = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : null;
  const ref = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const day = dateStr ? ((ref.getDay() + 6) % 7) : (req.query.day != null ? Number(req.query.day) : getTodayCol());
  const members = listMembers();
  const weekIndex = getWeekIndex(ref);
  const wk = getWeekKey(ref);

  const dailyRows = db.prepare(
    `SELECT * FROM tasks WHERE active=1 AND freq='daily' AND day_idx=? ORDER BY sort_order, id`
  ).all(day);
  const monthlyRows = db.prepare(
    `SELECT * FROM tasks WHERE active=1 AND freq='monthly' ORDER BY sort_order, id`
  ).all();
  // Tâches ponctuelles (one-time) datées du jour demandé.
  const onceRows = dateStr ? db.prepare(
    `SELECT * FROM tasks WHERE active=1 AND freq='once' AND date=? ORDER BY sort_order, id`
  ).all(dateStr) : [];

  const daily = dailyRows.concat(onceRows).map(t => enrichTask(t, members, weekIndex, ref));
  const monthly = monthlyRows.map(t => enrichTask(t, members, weekIndex, ref));

  // Progression par jour (onglets) pour la semaine de `ref`.
  const perDay = [];
  for (let d = 0; d < 7; d++) {
    const tasks = db.prepare(
      `SELECT id FROM tasks WHERE active=1 AND freq='daily' AND day_idx=?`
    ).all(d);
    let done = 0;
    for (const t of tasks) {
      const c = db.prepare('SELECT 1 FROM completions WHERE task_id=? AND period_key=?').get(t.id, wk);
      if (c) done++;
    }
    perDay.push({ day: d, done, total: tasks.length });
  }

  res.json({
    members,
    weekKey: wk,
    monthKey: getMonthKey(ref),
    weekIndex,
    today: getTodayCol(),
    date: dateStr,
    mascotIdx: Number(getState('mascot_idx') || 0),
    day,
    daily,
    monthly,
    perDay,
  });
});

module.exports = router;

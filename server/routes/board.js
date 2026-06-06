const express = require('express');
const db = require('../db');
const { listMembers, enrichTask } = require('../helpers');
const { getWeekKey, getMonthKey, getWeekIndex, getTodayCol, getState } = require('../rollover');
const router = express.Router();

// GET /api/board?day=2 — tout l'écran en un appel (remplace load() du front original).
router.get('/', (req, res) => {
  const day = req.query.day != null ? Number(req.query.day) : getTodayCol();
  const members = listMembers();
  const weekIndex = getWeekIndex();

  const dailyRows = db.prepare(
    `SELECT * FROM tasks WHERE active=1 AND freq='daily' AND day_idx=? ORDER BY sort_order, id`
  ).all(day);
  const monthlyRows = db.prepare(
    `SELECT * FROM tasks WHERE active=1 AND freq='monthly' ORDER BY sort_order, id`
  ).all();

  const daily = dailyRows.map(t => enrichTask(t, members, weekIndex));
  const monthly = monthlyRows.map(t => enrichTask(t, members, weekIndex));

  // Progression par jour (pour les onglets) : done/total pour chaque jour de la semaine.
  const perDay = [];
  for (let d = 0; d < 7; d++) {
    const tasks = db.prepare(
      `SELECT id FROM tasks WHERE active=1 AND freq='daily' AND day_idx=?`
    ).all(d);
    const wk = getWeekKey();
    let done = 0;
    for (const t of tasks) {
      const c = db.prepare('SELECT 1 FROM completions WHERE task_id=? AND period_key=?').get(t.id, wk);
      if (c) done++;
    }
    perDay.push({ day: d, done, total: tasks.length });
  }

  res.json({
    members,
    weekKey: getWeekKey(),
    monthKey: getMonthKey(),
    weekIndex,
    today: getTodayCol(),
    mascotIdx: Number(getState('mascot_idx') || 0),
    day,
    daily,
    monthly,
    perDay,
  });
});

module.exports = router;

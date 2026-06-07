const express = require('express');
const db = require('../db');
const { getMonday } = require('../rollover');
const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const SELECT = `
  SELECT a.id, a.kind, a.ref, a.label, a.emoji, a.date, a.points, a.done_at,
         m.name AS member_name, m.emoji AS member_emoji, m.color AS member_color
  FROM activity a
  LEFT JOIN members m ON m.id = a.member_id
`;

// GET /api/activity?start=YYYY-MM-DD&end=YYYY-MM-DD  ou  ?week=YYYY-MM-DD (un lundi)
router.get('/', (req, res) => {
  let { start, end, week } = req.query;
  if (week) {
    if (!DATE_RE.test(week)) return res.status(400).json({ error: 'week_invalide' });
    const [y, m, d] = week.split('-').map(Number);
    const monday = getMonday(new Date(y, m - 1, d));
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    start = fmtDate(monday); end = fmtDate(sunday);
  }
  if (!start || !end || !DATE_RE.test(start) || !DATE_RE.test(end)) {
    return res.status(400).json({ error: 'plage_invalide', message: 'start & end (YYYY-MM-DD) ou week requis' });
  }
  const rows = db.prepare(`${SELECT} WHERE a.date BETWEEN ? AND ? ORDER BY a.done_at`).all(start, end);
  res.json(rows);
});

module.exports = router;

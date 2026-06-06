const express = require('express');
const db = require('../db');
const { listMembers } = require('../helpers');
const { getMonday } = require('../rollover');
const router = express.Router();

// Borne basse (instant UTC, format SQLite) pour la fenêtre demandée.
function windowStart(range) {
  const now = new Date();
  let d;
  if (range === 'month') {
    d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else { // week
    d = getMonday(now);
  }
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function tallyByMember(range) {
  const start = windowStart(range);
  const members = listMembers();
  const rows = db.prepare(
    `SELECT member_id, COUNT(*) AS tasks, COALESCE(SUM(points),0) AS points
     FROM completions WHERE done_at >= ? GROUP BY member_id`
  ).all(start);
  const map = {};
  for (const r of rows) map[r.member_id] = r;
  return members.map(m => ({
    id: m.id, name: m.name, emoji: m.emoji, color: m.color,
    tasks: map[m.id]?.tasks || 0,
    points: map[m.id]?.points || 0,
  }));
}

// GET /api/stats?range=week|month — équité (tâches + points par membre).
router.get('/stats', (req, res) => {
  const range = req.query.range === 'month' ? 'month' : 'week';
  const members = tallyByMember(range);
  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalTasks = members.reduce((s, m) => s + m.tasks, 0);
  res.json({ range, members, totalPoints, totalTasks });
});

// GET /api/leaderboard?range=week|month — classement + gagnant.
router.get('/leaderboard', (req, res) => {
  const range = req.query.range === 'month' ? 'month' : 'week';
  const members = tallyByMember(range).sort((a, b) => b.points - a.points || b.tasks - a.tasks);
  const winner = members.length && members[0].points > 0 &&
    (members.length === 1 || members[0].points > members[1].points) ? members[0] : null;
  res.json({ range, members, winner });
});

// GET /api/history?limit=50 — dernières actions (timeline).
router.get('/history', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const rows = db.prepare(
    `SELECT c.done_at, c.points, t.emoji AS task_emoji, t.name AS task_name,
            m.name AS member_name, m.emoji AS member_emoji, m.color AS member_color
     FROM completions c
     JOIN tasks t ON t.id = c.task_id
     LEFT JOIN members m ON m.id = c.member_id
     ORDER BY c.done_at DESC LIMIT ?`
  ).all(limit);
  res.json(rows);
});

module.exports = router;

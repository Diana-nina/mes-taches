const express = require('express');
const db = require('../db');
const { getMonday } = require('../rollover');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM rewards WHERE active=1 ORDER BY cost_points').all());
});

router.post('/', (req, res) => {
  const { label, emoji, cost_points } = req.body || {};
  if (!label) return res.status(400).json({ error: 'label requis' });
  const info = db.prepare('INSERT INTO rewards(label, emoji, cost_points) VALUES(?,?,?)')
    .run(label, emoji || '🎁', cost_points ?? 10);
  res.json(db.prepare('SELECT * FROM rewards WHERE id=?').get(info.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('UPDATE rewards SET active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/rewards/:id/redeem {member_id} — échange une récompense contre des points de la semaine.
router.post('/:id/redeem', (req, res) => {
  const reward = db.prepare('SELECT * FROM rewards WHERE id=?').get(req.params.id);
  if (!reward) return res.status(404).json({ error: 'introuvable' });
  const { member_id } = req.body || {};

  const start = getMonday().toISOString().replace('T', ' ').slice(0, 19);
  const earned = db.prepare(
    'SELECT COALESCE(SUM(points),0) AS p FROM completions WHERE member_id=? AND done_at>=?'
  ).get(member_id, start).p;
  const spent = db.prepare(
    'SELECT COALESCE(SUM(cost_points),0) AS p FROM reward_redemptions WHERE member_id=? AND redeemed_at>=?'
  ).get(member_id, start).p;

  if (earned - spent < reward.cost_points) {
    return res.status(400).json({ error: 'Pas assez de points cette semaine', available: earned - spent });
  }
  db.prepare('INSERT INTO reward_redemptions(reward_id, member_id, cost_points) VALUES(?,?,?)')
    .run(reward.id, member_id ?? null, reward.cost_points);
  res.json({ ok: true, remaining: earned - spent - reward.cost_points });
});

module.exports = router;

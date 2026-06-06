const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM members ORDER BY sort_order, id').all());
});

router.post('/', (req, res) => {
  const { name, emoji, color } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name requis' });
  const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM members').get().m;
  const info = db.prepare('INSERT INTO members(name, emoji, color, sort_order) VALUES(?,?,?,?)')
    .run(name, emoji || '🙂', color || '#ff8fab', maxOrder + 1);
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const id = req.params.id;
  const cur = db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  if (!cur) return res.status(404).json({ error: 'introuvable' });
  const { name, emoji, color, sort_order } = req.body || {};
  db.prepare('UPDATE members SET name=?, emoji=?, color=?, sort_order=? WHERE id=?')
    .run(name ?? cur.name, emoji ?? cur.emoji, color ?? cur.color, sort_order ?? cur.sort_order, id);
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

const express = require('express');
const db = require('../db');
const router = express.Router();

const withMembers = `
  SELECT s.*,
         ma.name AS added_name, ma.emoji AS added_emoji, ma.color AS added_color,
         mc.name AS checked_name, mc.emoji AS checked_emoji, mc.color AS checked_color
  FROM shopping_items s
  LEFT JOIN members ma ON ma.id = s.added_by
  LEFT JOIN members mc ON mc.id = s.checked_by
`;

router.get('/', (req, res) => {
  res.json(db.prepare(`${withMembers} ORDER BY s.checked, s.created_at`).all());
});

router.post('/', (req, res) => {
  const { label, emoji, price, added_by } = req.body || {};
  if (!label) return res.status(400).json({ error: 'label requis' });
  const info = db.prepare('INSERT INTO shopping_items(label, emoji, price, added_by) VALUES(?,?,?,?)')
    .run(label, emoji || '🛒', price ?? null, added_by ?? null);
  res.json(db.prepare(`${withMembers} WHERE s.id = ?`).get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const id = req.params.id;
  const cur = db.prepare('SELECT * FROM shopping_items WHERE id=?').get(id);
  if (!cur) return res.status(404).json({ error: 'introuvable' });
  const b = req.body || {};
  const checked = b.checked != null ? (b.checked ? 1 : 0) : cur.checked;
  db.prepare(`UPDATE shopping_items
              SET label=?, emoji=?, price=?, checked=?, checked_by=?, checked_at=?
              WHERE id=?`).run(
    b.label ?? cur.label,
    b.emoji ?? cur.emoji,
    b.price !== undefined ? b.price : cur.price,
    checked,
    checked ? (b.checked_by ?? cur.checked_by) : null,
    checked ? (cur.checked_at || new Date().toISOString().replace('T', ' ').slice(0, 19)) : null,
    id
  );
  res.json(db.prepare(`${withMembers} WHERE s.id = ?`).get(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM shopping_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// DELETE /api/shopping?checked=1 — vide les articles achetés.
router.delete('/', (req, res) => {
  if (req.query.checked === '1') db.prepare('DELETE FROM shopping_items WHERE checked=1').run();
  res.json({ ok: true });
});

module.exports = router;

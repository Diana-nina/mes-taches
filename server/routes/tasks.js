const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /api/tasks?freq=daily&day=2  ou  ?freq=monthly
router.get('/', (req, res) => {
  const { freq, day } = req.query;
  let rows;
  if (freq === 'monthly') {
    rows = db.prepare(`SELECT * FROM tasks WHERE active=1 AND freq='monthly' ORDER BY sort_order, id`).all();
  } else if (freq === 'daily' && day != null) {
    rows = db.prepare(`SELECT * FROM tasks WHERE active=1 AND freq='daily' AND day_idx=? ORDER BY sort_order, id`).all(day);
  } else {
    rows = db.prepare(`SELECT * FROM tasks WHERE active=1 ORDER BY freq, day_idx, sort_order, id`).all();
  }
  res.json(rows);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'name requis' });
  const maxOrder = db.prepare(
    `SELECT COALESCE(MAX(sort_order), -1) AS m FROM tasks WHERE freq=? AND IFNULL(day_idx,-1)=IFNULL(?,-1)`
  ).get(b.freq || 'daily', b.day_idx ?? null).m;
  const info = db.prepare(`INSERT INTO tasks(freq, day_idx, emoji, name, detail, cat, assignee, points, sort_order, date)
                           VALUES(@freq,@day_idx,@emoji,@name,@detail,@cat,@assignee,@points,@sort_order,@date)`).run({
    freq: b.freq || 'daily',
    day_idx: b.day_idx ?? null,
    emoji: b.emoji || '✨',
    name: b.name,
    detail: b.detail ?? null,
    cat: b.cat || 'cat-maison',
    assignee: b.assignee || 'tous',
    points: b.points ?? 1,
    sort_order: maxOrder + 1,
    date: (b.freq === 'once' && /^\d{4}-\d{2}-\d{2}$/.test(b.date || '')) ? b.date : null,
  });
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const id = req.params.id;
  const cur = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!cur) return res.status(404).json({ error: 'introuvable' });
  const b = req.body || {};
  db.prepare(`UPDATE tasks SET emoji=?, name=?, detail=?, cat=?, assignee=?, points=?, sort_order=? WHERE id=?`).run(
    b.emoji ?? cur.emoji,
    b.name ?? cur.name,
    b.detail ?? cur.detail,
    b.cat ?? cur.cat,
    b.assignee ?? cur.assignee,
    b.points ?? cur.points,
    b.sort_order ?? cur.sort_order,
    id
  );
  res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id));
});

// Soft-delete (active=0) pour conserver l'historique des complétions.
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE tasks SET active=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

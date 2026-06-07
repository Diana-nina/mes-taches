const express = require('express');
const db = require('../db');
const router = express.Router();

// Notes partagées : un seul blob JSON (scope='shared'). Pattern identique à deen_state.

// GET /api/notes → tableau de notes (ou []).
router.get('/', (req, res) => {
  const row = db.prepare("SELECT data FROM notes_state WHERE scope='shared'").get();
  if (!row) return res.json([]);
  try { res.json(JSON.parse(row.data)); } catch (e) { res.json([]); }
});

// PUT /api/notes (body = tableau) → upsert du blob.
router.put('/', (req, res) => {
  const data = req.body;
  if (!Array.isArray(data)) return res.status(400).json({ error: 'tableau attendu' });
  db.prepare(`INSERT INTO notes_state(scope, data, updated_at)
              VALUES('shared', ?, datetime('now','localtime'))
              ON CONFLICT(scope) DO UPDATE SET data=excluded.data, updated_at=datetime('now','localtime')`)
    .run(JSON.stringify(data));
  res.json({ ok: true });
});

module.exports = router;

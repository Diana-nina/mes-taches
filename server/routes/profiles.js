const express = require('express');
const db = require('../db');
const router = express.Router();

// Profils partagés (noms/emojis) — blob JSON dans app_state (clé 'profiles').

router.get('/', (req, res) => {
  const row = db.prepare("SELECT value FROM app_state WHERE key='profiles'").get();
  if (!row) return res.json(null);
  try { res.json(JSON.parse(row.value)); } catch (e) { res.json(null); }
});

router.put('/', (req, res) => {
  const data = req.body;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'objet attendu' });
  db.prepare(`INSERT INTO app_state(key, value) VALUES('profiles', ?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value`)
    .run(JSON.stringify(data));
  res.json({ ok: true });
});

module.exports = router;

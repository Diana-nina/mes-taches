const express = require('express');
const db = require('../db');
const router = express.Router();

const PROFILE_RE = /^[a-z0-9_]{2,20}$/;

// GET /api/deen → { "<profile>": <data|null>, ... } pour tous les profils en un appel.
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT profile, data FROM deen_state').all();
  const out = {};
  for (const r of rows) {
    try { out[r.profile] = JSON.parse(r.data); } catch (e) { out[r.profile] = null; }
  }
  res.json(out);
});

// GET /api/deen/:profile → data (objet) ou null.
router.get('/:profile', (req, res) => {
  const profile = String(req.params.profile).toLowerCase();
  if (!PROFILE_RE.test(profile)) return res.status(400).json({ error: 'profile_invalide' });
  const row = db.prepare('SELECT data FROM deen_state WHERE profile = ?').get(profile);
  if (!row) return res.json(null);
  try { res.json(JSON.parse(row.data)); } catch (e) { res.json(null); }
});

// PUT /api/deen/:profile (body = objet JSON) → upsert.
router.put('/:profile', (req, res) => {
  const profile = String(req.params.profile).toLowerCase();
  if (!PROFILE_RE.test(profile)) return res.status(400).json({ error: 'profile_invalide' });
  const data = req.body;
  if (data === undefined || data === null || typeof data !== 'object') {
    return res.status(400).json({ error: 'body_invalide', message: 'objet JSON attendu' });
  }
  const json = JSON.stringify(data);
  db.prepare(`INSERT INTO deen_state(profile, data, updated_at)
              VALUES(?, ?, datetime('now'))
              ON CONFLICT(profile) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`)
    .run(profile, json);
  const row = db.prepare('SELECT updated_at FROM deen_state WHERE profile = ?').get(profile);
  res.json({ ok: true, updated_at: row.updated_at });
});

module.exports = router;

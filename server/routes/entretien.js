const express = require('express');
const db = require('../db');
const router = express.Router();

const REF_RE = /^[a-z0-9_-]{2,40}$/i;

// GET /api/entretien/state → toutes les lignes d'état périodique (le front filtre par period_key).
router.get('/state', (req, res) => {
  const rows = db.prepare('SELECT ref, period_key, member_id, checks FROM periodic_state').all();
  res.json(rows.map(r => ({ ...r, checks: r.checks ? JSON.parse(r.checks) : {} })));
});

// PUT /api/entretien/:ref {period_key, done, member_id, label, emoji} — coche/décoche une tâche périodique.
router.put('/:ref', (req, res) => {
  const ref = String(req.params.ref);
  if (!REF_RE.test(ref)) return res.status(400).json({ error: 'ref_invalide' });
  const { period_key, done, member_id, label, emoji } = req.body || {};
  if (!period_key) return res.status(400).json({ error: 'period_key requis' });

  if (done) {
    db.prepare(`INSERT INTO periodic_state(ref, period_key, member_id, done_at)
                VALUES(?,?,?,datetime('now','localtime'))
                ON CONFLICT(ref, period_key) DO UPDATE SET member_id=excluded.member_id, done_at=datetime('now','localtime')`)
      .run(ref, period_key, member_id ?? null);
    db.prepare(`INSERT INTO activity(kind, ref, label, emoji, member_id, date, points, done_at)
                VALUES('entretien', ?, ?, ?, ?, date('now','localtime'), 0, datetime('now','localtime'))`)
      .run(ref, label || ref, emoji || '🧽', member_id ?? null);
  } else {
    db.prepare('DELETE FROM periodic_state WHERE ref=? AND period_key=?').run(ref, period_key);
    // retire l'historique du jour pour cette tâche (correction d'une coche)
    db.prepare(`DELETE FROM activity WHERE kind='entretien' AND ref=? AND date=date('now','localtime')`).run(ref);
  }
  res.json({ ok: true });
});

// PUT /api/entretien/:ref/checks {period_key, idx, on, label, emoji, total} — sous-cases d'inventaire.
router.put('/:ref/checks', (req, res) => {
  const ref = String(req.params.ref);
  if (!REF_RE.test(ref)) return res.status(400).json({ error: 'ref_invalide' });
  const { period_key, idx, on, label, emoji, total } = req.body || {};
  if (!period_key || idx == null) return res.status(400).json({ error: 'period_key & idx requis' });

  const row = db.prepare('SELECT checks FROM periodic_state WHERE ref=? AND period_key=?').get(ref, period_key);
  const checks = row && row.checks ? JSON.parse(row.checks) : {};
  if (on) checks[idx] = 1; else delete checks[idx];

  db.prepare(`INSERT INTO periodic_state(ref, period_key, checks, done_at)
              VALUES(?,?,?,datetime('now','localtime'))
              ON CONFLICT(ref, period_key) DO UPDATE SET checks=excluded.checks`)
    .run(ref, period_key, JSON.stringify(checks));

  // Inventaire complet → ligne d'historique (une seule par jour).
  if (total && Object.keys(checks).length >= total) {
    const already = db.prepare(`SELECT 1 FROM activity WHERE kind='inventory' AND ref=? AND date=date('now','localtime')`).get(ref);
    if (!already) {
      db.prepare(`INSERT INTO activity(kind, ref, label, emoji, date, points, done_at)
                  VALUES('inventory', ?, ?, ?, date('now','localtime'), 0, datetime('now','localtime'))`)
        .run(ref, label || ref, emoji || '📦');
    }
  }
  res.json({ ok: true, checks });
});

module.exports = router;

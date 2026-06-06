const db = require('./db');

// Clés de période — reprises de l'index.html original (semaine lundi-based, mois calendaire).
function getMonday(d = new Date()) {
  const m = new Date(d);
  const dy = m.getDay();
  const diff = m.getDate() - dy + (dy === 0 ? -6 : 1); // lundi
  m.setHours(0, 0, 0, 0);
  m.setDate(diff);
  return m;
}

function getWeekKey(d = new Date()) {
  const m = getMonday(d);
  return `${m.getFullYear()}-${m.getMonth()}-${m.getDate()}`;
}

function getMonthKey(d = new Date()) {
  const n = new Date(d);
  return `${n.getFullYear()}-${n.getMonth()}`;
}

// Index de semaine entier (nb de semaines depuis l'epoch) — pour la rotation déterministe.
function getWeekIndex(d = new Date()) {
  const m = getMonday(d);
  return Math.floor(m.getTime() / (7 * 24 * 60 * 60 * 1000));
}

// Colonne du jour : Lundi=0 ... Dimanche=6
function getTodayCol(d = new Date()) {
  const day = d.getDay();
  return day === 0 ? 6 : day - 1;
}

function getState(key) {
  const row = db.prepare('SELECT value FROM app_state WHERE key = ?').get(key);
  return row ? row.value : null;
}
function setState(key, value) {
  db.prepare(`INSERT INTO app_state(key, value) VALUES(?, ?)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, String(value));
}

// Purge les complétions périmées quand on change de semaine / mois.
// Les complétions sont déjà clés par period_key, mais on nettoie pour garder la base légère
// tout en conservant l'historique du mois courant. On garde tout l'historique en réalité
// (utile pour stats) — ici on ne supprime rien, on met juste à jour les clés courantes.
function rollover() {
  const wk = getWeekKey();
  const mk = getMonthKey();
  let changed = false;

  if (getState('week_key') !== wk) {
    setState('week_key', wk);
    changed = true;
  }
  if (getState('month_key') !== mk) {
    setState('month_key', mk);
    changed = true;
  }
  if (getState('mascot_idx') === null) setState('mascot_idx', 0);

  return { weekKey: wk, monthKey: mk, changed };
}

// Membre responsable d'une tâche 'rotation' pour une semaine donnée (déterministe,
// alterne chaque semaine et diffère selon la tâche → charge répartie).
function rotationMemberId(taskId, members, weekIndex = getWeekIndex()) {
  if (!members.length) return null;
  const idx = ((weekIndex + taskId) % members.length + members.length) % members.length;
  return members[idx].id;
}

module.exports = {
  getMonday, getWeekKey, getMonthKey, getWeekIndex, getTodayCol,
  getState, setState, rollover, rotationMemberId,
};

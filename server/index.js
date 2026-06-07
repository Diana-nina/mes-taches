const path = require('path');
const express = require('express');

const migrate = require('./migrate');
const seed = require('./seed');
const { rollover } = require('./rollover');

// Init base : schéma + données par défaut + bascule semaine/mois.
migrate();
seed();
rollover();
// Vérifie le rollover chaque minute (changement de semaine/mois côté serveur).
setInterval(() => { try { rollover(); } catch (e) { console.error('rollover', e); } }, 60 * 1000);

const app = express();
app.use(express.json());

// Routes API
app.use('/api/members', require('./routes/members'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/board', require('./routes/board'));
app.use('/api/completions', require('./routes/completions'));
app.use('/api', require('./routes/stats')); // /api/stats, /api/leaderboard, /api/history
app.use('/api/shopping', require('./routes/shopping'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/mawaqit', require('./routes/mawaqit')); // horaires Mawaqit (mosquée des Ulis)
app.use('/api/deen', require('./routes/deen')); // streaks Deen par profil (DB)
app.use('/api/activity', require('./routes/activity')); // journal daté (historique/calendrier)
app.use('/api/entretien', require('./routes/entretien')); // tâches périodiques (DB)
app.use('/api/notes', require('./routes/notes')); // notes partagées (DB)
app.use('/api/profiles', require('./routes/profiles')); // profils partagés (DB)

app.post('/api/rollover', (req, res) => res.json(rollover()));
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Front statique (le service worker gère le cache, l'API n'est jamais mise en cache).
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🌸 Mes Tâches sur http://0.0.0.0:${PORT}`));

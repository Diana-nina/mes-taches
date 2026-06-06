// server/routes/mawaqit.js
// Scraping des horaires Mawaqit pour la mosquée des Ulis (Al Fath – Les Ulis).
// À placer dans server/routes/ puis enregistrer dans server/index.js :
//   app.use('/api/mawaqit', require('./routes/mawaqit'));
//
// Aucune dépendance : utilise fetch() natif (Node 18+). Si tu es < Node 18,
// installe node-fetch et remplace la ligne fetch correspondante.

const express = require('express');
const router = express.Router();

// Slug de la mosquée sur mawaqit.net (modifiable via variable d'env).
// Mosquée Al-Andalous Les Ulis : 'el-andalous-ulis'
// Al Fath – Les Ulis : 'al-fath-les-ulis-91940-france'
const DEFAULT_SLUG = process.env.MAWAQIT_SLUG || 'el-andalous-ulis';
const SLUG_RE = /^[a-z0-9-]{3,60}$/;

const PRAYERS = ['fajr', 'dohr', 'asr', 'maghrib', 'isha'];

// Cache par mosquée + jour : { '<slug>': { day, data } } → 1 seul scrape/mosquée/jour.
const cache = {};
const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

async function scrape(slug) {
  const url = 'https://mawaqit.net/fr/' + slug;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MesTaches/1.0)' } });
  if (!res.ok) throw new Error('mawaqit HTTP ' + res.status);
  const html = await res.text();

  // La page injecte un objet JS « confData » qui contient tous les horaires.
  // Mawaqit le déclare avec let/var/const selon les versions.
  const m = html.match(/(?:var|let|const)\s+confData\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (!m) throw new Error('confData introuvable (page ou slug changé ?)');
  const conf = JSON.parse(m[1]);

  // conf.times = ['HH:MM','HH:MM','HH:MM','HH:MM','HH:MM'] -> Fajr, Dohr, Asr, Maghrib, Isha
  const times = {};
  PRAYERS.forEach((p, i) => { times[p] = (conf.times && conf.times[i]) || null; });

  // Iqama : conf.iqamaCalendar peut donner les délais ; on reste sur l'adhan ici.
  return {
    mosque: conf.name || conf.label || 'Mosquée des Ulis',
    slug,
    date: todayStr(),
    times,                                   // { fajr, dohr, asr, maghrib, isha }
    shuruq: conf.shuruq || null,             // lever du soleil
    jumua: conf.jumua || conf.jumua1 || null, // prière du vendredi
    updated: new Date().toISOString(),
  };
}

router.get('/', async (req, res) => {
  const slug = (req.query.slug || DEFAULT_SLUG).toString().trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return res.status(400).json({ error: 'slug_invalide', message: 'slug attendu : [a-z0-9-], 3 à 60 car.' });
  try {
    const c = cache[slug];
    if (c && c.day === todayStr() && c.data) return res.json(c.data);
    const data = await scrape(slug);
    cache[slug] = { day: todayStr(), data };
    res.json(data);
  } catch (e) {
    // En cas d'échec, on renvoie le dernier cache connu pour ce slug si dispo (tolérance aux pannes).
    if (cache[slug] && cache[slug].data) return res.json({ ...cache[slug].data, stale: true });
    res.status(502).json({ error: 'mawaqit_unavailable', message: String(e.message || e) });
  }
});

module.exports = router;

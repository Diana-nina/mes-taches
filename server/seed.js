const db = require('./db');

// Repris littéralement de l'index.html original (DEFAULT_TASKS lignes ~224-232).
// {e:emoji, n:nom, d:détail/pièce, c:catégorie}
const DEFAULT_TASKS = [
  // Lundi
  [{e:'🍽️',n:'Vider & relancer lave-vaisselle',d:'Cuisine',c:'cat-cuisine'},{e:'🍱',n:'Préparer lunch du lendemain',d:'Cuisine',c:'cat-cuisine'},{e:'🐱',n:'Gamelle & fontaine du chat',d:'Salon',c:'cat-chat'},{e:'🪣',n:'Litière du chat',d:'Toilettes',c:'cat-chat'},{e:'🧽',n:'Essuyer plan de travail',d:'Cuisine',c:'cat-cuisine'},{e:'🧺',n:'Lancer une lessive',d:'Linge',c:'cat-linge'}],
  // Mardi
  [{e:'🍽️',n:'Vider & relancer lave-vaisselle',d:'Cuisine',c:'cat-cuisine'},{e:'🐱',n:'Gamelle & fontaine du chat',d:'Salon',c:'cat-chat'},{e:'🪣',n:'Litière du chat',d:'Toilettes',c:'cat-chat'},{e:'🧽',n:'Essuyer plan de travail',d:'Cuisine',c:'cat-cuisine'},{e:'🛋️',n:'Ranger le salon (5 min)',d:'Salon',c:'cat-maison'}],
  // Mercredi
  [{e:'🍽️',n:'Vider & relancer lave-vaisselle',d:'Cuisine',c:'cat-cuisine'},{e:'🐱',n:'Gamelle & fontaine du chat',d:'Salon',c:'cat-chat'},{e:'🪣',n:'Litière du chat',d:'Toilettes',c:'cat-chat'},{e:'🧽',n:'Essuyer plan de travail',d:'Cuisine',c:'cat-cuisine'},{e:'🤖',n:'Lancer le robot aspirateur',d:'Salon/Bureau',c:'cat-maison'},{e:'🌿',n:'Arroser les plantes',d:'Salon',c:'cat-plantes'},{e:'🧺',n:'Étendre / plier le linge',d:'Linge',c:'cat-linge'}],
  // Jeudi
  [{e:'🍽️',n:'Vider & relancer lave-vaisselle',d:'Cuisine',c:'cat-cuisine'},{e:'🐱',n:'Gamelle & fontaine du chat',d:'Salon',c:'cat-chat'},{e:'🪣',n:'Litière du chat',d:'Toilettes',c:'cat-chat'},{e:'🧽',n:'Essuyer plan de travail',d:'Cuisine',c:'cat-cuisine'},{e:'🛏️',n:'Faire le lit correctement',d:'Chambre',c:'cat-maison'}],
  // Vendredi
  [{e:'🍽️',n:'Vider & relancer lave-vaisselle',d:'Cuisine',c:'cat-cuisine'},{e:'🐱',n:'Gamelle & fontaine du chat',d:'Salon',c:'cat-chat'},{e:'🪣',n:'Litière du chat',d:'Toilettes',c:'cat-chat'},{e:'🧽',n:'Essuyer plan de travail',d:'Cuisine',c:'cat-cuisine'},{e:'🧺',n:'Lancer une lessive',d:'Linge',c:'cat-linge'},{e:'🛒',n:'Liste de courses weekend',d:'Maison',c:'cat-courses'},{e:'🧹',n:'Balayer cuisine',d:'Cuisine',c:'cat-cuisine'}],
  // Samedi
  [{e:'🍽️',n:'Vider & relancer lave-vaisselle',d:'Cuisine',c:'cat-cuisine'},{e:'🐱',n:'Gamelle & fontaine du chat',d:'Salon',c:'cat-chat'},{e:'🪣',n:'Litière du chat',d:'Toilettes',c:'cat-chat'},{e:'🧹',n:'Aspirer toutes les pièces',d:'Toute la maison',c:'cat-maison'},{e:'🪣',n:'Serpillière cuisine + sdb',d:'Sol',c:'cat-maison'},{e:'🧴',n:'Nettoyer WC',d:'Toilettes',c:'cat-soin'},{e:'🚿',n:'Nettoyer lavabo & douche',d:'Salle de bain',c:'cat-soin'},{e:'🧽',n:'Plaques + four si besoin',d:'Cuisine',c:'cat-cuisine'},{e:'🛒',n:'Faire les courses',d:'Maison',c:'cat-courses'}],
  // Dimanche
  [{e:'🍽️',n:'Vider & relancer lave-vaisselle',d:'Cuisine',c:'cat-cuisine'},{e:'🐱',n:'Gamelle & fontaine du chat',d:'Salon',c:'cat-chat'},{e:'🪣',n:'Litière du chat',d:'Toilettes',c:'cat-chat'},{e:'🌿',n:'Arroser les plantes',d:'Salon',c:'cat-plantes'},{e:'🛋️',n:'Ranger & aérer le salon',d:'Salon',c:'cat-maison'},{e:'🛏️',n:'Faire le lit + aérer chambre',d:'Chambre',c:'cat-maison'},{e:'🧺',n:'Plier et ranger le linge',d:'Linge',c:'cat-linge'}],
];

// Repris de DEFAULT_MONTHLY (lignes ~234-241).
const DEFAULT_MONTHLY = [
  {e:'🪟',n:'Vitres & fenêtres',c:'cat-maison'},{e:'🧴',n:'Désinfecter poignées',c:'cat-maison'},
  {e:'🧊',n:'Nettoyer frigo intérieur',c:'cat-cuisine'},{e:'💨',n:'Dépoussiérer meubles',c:'cat-maison'},
  {e:'🛁',n:'Détartrer salle de bain',c:'cat-soin'},{e:'🐱',n:'Laver gamelle & fontaine',c:'cat-chat'},
  {e:'📦',n:'Ranger placards',c:'cat-maison'},{e:'🛏',n:'Laver couvre-lit/couette',c:'cat-linge'},
  {e:'🖥️',n:'Dépoussiérer bureau',c:'cat-maison'},{e:'🌿',n:'Entretenir les plantes',c:'cat-plantes'},
  {e:'☕',n:'Détartrer machine à café',c:'cat-cuisine'},{e:'🗑️',n:'Nettoyer les poubelles',c:'cat-maison'},
];

const DEFAULT_MEMBERS = [
  { name: 'Moi',   emoji: '🧔', color: '#a0d8ef', sort_order: 0 },
  { name: 'Femme', emoji: '👩', color: '#ff8fab', sort_order: 1 },
];

function seed() {
  const memberCount = db.prepare('SELECT COUNT(*) AS c FROM members').get().c;
  if (memberCount === 0) {
    const insM = db.prepare('INSERT INTO members(name, emoji, color, sort_order) VALUES(?,?,?,?)');
    for (const m of DEFAULT_MEMBERS) insM.run(m.name, m.emoji, m.color, m.sort_order);
  }

  const taskCount = db.prepare('SELECT COUNT(*) AS c FROM tasks').get().c;
  if (taskCount === 0) {
    const insT = db.prepare(`INSERT INTO tasks(freq, day_idx, emoji, name, detail, cat, assignee, points, sort_order)
                             VALUES(@freq, @day_idx, @emoji, @name, @detail, @cat, @assignee, @points, @sort_order)`);
    DEFAULT_TASKS.forEach((dayTasks, dayIdx) => {
      const weekend = dayIdx === 5 || dayIdx === 6;
      dayTasks.forEach((t, i) => {
        insT.run({
          freq: 'daily', day_idx: dayIdx, emoji: t.e, name: t.n,
          detail: t.d || null, cat: t.c || 'cat-maison',
          assignee: 'tous', points: weekend ? 2 : 1, sort_order: i,
        });
      });
    });
    DEFAULT_MONTHLY.forEach((t, i) => {
      insT.run({
        freq: 'monthly', day_idx: null, emoji: t.e, name: t.n,
        detail: null, cat: t.c || 'cat-maison',
        assignee: 'tous', points: 2, sort_order: i,
      });
    });
  }

  const rewardCount = db.prepare('SELECT COUNT(*) AS c FROM rewards').get().c;
  if (rewardCount === 0) {
    const insR = db.prepare('INSERT INTO rewards(label, emoji, cost_points) VALUES(?,?,?)');
    insR.run('Choisir le film du soir', '🎬', 15);
    insR.run('Petit-déj au lit', '🥐', 25);
    insR.run('Massage 10 min', '💆', 30);
    insR.run('L\'autre fait la vaisselle', '🍽️', 20);
  }
}

module.exports = seed;

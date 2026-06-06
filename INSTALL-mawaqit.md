# Ajouter les horaires Mawaqit (mosquée des Ulis)

Deux fichiers / deux étapes côté serveur (Node).

## 1. Copier la route
Place `mawaqit.js` dans `server/routes/` :

    server/routes/mawaqit.js

## 2. L'enregistrer dans `server/index.js`
Ajoute cette ligne avec les autres `app.use('/api/...')` :

    app.use('/api/mawaqit', require('./routes/mawaqit'));

C'est tout. Le front (`index.html`) appelle déjà `/api/mawaqit` et affiche
les horaires sur la page d'Accueil. Tant que le serveur n'est pas branché,
l'appli montre des horaires d'exemple avec la mention « exemple ».

## Choisir la mosquée
Par défaut : **Al-Andalous – Les Ulis** (`el-andalous-ulis`).
Pour changer, mets une variable d'environnement :

    MAWAQIT_SLUG=al-fath-les-ulis-91940-france

Le slug est la fin de l'URL Mawaqit de la mosquée :
`https://mawaqit.net/fr/<slug>`

## Notes
- `fetch()` natif requiert **Node 18+**. En dessous, installe `node-fetch`
  et adapte l'import dans `mawaqit.js`.
- Les horaires sont mis en cache pour la journée (1 seul appel à Mawaqit/jour),
  avec repli sur le dernier relevé si Mawaqit est injoignable.
- Le scraping lit le bloc `confData` de la page Mawaqit. Si Mawaqit change la
  structure de sa page, ajuste la regex dans `scrape()`.

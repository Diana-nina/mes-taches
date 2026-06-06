# Mes Tâches Mignones 🌸

Appli maison **partagée** (toi + ta femme) pour gérer toutes les tâches de la maison.
PWA kawaii installable sur tablette, avec backend + base de données → les données sont
synchronisées et survivent au vidage de cache.

## ✨ Fonctionnalités

- **Planning par jour** (Lun→Dim) : tâches quotidiennes + grille de tâches mensuelles.
- **Qui fait quoi** : chaque tâche assignable à *Toi*, *Femme*, *Tous*, ou **Rotation** (alterne tout seul chaque semaine).
- **Filtre par personne** : afficher uniquement ses tâches.
- **Équité** ⚖️ : points + nombre de tâches par personne (semaine/mois) avec **barre d'équilibre**.
- **Gamification** 🏆 : points par tâche, **classement** hebdo/mensuel, **gagnant** de la semaine, **historique** des actions, **récompenses** échangeables.
- **Liste de courses partagée** 🛒 : cochée en quasi temps réel (qui a ajouté / qui a coché, prix optionnel).
- **Badges « en retard »**, confettis, mascotte, toasts. Mêmes couleurs et police que l'original.

## 🚀 Lancer en local (Docker)

```bash
docker compose up -d --build
```

Puis ouvre **http://localhost:8899**.

> Port **8899** par défaut (8080 est déjà pris par ETC Collector sur cette machine).
> Pour un autre port : `HOST_PORT=9080 docker compose up -d --build`.
> Sans Docker : `npm install && PORT=8899 npm start` (Node ≥ 18).

## 🖥️ Déployer sur ta VM (ex. 10.10.0.21)

1. Copie le dossier sur la VM.
2. `docker compose up -d --build`
3. Sur la tablette / les téléphones du réseau, ouvre **http://10.10.0.21:8899** et « Installer » l'appli.

Le front appelle l'API en **chemin relatif** → la même image marche en local et sur la VM, sans rebuild.

## 💾 Données & sauvegarde

- Tout est dans **SQLite**, fichier `data/tasks.db` (monté en volume Docker).
- **Backup** = copier le dossier `data/`. Restauration = remettre le fichier puis redémarrer.
- `docker compose down` conserve les données. Pour repartir de zéro : supprimer `data/tasks.db*`.

## ⚙️ Personnaliser

- **Membres** (noms, emoji, couleur) : `GET/PATCH /api/members` (modifiables depuis l'API ; éditables dans le code seed par défaut `Moi`/`Femme`).
- **Tâches** : bouton ✏️ dans l'appli (emoji, nom, assigné, points) ou via `/api/tasks`.
- **Récompenses** par défaut : modifiables via `/api/rewards`.

## 🧱 Architecture

```
server/            Node + Express + better-sqlite3 (sert l'API ET le front)
  index.js         bootstrap + rollover semaine/mois
  db.js / migrate.js / seed.js
  rollover.js      clés semaine/mois + rotation déterministe
  routes/          members, tasks, board, completions, stats, shopping, rewards
public/            front PWA (index.html, sw.js, manifest, icônes)
data/              base SQLite (volume, gitignored)
Dockerfile · docker-compose.yml
```

API principale : `GET /api/board?day=N` renvoie tout l'écran en un appel.
Le navigateur **poll toutes les ~4 s** pour refléter les actions de l'autre membre.

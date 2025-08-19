# 🛠️ PostgreSQL CLI Tool (avec Kysely + Bun)

Cet outil en ligne de commande vous permet de **gérer facilement une base de données PostgreSQL** à travers une interface interactive. Il est écrit en **TypeScript**, utilise **Bun** comme runtime et **Kysely** pour l'accès à la base.

## 🚀 Fonctionnalités

* 📦 **Dump** : Exporter la base sous forme de fichier `.sql` avec les bonnes contraintes d’ordre d’insertion.
* 🧹 **Truncate** : Vider toutes les tables dans le bon ordre (en gérant les cycles).
* 💣 **Drop** : Supprimer toutes les tables et types custom PostgreSQL dans le bon ordre.
* 📊 **List** : Afficher toutes les tables du schéma `public` avec leur taille.
* 📥 **Import** : Importer un fichier `.sql` depuis un dossier `backups/` avec rollback automatique en cas d’erreur.
* 🧭 **CLI interactive** : Interface en ligne de commande pour exécuter facilement ces actions.

---

## 📦 Installation

1. Cloner ce dépôt :

```bash
git clone <url-du-repo>
cd <nom-du-dossier>
```

2. Utiliser le container Docker : 

```bash
docker compose up -d
docker compose exec -it bun bash
```

3. Installer les dépendances :

```bash
bun install
```

---

## 📂 Structure du projet

```
.
├── src/
│   ├── backups/            # Dossier contenant les dumps SQL
│   ├── features/           # Dossier contenant les features de CLI
│   │   ├── dump.ts         # Dump de la base
│   │   ├── truncate.ts     # Vider les tables
│   │   ├── drop.ts         # Supprimer les tables et types
│   │   ├── import.ts       # Importer un dump
│   │   ├── list.ts         # Lister les tables avec taille
│   └── database.ts         # Connexion Kysely
├── cli.ts
└── README.md
```

---

## 📋 Utilisation

### Lancer la CLI

```bash
bun cli.ts
```

---

## 🧠 Notes techniques

* Utilise `SET session_replication_role = 'replica'` pour désactiver temporairement les contraintes lors des imports. (⚠️ Peut poser des problèmes en fonctions des permissions)
* Les fichiers dump incluent **une seule requête INSERT par table** pour des performances optimisées.
* Les dumps sont triés par **ordre de dépendance des clés étrangères**.
* Les dumps **n'incluent pas** le schéma de la base de donnée, assurez-vous d'avoir des **fichiers de migrations** avant de drop
* Les opérations sont **en transaction**, avec rollback automatique en cas d'échec.

---

## 📁 Fichiers dump

Les dumps sont stockés dans le dossier `./src/backups/{nom de la bdd}/` avec un nom au format :

```
dump-DD-MM-YYYY-<timestamp>.sql
```

---

## 🧩 Prérequis

* Docker 
* Une base de donnée PostgreSQL
* Un fichier `.env` contenant une ou plusieurs connection strings, toutes appelées : DATABASE_URL
* Rajoutez un commentaire au dessus de chaque connection strings pour la nommer 

Exemple : 

```bash
# database local
DATABASE_URL=...

# database dev
DATABASE_URL=...

# database val
DATABASE_URL=...
```

---

## ✅ À venir (pas dans l'ordre)

- [x] ~~Support multi bases de données~~
- [ ] Export des schémas
- [ ] Support MySQL, SQLite, ...
- [ ] Retirer Kysely (pas nécessaire)

---

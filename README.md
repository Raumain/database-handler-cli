# 🛠️ PostgreSQL CLI Tool (with Kysely + Bun)

This command-line tool allows you to **easily manage a PostgreSQL database** through an interactive interface. It is written in **TypeScript**, uses **Bun** as the runtime, and **Kysely** for database access.

## 🚀 Features

* 📦 **Dump**: Export the database as a `.sql` file with correct insertion order constraints.
* 🧹 **Truncate**: Empty all tables in the correct order (handling cycles).
* 💣 **Drop**: Delete all tables and custom PostgreSQL types in the correct order.
* 📊 **List**: Display all tables in the `public` schema with their size.
* 📥 **Import**: Import a `.sql` file from the `backups/` folder with automatic rollback on error.
* 🧭 **Interactive CLI**: Command-line interface to easily execute these actions.

---

## 📦 Installation

```bash
npm i -g database-handler-cli
```

## 👨‍💻 Development

1. Clone this repository:

```bash
git clone https://github.com/Raumain/database-handler-cli.git
cd database-handler-cli
```

2. Use the Docker container:

```bash
docker compose up -d
docker compose exec -it bun bash
```

3. Install dependencies:

```bash
bun install
```

---

## 📂 Project Structure

```
.
├── src/
│   ├── backups/            # Folder containing SQL dumps
│   ├── features/           # CLI features
│   │   ├── dump.ts         # Database dump
│   │   ├── truncate.ts     # Empty tables
│   │   ├── drop.ts         # Drop tables and types
│   │   ├── import.ts       # Import dump
│   │   ├── list.ts         # List tables with size
│   └── database.ts         # Kysely connection
├── cli.ts
└── README.md
```

---

## 📋 Usage

### Run the CLI

```bash
bun cli.ts
```

---

## 🧠 Technical Notes

* Uses `SET session_replication_role = 'replica'` to temporarily disable constraints during imports. (⚠️ May cause issues depending on permissions)
* Dump files include **a single INSERT query per table** for optimized performance.
* Dumps are sorted by **foreign key dependency order**.
* Dumps **do not include** the database schema, make sure you have **migration files** before dropping.
* Operations are **transactional**, with automatic rollback on failure.

---

## 📁 Dump Files

Dump files are stored in the folder `./src/backups/{database name}/` with the following naming format:

```
dump-DD-MM-YYYY-<timestamp>.sql
```

---

## 🧩 Prerequisites

* Docker (development only)
* A PostgreSQL database
* A `.env` file containing one or more connection strings, all named: DATABASE_URL
* Add a comment above each connection string to name it

Example:

```bash
# local database
DATABASE_URL=...

# dev database
DATABASE_URL=...

# val database
DATABASE_URL=...
```

---

## ✅ Coming Soon (not in order)

- [x] ~~Multi-database support~~
- [x] ~~Schema export~~
- [ ] MySQL, SQLite, ... support
- [ ] Remove Kysely (not necessary)

---

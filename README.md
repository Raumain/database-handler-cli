# Database Handler CLI

[![npm version](https://img.shields.io/npm/v/database-handler-cli.svg)](https://www.npmjs.com/package/database-handler-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

A powerful, interactive command-line tool for managing PostgreSQL databases with confidence. Built for developers who need reliable, production-ready database operations with automatic dependency resolution and transactional safety.

## Why Use This Tool?

Managing PostgreSQL databases often involves tedious manual work: remembering foreign key dependencies, handling circular references, ensuring data integrity during imports, and maintaining consistent backup practices. This CLI automates all of that.

**Key Benefits:**
- **Zero Configuration**: Works out of the box with any PostgreSQL database
- **Smart Dependency Resolution**: Automatically handles foreign key relationships and circular dependencies
- **Transactional Safety**: All operations use transactions with automatic rollback on failure
- **Multi-Database Support**: Easily switch between multiple database connections
- **Production-Ready**: Used in production environments with robust error handling

## Features

| Feature | Description |
|---------|-------------|
| 📦 **Smart Dumps** | Export databases with automatic foreign key ordering and optional schema inclusion |
| 📥 **Safe Imports** | Import SQL dumps with transactional rollback on any error |
| 🧹 **Truncate Tables** | Empty all tables while respecting foreign key constraints |
| 💣 **Drop Everything** | Remove all tables and custom types in the correct order |
| 📊 **Table Inspector** | List all tables with their sizes at a glance |
| 🧭 **Interactive CLI** | User-friendly prompts guide you through every operation |
| 🔄 **Sequence Management** | Automatically reset PostgreSQL sequences after imports |

## Quick Start

### Installation

```bash
npm install -g database-handler-cli
```

### Setup

Create a `.env` file in your project root:

```bash
# Production database
DATABASE_URL=postgresql://user:password@localhost:5432/prod_db

# Development database
DATABASE_URL=postgresql://user:password@localhost:5432/dev_db
```

> **Note**: Comments above `DATABASE_URL` entries are used as database identifiers in the interactive menu.

### Usage

Simply run:

```bash
database-handler
```

Then follow the interactive prompts to select your database and desired operation.

## Demo

![CLI Demo](https://github.com/Raumain/database-handler-cli/blob/main/demo.gif)

## How It Works

### Dump Operations

The tool analyzes your database schema to determine the correct order for exporting tables based on foreign key relationships. This ensures that imports will work without constraint violations.

```sql
-- Example generated dump structure
SET session_replication_role = 'replica';  -- Temporarily disable constraints

INSERT INTO "users" (...) VALUES (...);     -- Dependencies first
INSERT INTO "posts" (...) VALUES (...);     -- Then dependent tables

SET session_replication_role = 'origin';   -- Re-enable constraints

SELECT setval('public."users_id_seq"', ...); -- Reset sequences
```

**Dump Options:**
- **Data only**: Fast exports without schema definitions (default)
- **With schema**: Include `CREATE TABLE` statements for full database recreation

Dump files are stored in `./backups/{database-name}/dump-DD-MM-YYYY-{timestamp}.sql`

### Import Operations

Imports run within a single transaction, ensuring atomicity:
- If any statement fails, the entire import is rolled back
- Your database remains in a consistent state
- Detailed error messages help diagnose issues

### Drop Operations

The tool uses topological sorting to determine safe deletion order:
1. Analyzes foreign key dependencies
2. Detects and handles circular references
3. Drops tables in correct order
4. Removes custom PostgreSQL types
5. Uses `CASCADE` only when necessary

## Technical Details

### Architecture

```
src/
├── features/
│   ├── dump.ts       # Smart database export with dependency resolution
│   ├── import.ts     # Transactional SQL import with rollback
│   ├── drop.ts       # Safe table/type deletion with topological sort
│   ├── empty.ts      # Truncate all tables
│   ├── list.ts       # Table size inspection
│   └── schema.ts     # Schema-only export
├── utils/
│   ├── getAllTableNames.ts    # Table discovery
│   ├── getDbConnections.ts    # .env parsing
│   └── getDumpFilePath.ts     # Backup path generation
├── database.ts       # Kysely connection factory
└── cli.ts            # Interactive CLI interface
```

### Dependencies

- **[Kysely](https://kysely.dev/)**: Type-safe SQL query builder
- **[Inquirer.js](https://github.com/SBoudrias/Inquirer.js)**: Interactive CLI prompts
- **[Chalk](https://github.com/chalk/chalk)**: Terminal styling
- **[pg](https://node-postgres.com/)**: PostgreSQL client

### Requirements

- **Node.js**: 18+ (or Bun runtime)
- **PostgreSQL**: 12+
- **Permissions**: `SELECT`, `INSERT`, `DELETE`, `DROP` on target databases

## Development

### Local Setup

1. Clone the repository:
```bash
git clone https://github.com/Raumain/database-handler-cli.git
cd database-handler-cli
```

2. Install dependencies:
```bash
bun install  # or npm install
```

3. Run in development mode:
```bash
bun src/cli.ts
```

4. Build for production:
```bash
bun run build
```

### Docker Development

For isolated development environments:

```bash
docker compose up -d
docker compose exec -it bun bash
```

### Code Quality

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
bun run fmt        # Format and fix issues
bun run fmt.check  # Check without modifying
```

## Advanced Usage

### Multiple Database Connections

The tool supports multiple database connections in a single `.env` file:

```bash
# Production
DATABASE_URL=postgresql://...

# Staging
DATABASE_URL=postgresql://...

# Local Development
DATABASE_URL=postgresql://...
```

Switch between databases using the interactive menu.

### Programmatic Usage

While designed as a CLI, the tool can be imported programmatically:

```typescript
import { database } from 'database-handler-cli/database'
import { dump } from 'database-handler-cli/features/dump'

const db = database('postgresql://...')
await dump(db, 'my-database', false)
```

## Roadmap

- [ ] Support for MySQL and SQLite
- [ ] Parallel dump/import for large databases
- [ ] Incremental backups
- [ ] Cloud storage integration (S3, Azure Blob)
- [ ] Schema diffing and migration generation

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

Found a security vulnerability? Please report it privately to [romaintibo6@gmail.com](mailto:romaintibo6@gmail.com). See [SECURITY.md](SECURITY.md) for details.

## License

[MIT](LICENSE) © [Raumain](https://github.com/Raumain)

## Acknowledgments

Built with ❤️ using TypeScript, Bun, and Kysely.

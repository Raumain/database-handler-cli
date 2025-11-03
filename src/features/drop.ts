import chalk from "chalk";
import { type Kysely, sql } from "kysely";

async function getAllTableNames(
	db: Kysely<Record<string, unknown>>,
): Promise<string[]> {
	const result = await sql<{ table_name: string }>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `.execute(db);

	return result.rows.map((r) => r.table_name);
}

async function getForeignKeyDependencies(
	db: Kysely<Record<string, unknown>>,
): Promise<Map<string, Set<string>>> {
	const result = await sql<{
		table_name: string;
		referenced_table_name: string;
	}>`
    SELECT
      tc.table_name,
      ccu.table_name AS referenced_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `.execute(db);

	const map = new Map<string, Set<string>>();
	for (const row of result.rows) {
		if (!map.has(row.table_name)) {
			map.set(row.table_name, new Set());
		}
		map.get(row.table_name)?.add(row.referenced_table_name);
	}

	return map;
}

function topologicalSort(
	tables: string[],
	dependencies: Map<string, Set<string>>,
): string[] {
	const visited = new Set<string>();
	const temp = new Set<string>();
	const sorted: string[] = [];

	function visit(n: string) {
		if (visited.has(n)) return;
		if (temp.has(n)) throw new Error(`Cycle detected involving table "${n}"`);
		temp.add(n);
		for (const dep of dependencies.get(n) ?? []) {
			visit(dep);
		}
		temp.delete(n);
		visited.add(n);
		sorted.push(n);
	}

	for (const table of tables) {
		if (!visited.has(table)) {
			visit(table);
		}
	}

	return sorted.reverse();
}

async function dropAllTypes(db: Kysely<Record<string, unknown>>) {
	console.log(chalk.gray("Removing custom types..."));

	const types = await sql<{ typname: string }>`
      SELECT t.typname
      FROM pg_catalog.pg_type t
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
        AND t.typname NOT IN ('pg_catalog', 'information_schema');
    `.execute(db);

	console.log(types.rows);
	for (const type of types.rows) {
		console.log(`  - ${chalk.cyan(type.typname)} (custom type)`);
		await sql
			.raw(`DROP TYPE IF EXISTS public."${type.typname}" CASCADE;`)
			.execute(db);
	}

	console.log(chalk.green("Custom types removed."));
}

export async function dropAllTables(db: Kysely<Record<string, unknown>>) {
	const tables = await getAllTableNames(db);
	const deps = await getForeignKeyDependencies(db);

	try {
		const ordered = topologicalSort(tables, deps);

		console.log("Removing tables in the correct order:");
		console.log(ordered.join(" → "));

		for (const table of ordered) {
			await sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`).execute(db);
			console.log(chalk.green(`Table "${table}" removed`));
		}

		console.log(chalk.green("All tables have been properly removed."));
	} catch (_e: unknown) {
		console.warn(
			chalk.yellow(
				"Warning: Cycle detected, forcing removal with CASCADE on all tables",
			),
		);

		const tableList = tables.map((t) => `"${t}"`).join(", ");
		await sql.raw(`DROP TABLE IF EXISTS ${tableList} CASCADE`).execute(db);

		console.log(
			chalk.green("All tables have been removed with CASCADE (order ignored)."),
		);
	} finally {
		await dropAllTypes(db);
	}
}

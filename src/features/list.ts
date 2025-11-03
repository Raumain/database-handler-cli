import chalk from "chalk";
import { type Kysely, sql } from "kysely";

export async function listTablesWithSize(db: Kysely<Record<string, unknown>>) {
	const result = await sql<{
		table_name: string;
		total_size: string;
	}>`
    SELECT
      t.table_name,
      pg_size_pretty(pg_total_relation_size('"' || t.table_name || '"')) AS total_size
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY pg_total_relation_size('"' || t.table_name || '"') DESC
  `.execute(db);

	console.log(chalk.bold("\nTables in the public schema:\n"));

	if (result.rows.length === 0) {
		console.log(chalk.gray("No tables found."));
		return;
	}

	for (const row of result.rows) {
		console.log(
			`- ${chalk.cyan(row.table_name)} (${chalk.yellow(row.total_size)})`,
		);
	}
	console.log("");
}

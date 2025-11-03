import inquirer from "inquirer";
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

export async function truncateTables(db: Kysely<Record<string, unknown>>) {
	// Récupérer toutes les tables
	const tables = await getAllTableNames(db);

	if (tables.length === 0) {
		console.log("No tables found in the public schema.");
		return;
	}

	const { selectedTables } = await inquirer.prompt([
		{
			type: "checkbox",
			name: "selectedTables",
			message:
				"Choose tables to truncate (use spacebar to select multiple tables):",
			choices: [
				{ name: "Select all", value: "all" },
				...tables.map((t) => ({ name: t, value: t })),
			],
		},
	]);

	const tablesToTruncate = (selectedTables as Array<string>).includes("all")
		? tables
		: (selectedTables as Array<string>);

	if (tablesToTruncate.length === 0) {
		console.log("No table selected.");
		return;
	}

	const tableList = tablesToTruncate.map((t) => `"${t}"`).join(", ");

	try {
		console.log("Truncating tables (with CASCADE)...");

		await sql
			.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`)
			.execute(db);

		console.log(
			`Tables ${tablesToTruncate.join(", ")} successfully truncated (including cycles & FK). \n`,
		);
	} catch (e) {
		console.error("Error during TRUNCATE:", e);
		process.exit(1);
	}
}

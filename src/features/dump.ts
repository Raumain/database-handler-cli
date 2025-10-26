import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type Kysely, sql } from "kysely";
import { getAllTableNames } from "../utils/getAllTableNames.js";
import { getDumpFilePath } from "../utils/getDumpFilePath.js";
import { generateSchemaStatements } from "./schema.js";

async function getForeignKeyDependencies(
	db: Kysely<Record<string, unknown>>,
): Promise<Map<string, string[]>> {
	const result = await sql<{
		table_name: string;
		referenced_table_name: string;
	}>`
		SELECT
			kcu.table_name AS table_name,
			ccu.table_name AS referenced_table_name
		FROM
			information_schema.key_column_usage AS kcu
		JOIN
			information_schema.constraint_column_usage AS ccu
		ON
			kcu.constraint_name = ccu.constraint_name
		WHERE
			kcu.table_schema = 'public'
		`.execute(db);

	const dependencies = new Map<string, string[]>();

	for (const { table_name, referenced_table_name } of result.rows) {
		if (!dependencies.has(table_name)) {
			dependencies.set(table_name, []);
		}
		dependencies.get(table_name)?.push(referenced_table_name);
	}

	return dependencies;
}

async function sortTablesByForeignKeys(
	tables: string[],
	db: Kysely<Record<string, unknown>>,
): Promise<string[]> {
	const dependencies = await getForeignKeyDependencies(db);
	const sortedTables: string[] = [];
	const visited = new Set<string>();

	async function visit(table: string) {
		if (!visited.has(table)) {
			visited.add(table);
			const deps = dependencies.get(table) || [];
			for (const dep of deps) {
				await visit(dep);
			}
			sortedTables.push(table);
		}
	}

	for (const table of tables) {
		await visit(table);
	}

	return sortedTables;
}

function escapeLiteral(value: unknown): string {
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "number") return value.toString();
	if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
	if (value instanceof Date) return `'${value.toISOString()}'`;
	return `'${(value as string).replace(/'/g, "''")}'`;
}

async function generateInsertSQL(
	tableName: string,
	db: Kysely<Record<string, unknown>>,
): Promise<string | null> {
	const rows = await db.selectFrom(tableName).selectAll().execute();
	if (rows.length === 0) return null;

	const columns = Object.keys(rows[0]);
	const values = rows
		.map((row) => {
			// @ts-expect-error
			const valueList = columns.map((col) => escapeLiteral(row[col]));
			return `(${valueList.join(", ")})`;
		})
		.join(",\n");

	return `-- Dump of table ${tableName}\nINSERT INTO "${tableName}" (${columns
		.map((c) => `"${c}"`)
		.join(", ")})\nVALUES\n${values};\n`;
}

export async function dump(
	db: Kysely<Record<string, unknown>>,
	dbName: string,
	withSchema = false,
) {
	const tables = await getAllTableNames(db);

	console.log(`📦 Found ${tables.length} tables to dump.`);

	const sortedTables = await sortTablesByForeignKeys(tables, db);

	const insertStatements: string[] = [];

	for (const table of sortedTables) {
		try {
			const sql = await generateInsertSQL(table, db);
			if (sql) {
				insertStatements.push(sql);
				console.log(`✅ Dumped ${table}`);
			} else {
				console.log(`⚠️  Skipped empty table ${table}`);
			}
		} catch (e) {
			console.error(`❌ Failed to dump table "${table}":`, e);
		}
	}

	let schemaStatements: string[] = [];
	if (withSchema) {
		console.log("📐 Exporting schema...");
		schemaStatements = await generateSchemaStatements(db, sortedTables);
	}

	const fullSQL = [
		...(withSchema ? [...schemaStatements, ""] : []),
		"-- Disable constraints",
		"SET session_replication_role = 'replica';",
		"",
		...insertStatements,
		"",
		"-- Re-enable constraints",
		"SET session_replication_role = 'origin';",
	].join("\n");

	const OUTPUT_FILE = getDumpFilePath(dbName, "dump");
	mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
	writeFileSync(OUTPUT_FILE, fullSQL);

	console.log(`🎉 Dump SQL generated at ${OUTPUT_FILE}`);
}

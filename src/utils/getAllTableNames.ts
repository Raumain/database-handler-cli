import { type Kysely, sql } from "kysely";

export async function getAllTableNames(
	db: Kysely<Record<string, unknown>>,
): Promise<string[]> {
	const result = await sql<{ table_name: string }>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'kysely%'
  `.execute(db);

	return result.rows.map((row) => row.table_name);
}

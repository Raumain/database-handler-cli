import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export function database(databaseUrl: string) {
	const dialect = new PostgresDialect({
		pool: new Pool({
			connectionString: databaseUrl,
			ssl: { rejectUnauthorized: false }
		}),
	});

	const db = new Kysely<Record<string, unknown>>({
		dialect,
	});
	return db;
}

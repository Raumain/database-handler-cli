import { Kysely, PostgresDialect } from "kysely";
import { Pool, type PoolConfig } from "pg";

export function database(databaseUrl: string) {
	// Enable SSL only if required by the connection string
	const useSSL =
		databaseUrl.includes("sslmode=require") || databaseUrl.includes("ssl=true");

	const poolConfig: PoolConfig = { connectionString: databaseUrl };
	if (useSSL) {
		poolConfig.ssl = { rejectUnauthorized: false };
	}

	const dialect = new PostgresDialect({
		pool: new Pool(poolConfig),
	});

	const db = new Kysely<Record<string, unknown>>({
		dialect,
	});
	return db;
}

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type Kysely, sql } from "kysely";
import { getAllTableNames } from "../utils/getAllTableNames.js";
import { getDumpFilePath } from "../utils/getDumpFilePath.js";

interface ColumnDefinition {
	column_name: string;
	data_type: string;
	column_default: string | null;
	is_nullable: "YES" | "NO";
	character_maximum_length: number | null;
	numeric_precision: number | null;
	numeric_scale: number | null;
}

interface ConstraintDefinition {
	constraint_name: string;
	constraint_type: "PRIMARY KEY" | "UNIQUE" | "CHECK";
	check_clause: string | null;
	columns: string[];
}

interface ForeignKeyDefinition {
	constraint_name: string;
	foreign_table_name: string;
	columns: string[];
	foreign_columns: string[];
}

interface IndexDefinition {
	indexname: string;
	indexdef: string;
}

async function getTableConstraints(
	db: Kysely<Record<string, unknown>>,
	tableName: string,
): Promise<ConstraintDefinition[]> {
	const result = await sql<{
		constraint_name: string;
		constraint_type: "PRIMARY KEY" | "UNIQUE" | "CHECK";
		check_clause: string | null;
		column_name: string;
	}>`
        SELECT
            tc.constraint_name,
            tc.constraint_type,
            cc.check_clause,
            kcu.column_name
        FROM
            information_schema.table_constraints AS tc
        LEFT JOIN
            information_schema.key_column_usage AS kcu
        ON
            tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema AND tc.table_name = kcu.table_name
        LEFT JOIN
            information_schema.check_constraints AS cc
        ON
            tc.constraint_name = cc.constraint_name AND tc.table_schema = cc.constraint_schema
        WHERE
            tc.table_schema = 'public' AND tc.table_name = ${tableName}
            AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'CHECK')
    `.execute(db);

	const constraints = new Map<string, ConstraintDefinition>();
	for (const row of result.rows) {
		if (!constraints.has(row.constraint_name)) {
			constraints.set(row.constraint_name, {
				constraint_name: row.constraint_name,
				constraint_type: row.constraint_type,
				check_clause: row.check_clause,
				columns: [],
			});
		}
		if (row.column_name) {
			constraints.get(row.constraint_name)?.columns.push(row.column_name);
		}
	}

	return Array.from(constraints.values());
}

async function getForeignKeys(
	db: Kysely<Record<string, unknown>>,
	tableName: string,
): Promise<string[]> {
	const result = await sql<{
		constraint_name: string;
		foreign_table_name: string;
		column_name: string;
		foreign_column_name: string;
	}>`
        SELECT
            rc.constraint_name,
            ccu.table_name AS foreign_table_name,
            kcu.column_name,
            ccu.column_name AS foreign_column_name
        FROM
            information_schema.referential_constraints AS rc
        JOIN
            information_schema.key_column_usage AS kcu
        ON
            rc.constraint_name = kcu.constraint_name AND rc.constraint_schema = kcu.table_schema
        JOIN
            information_schema.key_column_usage AS ccu
        ON
            rc.unique_constraint_name = ccu.constraint_name AND rc.unique_constraint_schema = ccu.table_schema
        WHERE
            kcu.table_name = ${tableName} AND kcu.table_schema = 'public'
    `.execute(db);

	const foreignKeys = new Map<string, ForeignKeyDefinition>();
	for (const row of result.rows) {
		if (!foreignKeys.has(row.constraint_name)) {
			foreignKeys.set(row.constraint_name, {
				constraint_name: row.constraint_name,
				foreign_table_name: row.foreign_table_name,
				columns: [],
				foreign_columns: [],
			});
		}
		foreignKeys.get(row.constraint_name)?.columns.push(row.column_name);
		foreignKeys
			.get(row.constraint_name)
			?.foreign_columns.push(row.foreign_column_name);
	}

	return Array.from(foreignKeys.values()).map((fk) => {
		const columns = fk.columns.map((c) => `"${c}"`).join(", ");
		const foreignColumns = fk.foreign_columns.map((c) => `"${c}"`).join(", ");
		return `ALTER TABLE "${tableName}" ADD CONSTRAINT "${fk.constraint_name}" FOREIGN KEY (${columns}) REFERENCES "${fk.foreign_table_name}" (${foreignColumns});`;
	});
}

async function getIndexes(
	db: Kysely<Record<string, unknown>>,
	tableName: string,
): Promise<string[]> {
	const result = await sql<IndexDefinition>`
        SELECT
            indexname,
            indexdef
        FROM
            pg_indexes
        WHERE
            schemaname = 'public'
            AND tablename = ${tableName}
            AND indexname NOT IN (
                SELECT constraint_name
                FROM information_schema.table_constraints
                WHERE table_name = ${tableName} AND constraint_type IN ('PRIMARY KEY', 'UNIQUE')
            )
    `.execute(db);

	return result.rows.map((row) => `${row.indexdef};`);
}

async function getTableSchema(
	db: Kysely<Record<string, unknown>>,
	tableName: string,
): Promise<string> {
	const columnsResult = await sql<ColumnDefinition>`
        SELECT
            column_name,
            data_type,
            column_default,
            is_nullable,
            character_maximum_length,
            numeric_precision,
            numeric_scale
        FROM
            information_schema.columns
        WHERE
            table_schema = 'public' AND table_name = ${tableName}
        ORDER BY
            ordinal_position
    `.execute(db);

	const columns = columnsResult.rows
		.map((col) => {
			let type = col.data_type;
			if (type === "character varying") {
				type = `varchar(${col.character_maximum_length})`;
			} else if (type === "numeric") {
				type = `numeric(${col.numeric_precision}, ${col.numeric_scale})`;
			}
			const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
			const defaultValue = col.column_default
				? `DEFAULT ${col.column_default}`
				: "";
			return `    "${col.column_name}" ${type} ${nullable} ${defaultValue}`;
		})
		.join(",\n");

	const constraints = await getTableConstraints(db, tableName);
	const constraintStatements = constraints
		.map((c) => {
			if (c.constraint_type === "CHECK") {
				return `    CONSTRAINT "${c.constraint_name}" ${c.constraint_type} (${c.check_clause})`;
			}
			const columns = c.columns.map((col) => `"${col}"`).join(", ");
			return `    CONSTRAINT "${c.constraint_name}" ${c.constraint_type} (${columns})`;
		})
		.join(",\n");

	const createTableStatement = `CREATE TABLE "${tableName}" (\n${columns}${
		constraintStatements ? ",\n" : ""
	}${constraintStatements}\n);`;

	return createTableStatement;
}

export async function exportSchema(
	db: Kysely<Record<string, unknown>>,
	dbName: string,
) {
	const tables = await getAllTableNames(db);
	console.log(`📦 Found ${tables.length} tables to export schema for.`);

	const createTableStatements: string[] = [];
	for (const table of tables) {
		try {
			const createTableStatement = await getTableSchema(db, table);
			createTableStatements.push(createTableStatement);
			console.log(`✅ Exported schema for table ${table}`);
		} catch (e) {
			console.error(`❌ Failed to export schema for table "${table}":`, e);
		}
	}

	const foreignKeyStatements: string[] = [];
	for (const table of tables) {
		try {
			const fks = await getForeignKeys(db, table);
			foreignKeyStatements.push(...fks);
		} catch (e) {
			console.error(`❌ Failed to export foreign keys for table "${table}":`, e);
		}
	}

	const indexStatements: string[] = [];
	for (const table of tables) {
		try {
			const indexes = await getIndexes(db, table);
			indexStatements.push(...indexes);
		} catch (e) {
			console.error(`❌ Failed to export indexes for table "${table}":`, e);
		}
	}

	const fullSQL = [
		...createTableStatements,
		...foreignKeyStatements,
		...indexStatements,
	].join("\n\n");

	const OUTPUT_FILE = getDumpFilePath(dbName, "schema");
	mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
	writeFileSync(OUTPUT_FILE, fullSQL);

	console.log(`🎉 Schema SQL generated at ${OUTPUT_FILE}`);
}

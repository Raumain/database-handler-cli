import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type Kysely, sql } from "kysely";
import { getAllTableNames } from "../utils/getAllTableNames.js";
import { getDumpFilePath } from "../utils/getDumpFilePath.js";

interface ColumnDefinition {
	column_name: string;
	data_type: string;
	udt_name: string;
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

interface SequenceDefinition {
	sequence_name: string;
	data_type: string;
	start_value: string;
	increment: string;
	max_value: string;
	min_value: string;
	cycle: boolean;
}



/**
 * Export all PostgreSQL sequences
 */
async function getSequences(
	db: Kysely<Record<string, unknown>>,
): Promise<string[]> {
	const result = await sql<SequenceDefinition>`
        SELECT
            s.sequence_name,
            s.data_type,
            s.start_value,
            s.increment,
            s.maximum_value as max_value,
            s.minimum_value as min_value,
            s.cycle_option = 'YES' as cycle
        FROM
            information_schema.sequences s
        WHERE
            s.sequence_schema = 'public'
    `.execute(db);

	const sequences: string[] = [];
	for (const seq of result.rows) {
		const createSeq = `CREATE SEQUENCE IF NOT EXISTS public."${seq.sequence_name}";`;
		sequences.push(createSeq);
	}

	return sequences;
}

/**
 * Get sequence ownership statements (ALTER SEQUENCE ... OWNED BY ...)
 */
async function getSequenceOwnerships(
	db: Kysely<Record<string, unknown>>,
): Promise<string[]> {
	const result = await sql<{
		sequence_name: string;
		table_name: string;
		column_name: string;
	}>`
        SELECT
            s.relname AS sequence_name,
            t.relname AS table_name,
            a.attname AS column_name
        FROM
            pg_class s
        JOIN
            pg_depend d ON d.objid = s.oid
        JOIN
            pg_class t ON d.refobjid = t.oid
        JOIN
            pg_attribute a ON a.attrelid = t.oid AND a.attnum = d.refobjsubid
        JOIN
            pg_namespace n ON n.oid = s.relnamespace
        WHERE
            s.relkind = 'S'
            AND n.nspname = 'public'
    `.execute(db);

	return result.rows.map(
		(row) =>
			`ALTER SEQUENCE public."${row.sequence_name}" OWNED BY "${row.table_name}"."${row.column_name}";`,
	);
}

/**
 * Export all custom PostgreSQL ENUM types
 */
async function getEnumTypes(
	db: Kysely<Record<string, unknown>>,
): Promise<string[]> {
	const result = await sql<{
		typname: string;
		enumlabel: string;
	}>`
        SELECT
            t.typname,
            e.enumlabel
        FROM
            pg_type t
        JOIN
            pg_enum e ON t.oid = e.enumtypid
        JOIN
            pg_namespace n ON n.oid = t.typnamespace
        WHERE
            n.nspname = 'public'
        ORDER BY
            t.typname, e.enumsortorder
    `.execute(db);

	// Group by enum type name
	const enumMap = new Map<string, string[]>();
	for (const row of result.rows) {
		if (!enumMap.has(row.typname)) {
			enumMap.set(row.typname, []);
		}
		enumMap.get(row.typname)?.push(row.enumlabel);
	}

	// Generate CREATE TYPE statements
	const enumTypes: string[] = [];
	for (const [typname, labels] of enumMap.entries()) {
		const labelList = labels.map((l) => `'${l}'`).join(", ");
		enumTypes.push(`CREATE TYPE "${typname}" AS ENUM (${labelList});`);
	}

	return enumTypes;
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
            udt_name,
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

			// Handle specific data types
			if (type === "character varying") {
				type = col.character_maximum_length
					? `varchar(${col.character_maximum_length})`
					: "varchar(255)";
			} else if (type === "numeric" && col.numeric_precision) {
				type = `numeric(${col.numeric_precision}, ${col.numeric_scale})`;
			} else if (type === "timestamp with time zone") {
				type = "timestamp with time zone";
			} else if (type === "timestamp without time zone") {
				type = "timestamp";
			} else if (type === "USER-DEFINED") {
				// Use the actual user-defined type name (e.g., ENUM)
				type = col.udt_name;
			} else if (type === "integer" || type === "bigint") {
				// Keep as is
				type = col.data_type;
			} else if (type === "text") {
				type = "text";
			} else if (type === "boolean") {
				type = "boolean";
			} else if (type === "uuid") {
				type = "uuid";
			}

			const nullable = col.is_nullable === "YES" ? "NULL" : "NOT NULL";
			const defaultValue = col.column_default
				? `DEFAULT ${col.column_default}`
				: "";

			return `    "${col.column_name}" ${type} ${nullable} ${defaultValue}`.trim();
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

export async function generateSchemaStatements(
	db: Kysely<Record<string, unknown>>,
	tables: string[],
): Promise<string[]> {
	// 1. Export sequences first
	console.log("📦 Exporting sequences...");
	const sequences = await getSequences(db);

	// 2. Export custom ENUM types
	console.log("📦 Exporting custom types...");
	const enumTypes = await getEnumTypes(db);

	// 3. Export tables
	console.log("📦 Exporting tables...");
	const createTableStatements: string[] = [];
	for (const table of tables) {
		try {
			const createTableStatement = await getTableSchema(db, table);
			createTableStatements.push(createTableStatement);
		} catch (e) {
			console.error(`❌ Failed to export schema for table "${table}":`, e);
		}
	}

	// 4. Get sequence ownerships (after tables are created)
	console.log("📦 Exporting sequence ownerships...");
	const sequenceOwnerships = await getSequenceOwnerships(db);

	// 5. Export foreign keys
	console.log("📦 Exporting foreign keys...");
	const foreignKeyStatements: string[] = [];
	for (const table of tables) {
		try {
			const fks = await getForeignKeys(db, table);
			foreignKeyStatements.push(...fks);
		} catch (e) {
			console.error(
				`❌ Failed to export foreign keys for table "${table}":`,
				e,
			);
		}
	}

	// 6. Export indexes
	console.log("📦 Exporting indexes...");
	const indexStatements: string[] = [];
	for (const table of tables) {
		try {
			const indexes = await getIndexes(db, table);
			indexStatements.push(...indexes);
		} catch (e) {
			console.error(`❌ Failed to export indexes for table "${table}":`, e);
		}
	}

	// Return in correct order
	return [
		...(sequences.length > 0 ? sequences : []),
		...(enumTypes.length > 0 ? ["", ...enumTypes] : []),
		"",
		...createTableStatements,
		"",
		...(sequenceOwnerships.length > 0 ? sequenceOwnerships : []),
		...(foreignKeyStatements.length > 0 ? ["", ...foreignKeyStatements] : []),
		...(indexStatements.length > 0 ? ["", ...indexStatements] : []),
	];
}

export async function exportSchema(
	db: Kysely<Record<string, unknown>>,
	dbName: string,
) {
	const tables = await getAllTableNames(db);
	console.log(`📦 Found ${tables.length} tables to export schema for.`);

	const statements = await generateSchemaStatements(db, tables);

	for (const table of tables) {
		console.log(`✅ Exported schema for table ${table}`);
	}

	const fullSQL = statements.join("\n\n");

	const OUTPUT_FILE = getDumpFilePath(dbName, "schema");
	mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
	writeFileSync(OUTPUT_FILE, fullSQL);

	console.log(`🎉 Schema SQL generated at ${OUTPUT_FILE}`);
}

import path from "node:path";
import { toCamelCase } from "./toCamelCase.js";

export function getDumpFilePath(
	dbName: string,
	prefix: "dump" | "schema",
): string {
	const now = new Date();
	const day = String(now.getDate()).padStart(2, "0");
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const year = now.getFullYear();
	const timestamp = Date.now();

	const filename = `${prefix}-${day}-${month}-${year}-${timestamp}.sql`;

	return path.resolve(
		process.cwd(),
		"backups",
		toCamelCase(dbName),
		filename,
	);
}

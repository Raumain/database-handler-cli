import { readFileSync } from "node:fs";

export function getDbConnectionsFromEnv(): Map<string, string> {
	const envFilePath = ".env";
	const dbConnections = new Map<string, string>();

	const lines = readFileSync(envFilePath, "utf-8").split("\n");
	let currentComment = "";

	for (const line of lines) {
		const trimmedLine = line.trim();

		if (trimmedLine.startsWith("#")) {
			currentComment = trimmedLine.slice(1).trim();
		} else if (trimmedLine.startsWith("DATABASE_URL")) {
			const [key, value] = trimmedLine.split("=").map((part) => part.trim());
			dbConnections.set(currentComment || key, value);
		}
	}

	return dbConnections;
}

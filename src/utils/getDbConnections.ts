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
		} else if (/^DATABASE_URL[_=]/.test(trimmedLine)) {
			const [key, value] = trimmedLine.split("=").map((part) => part.trim());
			let identifier = currentComment;
			if (currentComment === "") {
				identifier =
					key.split("_").slice(2).join("_").toLowerCase() || "unknown";
			}
			dbConnections.set(identifier, value);
			currentComment = "";
		}
	}
	return dbConnections;
}

import { readFileSync } from "node:fs";

export function getDbConnectionsFromEnv(): Map<string, string> {
	const envFilePath = ".env";
	const dbConnections = new Map<string, string>();

	const lines = readFileSync(envFilePath, "utf-8").split("\n");
	let currentComment = "";

	for (const line of lines) {
		const trimmedLine = line.trim();

		// Si c'est un commentaire, on le garde pour la prochaine variable
		if (trimmedLine.startsWith("#")) {
			currentComment = trimmedLine.slice(1).trim(); // Retirer le "#"
		}
		// Si c'est une ligne de variable d'environnement qui commence par "DB_", on l'associe au commentaire
		else if (trimmedLine.startsWith("DATABASE_URL")) {
			const [key, value] = trimmedLine.split("=").map((part) => part.trim());
			dbConnections.set(currentComment || key, value); // Si pas de commentaire, utiliser le nom de la clé
		}
	}

	return dbConnections;
}

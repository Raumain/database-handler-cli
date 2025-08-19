#!/usr/bin/env ts-node

import inquirer from "inquirer";
import { database } from "src/database";
import { dropAllTables } from "src/features/drop";
import { dump } from "src/features/dump";
import { truncateTables } from "src/features/empty";
import { importDump } from "src/features/import";
import { listTablesWithSize } from "src/features/list";
import { getDbConnectionsFromEnv } from "src/utils/getDbConnections";

// Fonction pour demander à l'utilisateur de choisir une base de données
async function chooseDatabase() {
	const dbConnections = getDbConnectionsFromEnv();

	if (dbConnections.size === 0) {
		console.log(
			"❌ Aucune connexion de base de données trouvée dans le fichier .env.",
		);
		process.exit(1);
	}

	const { selectedDb } = await inquirer.prompt([
		{
			type: "list",
			name: "selectedDb",
			message: "Sélectionnez la base de données à utiliser :",
			choices: Array.from(dbConnections.keys()).map((dbKey) => ({
				name: dbKey,
				value: dbKey,
			})),
		},
	]);

	// Charger la chaîne de connexion choisie
	const dbUrl = dbConnections.get(selectedDb);
	if (!dbUrl) {
		console.error("❌ Erreur : chaîne de connexion non valide.");
		process.exit(1);
	}

	// Retourner l'objet de base de données configurée
	const db = database(dbUrl);
	console.log(`✅ Connexion à la base de données : ${selectedDb}`);
	return { selectedDb, db };
}

async function main() {
	// Sélectionner une base de données au départ
	let { selectedDb, db } = await chooseDatabase();

	// Initialiser le cycle de la CLI
	while (true) {
		// Afficher les actions disponibles
		const { action } = await inquirer.prompt([
			{
				type: "list",
				name: "action",
				message: "📋 Que veux-tu faire ?",
				choices: [
					{ name: "📤 Dumper la base vers un fichier SQL", value: "dump" },
					{ name: "🧨 Supprimer toutes les tables (DROP)", value: "drop" },
					{ name: "🧹 Vider les données (TRUNCATE)", value: "truncate" },
					{ name: "📊 Lister les tables avec leur taille", value: "list" },
					{ name: "📥 Importer un dump SQL existant", value: "import" },
					{ name: "🔄 Changer de base de données", value: "changeDb" },
					{ name: "❌ Quitter", value: "exit" },
				],
			},
		]);

		try {
			switch (action) {
				case "dump":
					await dump(db, selectedDb);
					break;
				case "drop":
					await dropAllTables(db);
					break;
				case "truncate":
					await truncateTables(db);
					break;
				case "list":
					await listTablesWithSize(db);
					break;
				case "import":
					await importDump(db);
					break;
				case "changeDb":
					// Changer de base de données
					console.log("🔑 Choix d'une nouvelle base de données...");
					({ selectedDb, db } = await chooseDatabase());
					break;
				default:
					process.exit(0);
			}
		} catch (err) {
			console.error("❌ Fatal error:", err);
			process.exit(1);
		}
	}
}

main();

import inquirer from "inquirer";
import { type Kysely, sql } from "kysely";

// Fonction pour récupérer toutes les tables
async function getAllTableNames(
	db: Kysely<Record<string, unknown>>,
): Promise<string[]> {
	const result = await sql<{ table_name: string }>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `.execute(db);

	return result.rows.map((r) => r.table_name);
}

// Fonction principale pour vider les tables
export async function truncateTables(db: Kysely<Record<string, unknown>>) {
	// Récupérer toutes les tables
	const tables = await getAllTableNames(db);

	if (tables.length === 0) {
		console.log("ℹ️ Aucune table trouvée dans le schéma public.");
		return;
	}

	// Demander à l'utilisateur de choisir les tables
	const { selectedTables } = await inquirer.prompt([
		{
			type: "checkbox",
			name: "selectedTables",
			message:
				"Choisissez les tables à vider (utilisez la barre d'espace pour sélectionner plusieurs tables) :",
			choices: [
				{ name: "Tout sélectionner", value: "all" },
				...tables.map((t) => ({ name: t, value: t })),
			],
		},
	]);

	// Si l'utilisateur choisit "Tout sélectionner"
	const tablesToTruncate = (selectedTables as Array<string>).includes("all")
		? tables
		: (selectedTables as Array<string>);

	if (tablesToTruncate.length === 0) {
		console.log("ℹ️ Aucune table sélectionnée.");
		return;
	}

	// Échapper les noms des tables
	const tableList = tablesToTruncate.map((t) => `"${t}"`).join(", ");

	try {
		console.log("🧨 Vidage des tables en cours (avec CASCADE)...");

		// Exécuter la commande TRUNCATE
		await sql
			.raw(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`)
			.execute(db);

		console.log(
			`✅ Les tables ${tablesToTruncate.join(", ")} ont été vidées avec succès (y compris cycles & FK). \n`,
		);
	} catch (e) {
		console.error("❌ Erreur lors du TRUNCATE :", e);
		process.exit(1);
	}
}

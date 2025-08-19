import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import inquirer from "inquirer";
import { type Kysely, sql } from "kysely";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, "..", "./backups");

// Fonction récursive pour obtenir tous les fichiers .sql dans les sous-dossiers
async function getAvailableDumps(dir: string): Promise<string[]> {
	const files = await fs.readdir(dir, { withFileTypes: true });
	let dumps: string[] = [];

	for (const file of files) {
		const filePath = path.join(dir, file.name);
		if (file.isDirectory()) {
			// Si c'est un dossier, on appelle récursivement la fonction pour ce dossier
			const subDumps = await getAvailableDumps(filePath);
			dumps = [
				...dumps,
				...subDumps.map((subDump) => `${file.name}/${subDump}`),
			];
		} else if (file.name.endsWith(".sql")) {
			// Si c'est un fichier .sql, on l'ajoute à la liste
			dumps.push(file.name);
		}
	}

	return dumps;
}

export async function importDump(db: Kysely<Record<string, unknown>>) {
	try {
		// Liste les fichiers SQL disponibles dans le dossier "backups" et ses sous-dossiers
		const dumps = await getAvailableDumps(BACKUPS_DIR);

		if (dumps.length === 0) {
			console.log(
				chalk.red("❌ Aucun fichier dump trouvé dans le dossier backups."),
			);
			return;
		}

		// Demande à l'utilisateur de choisir un fichier parmi ceux disponibles
		const { selectedDump } = await inquirer.prompt([
			{
				type: "list",
				name: "selectedDump",
				message: "Choisissez le fichier dump à importer",
				choices: dumps,
			},
		]);

		const dumpPath = path.resolve(BACKUPS_DIR, selectedDump);
		const dump = Bun.file(dumpPath);

		console.log(chalk.gray(`📥 Import du fichier : ${dumpPath}...`));

		// ⚠️ Séparer les commandes SQL
		const statements = (await dump.text())
			.split(/;\s*\n/)
			.map((stmt) => stmt.trim())
			.filter(Boolean);

		// Exécute les requêtes SQL dans une transaction pour pouvoir rollback en cas d'échec
		await db.transaction().execute(async (trx) => {
			for (const stmt of statements) {
				try {
					await trx.executeQuery(sql.raw(stmt).compile(trx));
				} catch (err) {
					console.error(chalk.red(`❌ Erreur à : ${stmt.slice(0, 80)}...`));
					throw err; // rollback automatique
				}
			}
		});

		console.log(chalk.green("✅ Dump importé avec succès via Kysely."));
	} catch (err) {
		console.error(chalk.red("❌ Import échoué :"), err);
	}
}

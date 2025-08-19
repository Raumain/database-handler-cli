import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import inquirer from "inquirer";
import { type Kysely, sql } from "kysely";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, "..", "./backups");

async function getAvailableDumps(dir: string): Promise<string[]> {
	const files = await fs.readdir(dir, { withFileTypes: true });
	let dumps: string[] = [];

	for (const file of files) {
		const filePath = path.join(dir, file.name);
		if (file.isDirectory()) {
			const subDumps = await getAvailableDumps(filePath);
			dumps = [
				...dumps,
				...subDumps.map((subDump) => `${file.name}/${subDump}`),
			];
		} else if (file.name.endsWith(".sql")) {
			dumps.push(file.name);
		}
	}

	return dumps;
}

export async function importDump(db: Kysely<Record<string, unknown>>) {
	try {
		const dumps = await getAvailableDumps(BACKUPS_DIR);

		if (dumps.length === 0) {
			console.log(
				chalk.red("❌ No dump file found in the backups folder."),
			);
			return;
		}

		const { selectedDump } = await inquirer.prompt([
			{
				type: "list",
				name: "selectedDump",
				message: "Choose the dump file to import",
				choices: dumps,
			},
		]);

		const dumpPath = path.resolve(BACKUPS_DIR, selectedDump);
		const dump = Bun.file(dumpPath);

		console.log(chalk.gray(`📥 Importing file: ${dumpPath}...`));

		const statements = (await dump.text())
			.split(/;\s*\n/)
			.map((stmt) => stmt.trim())
			.filter(Boolean);

		await db.transaction().execute(async (trx) => {
			for (const stmt of statements) {
				try {
					await trx.executeQuery(sql.raw(stmt).compile(trx));
				} catch (err) {
					console.error(chalk.red(`❌ Error at: ${stmt.slice(0, 80)}...`));
					throw err;
				}
			}
		});

		console.log(chalk.green("✅ Dump successfully imported via Kysely."));
	} catch (err) {
		console.error(chalk.red("❌ Import failed:"), err);
	}
}

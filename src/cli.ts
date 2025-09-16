#!/usr/bin/env node

import inquirer from "inquirer";
import { database } from "./database.js";
import { dropAllTables } from "./features/drop.js";
import { dump } from "./features/dump.js";
import { truncateTables } from "./features/empty.js";
import { importDump } from "./features/import.js";
import { listTablesWithSize } from "./features/list.js";
import { getDbConnectionsFromEnv } from "./utils/getDbConnections.js";

async function chooseDatabase() {
  const dbConnections = getDbConnectionsFromEnv();

  if (dbConnections.size === 0) {
    console.log(
      "❌ No database connection found in the .env file.",
    );
    process.exit(1);
  }

  const { selectedDb } = await inquirer.prompt([
    {
      type: "list",
      name: "selectedDb",
      message: "Select the database to use:",
      choices: Array.from(dbConnections.keys()).map((dbKey) => ({
        name: dbKey,
        value: dbKey,
      })),
    },
  ]);

  const dbUrl = dbConnections.get(selectedDb);
  if (!dbUrl) {
    console.error("❌ Error: Invalid connection string.");
    process.exit(1);
  }

  const db = database(dbUrl);
  console.log(`✅ Connected to database: ${selectedDb}`);
  return { selectedDb, db };
}

async function main() {
  let { selectedDb, db } = await chooseDatabase();

  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "📋 What do you want to do?",
        choices: [
          { name: "📤 Dump the database to a SQL file", value: "dump" },
          { name: "🧨 Drop all tables (DROP)", value: "drop" },
          { name: "🧹 Truncate all data (TRUNCATE)", value: "truncate" },
          { name: "📊 List tables with their size", value: "list" },
          { name: "📥 Import an existing SQL dump", value: "import" },
          { name: "🔄 Change database", value: "changeDb" },
          { name: "❌ Exit", value: "exit" },
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
          console.log("🔑 Choosing a new database...");
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

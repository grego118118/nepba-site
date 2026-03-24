import { neon } from "@neondatabase/serverless";
import fs from "node:fs";

async function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  try {
    const envFile = fs.readFileSync(".env.local", "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      if (trimmed.startsWith("DATABASE_URL=")) {
        const raw = trimmed.slice("DATABASE_URL=".length).trim();
        const value = raw.replace(/^['"]|['"]$/g, "");
        process.env.DATABASE_URL = value;
        return value;
      }
    }
  } catch {
    // ignore, will error below if still missing
  }

  throw new Error("DATABASE_URL is not set (and could not be loaded from .env.local)");
}

async function main() {
  const connectionString = await getConnectionString();
  const sql = neon(connectionString);

  const columns = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'grievances'
    ORDER BY ordinal_position
  `;

  console.log("grievances columns:\n", columns);
}

main().catch((error) => {
  console.error("Error inspecting grievances table:", error);
  process.exit(1);
});


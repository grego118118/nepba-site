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

  const rows = await sql`
    SELECT id, user_id, status, document_name, document_type, document_size, created_at
    FROM grievances
    ORDER BY created_at DESC NULLS LAST
    LIMIT 10
  `;

  console.log("Recent grievances:");
  console.log(rows);
}

main().catch((error) => {
  console.error("Error inspecting recent grievances:", error);
  process.exit(1);
});


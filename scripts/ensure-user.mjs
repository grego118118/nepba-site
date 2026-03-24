import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import fs from "node:fs";

const email = "go@umass.edu";
const password = "Umpd11811*";

async function main() {
	let connectionString = process.env.DATABASE_URL;
	if (!connectionString) {
		try {
			const envFile = fs.readFileSync(".env.local", "utf8");
			for (const line of envFile.split(/\r?\n/)) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				if (trimmed.startsWith("DATABASE_URL=")) {
					const raw = trimmed.slice("DATABASE_URL=".length).trim();
					const value = raw.replace(/^['"]|['"]$/g, "");
					connectionString = value;
					process.env.DATABASE_URL = value;
					break;
				}
			}
		} catch {
			// ignore, will error below if still missing
		}
	}

	if (!connectionString) {
		console.error("DATABASE_URL is not set (and could not be loaded from .env.local)");
		process.exit(1);
	}

	const sql = neon(connectionString);

  const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) {
    console.log(`User with email ${email} already exists with id`, existing[0].id);
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  const created = await sql`
    INSERT INTO users (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING id, email
  `;

  console.log("Created user:", { id: created[0].id, email: created[0].email });
}

main().catch((error) => {
  console.error("Error ensuring user:", error);
  process.exit(1);
});

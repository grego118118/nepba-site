import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

function getDatabaseUrl() {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

	const candidates = [".env.local", ".env"];
	for (const file of candidates) {
		const fullPath = path.join(process.cwd(), file);
		if (!fs.existsSync(fullPath)) continue;
		const content = fs.readFileSync(fullPath, "utf8");
		for (const line of content.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith("#")) continue;
			if (trimmed.startsWith("DATABASE_URL=")) {
				const raw = trimmed.slice("DATABASE_URL=".length).trim();
				const value = raw.replace(/^['"]|['"]$/g, "");
				process.env.DATABASE_URL = value;
				return value;
			}
		}
	}

	throw new Error(
		"DATABASE_URL is not set. Add it to your environment or .env/.env.local file.",
	);
}

const databaseUrl = getDatabaseUrl();

export default defineConfig({
	schema: "./src/lib/db.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl,
	},
});


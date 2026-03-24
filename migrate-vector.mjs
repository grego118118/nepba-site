import { neon } from "@neondatabase/serverless";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' }); // Fallback

async function runMigration() {
  console.log("Starting Neon Postgres Vector Migration...");
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment variables");
  }

  const sql = neon(connectionString);

  try {
    console.log("Ensure vector extension exists...");
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;

    console.log("Ensure email_embeddings table exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS "email_embeddings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "subject" text,
        "body" text,
        "metadata" jsonb,
        "embedding" vector(1536),
        "created_at" timestamp with time zone DEFAULT now()
      );
    `;

    console.log("Ensure email_embedding_idx index exists...");
    await sql`
      CREATE INDEX IF NOT EXISTS "email_embedding_idx" 
      ON "email_embeddings" USING hnsw ("embedding" vector_cosine_ops);
    `;

    console.log("Vector migration successfully completed!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();

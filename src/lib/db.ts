import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  bigserial,
  integer,
  primaryKey,
  uniqueIndex,
  customType,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(connectionString);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  badgeNumber: text("badge_number").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  targetRetirementDate: timestamp("target_retirement_date", {
    withTimezone: true,
  }),
  retirementGroup: text("retirement_group"),
  hireDate: timestamp("hire_date", { withTimezone: true }),
  averageSalary: integer("average_salary"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

const bytea = customType<{ data: Uint8Array; notNull: false; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const grievances = pgTable("grievances", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("Step 1"),
  outcome: text("outcome"),
  documentName: text("document_name").notNull(),
  documentType: text("document_type").notNull(),
  documentSize: integer("document_size").notNull(),
  documentData: bytea("document_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" }), // nullable if shift might not be linked to user immediately
  date: text("date").notNull(),
  day: text("day").notNull(),
  shift: text("shift").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  attendance: text("attendance").notNull(),
  duty: text("duty").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const emailEmbeddings = pgTable(
  "email_embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subject: text("subject"),
    body: text("body"),
    metadata: jsonb("metadata"), // to store original date, from, to, etc.
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("email_embedding_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: integer("expires_at"),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_provider_account_id_unique").on(
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.identifier, table.token],
      name: "verification_tokens_pkey",
    }),
  ]
);

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  grievances: many(grievances),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const grievancesRelations = relations(grievances, ({ one }) => ({
  user: one(users, {
    fields: [grievances.userId],
    references: [users.id],
  }),
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
  user: one(users, {
    fields: [shifts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// Drizzle relational queries (db.query.* with `with: { ... }`) require both
// tables and their `relations(...)` objects to be included in the schema.
// This allows Drizzle to resolve referenced tables correctly at runtime.
export const schema = {
  users,
  profiles,
  sessions,
  grievances,
  shifts,
  accounts,
  verificationTokens,
  emailEmbeddings,
  usersRelations,
  profilesRelations,
  grievancesRelations,
  shiftsRelations,
  sessionsRelations,
  accountsRelations,
} as const;

export const db = drizzle(sql, { schema });

export type DbClient = typeof db;

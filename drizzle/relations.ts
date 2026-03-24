import { relations } from "drizzle-orm/relations";
import { users, profiles, sessions, accounts, grievances } from "./schema";

export const profilesRelations = relations(profiles, ({one}) => ({
	user: one(users, {
		fields: [profiles.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	profiles: many(profiles),
	sessions: many(sessions),
	accounts: many(accounts),
	grievances: many(grievances),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const accountsRelations = relations(accounts, ({one}) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	}),
}));

export const grievancesRelations = relations(grievances, ({one}) => ({
	user: one(users, {
		fields: [grievances.userId],
		references: [users.id]
	}),
}));
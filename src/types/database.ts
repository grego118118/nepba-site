import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { grievances, profiles, sessions, users } from "@/lib/db";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;

export type Grievance = InferSelectModel<typeof grievances>;
export type NewGrievance = InferInsertModel<typeof grievances>;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}


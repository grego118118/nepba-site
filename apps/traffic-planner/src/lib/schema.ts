import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["admin", "supervisor"]);
export const planStatus = pgEnum("plan_status", ["draft", "published", "archived"]);
export const trafficPhase = pgEnum("traffic_phase", ["incoming", "outgoing", "both"]);
export const eventType = pgEnum("event_type", [
  "commencement",
  "football",
  "mullins",
  "other",
]);
export const mapFeatureType = pgEnum("map_feature_type", [
  "flow_arrow",
  "road_closure",
  "parking_lot",
  "parking_entrance",
  "pedestrian_crossing",
  "crowd_zone",
  "barricade",
  "cone_line",
  "dropoff_zone",
  "vip_zone",
  "ada_zone",
  "bus_route",
  "bus_stop",
]);

export const departments = pgTable("departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  defaultCenterLng: doublePrecision("default_center_lng").notNull().default(-72.5267),
  defaultCenterLat: doublePrecision("default_center_lat").notNull().default(42.3868),
  defaultZoom: doublePrecision("default_zoom").notNull().default(15),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    role: userRole("role").notNull().default("supervisor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export const officers = pgTable(
  "officers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    badgeNumber: varchar("badge_number", { length: 32 }).notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    rank: varchar("rank", { length: 64 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 32 }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("officers_dept_badge_unique").on(t.departmentId, t.badgeNumber),
    index("officers_dept_idx").on(t.departmentId),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    eventType: eventType("event_type").notNull().default("other"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_dept_idx").on(t.departmentId)],
);

export const eventTemplates = pgTable(
  "event_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    eventType: eventType("event_type").notNull().default("other"),
    snapshot: jsonb("snapshot").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("event_templates_dept_idx").on(t.departmentId)],
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").references(() => eventTemplates.id, {
      onDelete: "set null",
    }),
    status: planStatus("status").notNull().default("draft"),
    currentPhase: trafficPhase("current_phase").notNull().default("incoming"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
    mapCenterLng: doublePrecision("map_center_lng"),
    mapCenterLat: doublePrecision("map_center_lat"),
    mapZoom: doublePrecision("map_zoom"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("plans_event_idx").on(t.eventId)],
);

export const planVersions = pgTable(
  "plan_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    changeSummary: text("change_summary"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("plan_versions_plan_version_unique").on(t.planId, t.versionNumber),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 100 }).notNull(),
    dutyDescription: text("duty_description"),
    phase: trafficPhase("phase").notNull().default("both"),
    lng: doublePrecision("lng").notNull(),
    lat: doublePrecision("lat").notNull(),
    photoUrl: text("photo_url"),
    equipment: text("equipment"),
    shiftStart: timestamp("shift_start", { withTimezone: true }),
    shiftEnd: timestamp("shift_end", { withTimezone: true }),
    radioChannel: varchar("radio_channel", { length: 64 }),
    supervisorContact: varchar("supervisor_contact", { length: 200 }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_plan_idx").on(t.planId)],
);

export const postAssignments = pgTable(
  "post_assignments",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    officerId: uuid("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid("assigned_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    primaryKey({ columns: [t.postId, t.officerId] }),
    index("post_assignments_officer_idx").on(t.officerId),
  ],
);

export const mapFeatures = pgTable(
  "map_features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    featureType: mapFeatureType("feature_type").notNull(),
    phase: trafficPhase("phase").notNull().default("both"),
    label: varchar("label", { length: 200 }),
    geometry: jsonb("geometry").notNull(),
    properties: jsonb("properties").notNull().default(sql`'{}'::jsonb`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("map_features_plan_idx").on(t.planId),
    index("map_features_plan_phase_idx").on(t.planId, t.phase),
  ],
);

export const magicLinkTokens = pgTable(
  "magic_link_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    officerId: uuid("officer_id")
      .notNull()
      .references(() => officers.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("magic_link_tokens_hash_unique").on(t.tokenHash),
    index("magic_link_tokens_officer_idx").on(t.officerId),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "cascade",
    }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 64 }),
    targetId: varchar("target_id", { length: 64 }),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_dept_idx").on(t.departmentId)],
);

export type Department = typeof departments.$inferSelect;
export type User = typeof users.$inferSelect;
export type Officer = typeof officers.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostAssignment = typeof postAssignments.$inferSelect;
export type MapFeature = typeof mapFeatures.$inferSelect;
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;

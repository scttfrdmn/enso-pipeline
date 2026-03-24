import {
  pgTable,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

export const activityLog = pgTable("activity_log", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull(),
  userEmail: text("user_email").notNull(),
  action: text("action").notNull(), // "created" | "updated" | "deleted"
  field: text("field"), // field name for "updated" actions
  oldValue: text("old_value"),
  newValue: text("new_value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ActivityLogEntry = typeof activityLog.$inferSelect;

export const stageEnum = pgEnum("stage", [
  "Sparks",
  "Evaluating",
  "Reaching Out",
  "In Conversation",
  "Proposal",
  "Won",
  "Lost",
  "Retired",
]);

export const companyTypeEnum = pgEnum("company_type", [
  "Startup",
  "Scale-up",
  "Enterprise",
  "NGO",
  "Foundation",
  "Government",
  "Coalition",
  "Other",
]);

export const opportunities = pgTable("opportunities", {
  id: text("id").primaryKey(),
  companyName: text("company_name").notNull(),
  companyType: companyTypeEnum("company_type").default("Other"),
  stage: stageEnum("stage").default("Sparks").notNull(),
  sector: text("sector"),
  sponsor: text("sponsor"),

  // From Signal Scout
  scoutSummary: text("scout_summary"),
  decisionMaker: text("decision_maker"),
  source: text("source"),
  entrySource: text("entry_source").default("Manual").notNull(),

  // Team notes
  researchNotes: text("research_notes"),
  linkedinConnections: text("linkedin_connections"),
  swarmNotes: text("swarm_notes"),
  nextActions: jsonb("next_actions").$type<NextAction[]>().default([]).notNull(),

  stageEnteredAt: timestamp("stage_entered_at").defaultNow(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;

export type NextAction = {
  id: string;
  action: string;
  owner: string;
  completedAt?: string;
  dueAt?: string; // ISO date string e.g. "2026-04-15"
};

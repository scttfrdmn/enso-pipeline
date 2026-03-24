import {
  pgTable,
  text,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

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
};

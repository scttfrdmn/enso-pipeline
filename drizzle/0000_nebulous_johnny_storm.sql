CREATE TYPE "public"."company_type" AS ENUM('Startup', 'Scale-up', 'Enterprise', 'NGO', 'Foundation', 'Government', 'Coalition', 'Other');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('Sparks', 'Evaluating', 'Reaching Out', 'In Conversation', 'Proposal', 'Won', 'Lost', 'Retired');--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"company_name" text NOT NULL,
	"company_type" "company_type" DEFAULT 'Other',
	"stage" "stage" DEFAULT 'Sparks' NOT NULL,
	"sector" text,
	"sponsor" text,
	"scout_summary" text,
	"decision_maker" text,
	"source" text,
	"entry_source" text DEFAULT 'Manual' NOT NULL,
	"research_notes" text,
	"linkedin_connections" text,
	"swarm_notes" text,
	"next_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

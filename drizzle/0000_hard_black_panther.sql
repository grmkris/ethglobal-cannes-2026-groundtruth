CREATE TYPE "public"."event_category" AS ENUM('conflict', 'natural-disaster', 'politics', 'economics', 'health', 'technology', 'environment', 'social');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "world_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "event_category" NOT NULL,
	"severity" "severity_level" NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"location" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TYPE "public"."event_category" AS ENUM('conflict', 'natural-disaster', 'politics', 'economics', 'health', 'technology', 'environment', 'social');--> statement-breakpoint
CREATE TYPE "public"."severity_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_profile" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_wallet_id" uuid NOT NULL,
	"ens_name" text NOT NULL,
	"label" text NOT NULL,
	"parent_ens_name" text NOT NULL,
	"mandate" text NOT NULL,
	"sources" text NOT NULL,
	"erc8004_agent_id" text,
	"registration_step" integer DEFAULT 0 NOT NULL,
	"wallet_link_signature" text,
	"wallet_link_deadline" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_wallet" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_wallet_address_unique" UNIQUE("address")
);
--> statement-breakpoint
CREATE TABLE "agentkit_nonce" (
	"nonce" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentkit_usage" (
	"endpoint" text NOT NULL,
	"human_id" text NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"world_id_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wallet_address" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"chain_id" text NOT NULL,
	"is_primary" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "world_id_verification" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nullifier_hash" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "world_id_verification_nullifier_hash_unique" UNIQUE("nullifier_hash")
);
--> statement-breakpoint
CREATE TABLE "event_dispute" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"justification" text,
	"tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"user_id" uuid NOT NULL,
	"agent_address" text,
	"agent_ens_name" text,
	"erc8004_agent_id" text,
	"on_chain_verified" boolean DEFAULT false NOT NULL,
	"canonical_event_id" uuid,
	"corroboration_count" integer DEFAULT 0 NOT NULL,
	"dispute_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message" (
	"id" uuid PRIMARY KEY NOT NULL,
	"event_id" uuid,
	"user_id" uuid NOT NULL,
	"author_name" text NOT NULL,
	"content" text NOT NULL,
	"agent_address" text,
	"agent_ens_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_agent_wallet_id_agent_wallet_id_fk" FOREIGN KEY ("agent_wallet_id") REFERENCES "public"."agent_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_wallet" ADD CONSTRAINT "agent_wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD CONSTRAINT "wallet_address_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_id_verification" ADD CONSTRAINT "world_id_verification_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_dispute" ADD CONSTRAINT "event_dispute_event_id_world_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_dispute" ADD CONSTRAINT "event_dispute_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "world_event" ADD CONSTRAINT "world_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_event_id_world_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."world_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agentProfile_userId_idx" ON "agent_profile" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agentProfile_ensName_idx" ON "agent_profile" USING btree ("ens_name");--> statement-breakpoint
CREATE INDEX "agentWallet_userId_idx" ON "agent_wallet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agentkitUsage_lookup_idx" ON "agentkit_usage" USING btree ("human_id","endpoint");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "walletAddress_userId_idx" ON "wallet_address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "walletAddress_address_idx" ON "wallet_address" USING btree ("address");--> statement-breakpoint
CREATE INDEX "eventDispute_eventId_idx" ON "event_dispute" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "eventDispute_userId_idx" ON "event_dispute" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "worldEvent_userId_idx" ON "world_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "worldEvent_category_idx" ON "world_event" USING btree ("category");--> statement-breakpoint
CREATE INDEX "worldEvent_timestamp_idx" ON "world_event" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "chat_message_event_created_idx" ON "chat_message" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_message_userId_idx" ON "chat_message" USING btree ("user_id");
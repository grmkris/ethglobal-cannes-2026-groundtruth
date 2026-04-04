DROP INDEX "agentProfile_ensName_idx";--> statement-breakpoint
ALTER TABLE "world_event" ADD COLUMN "agent_ens_name" text;--> statement-breakpoint
ALTER TABLE "world_event" ADD COLUMN "on_chain_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "agentProfile_ensName_idx" ON "agent_profile" USING btree ("ens_name");
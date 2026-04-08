CREATE TABLE "eas_attestation" (
	"uid" varchar(66) PRIMARY KEY NOT NULL,
	"schema_uid" varchar(66) NOT NULL,
	"schema_name" text NOT NULL,
	"attester" varchar(42) NOT NULL,
	"recipient" varchar(42) NOT NULL,
	"chain" integer DEFAULT 0 NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" text NOT NULL,
	"schema_data" jsonb NOT NULL,
	"raw_data" text NOT NULL,
	"signature" text,
	"eip712_domain" jsonb,
	"attestation_time" bigint NOT NULL,
	"expiration_time" bigint DEFAULT 0 NOT NULL,
	"revocable" boolean NOT NULL,
	"ref_uid" varchar(66) NOT NULL,
	"tx_hash" varchar(66),
	"block_number" bigint,
	"promoted_at" timestamp with time zone,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_tx_hash" varchar(66),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "agentkitUsage_lookup_idx";--> statement-breakpoint
ALTER TABLE "agentkit_usage" ADD CONSTRAINT "agentkit_usage_human_id_endpoint_window_start_pk" PRIMARY KEY("human_id","endpoint","window_start");--> statement-breakpoint
ALTER TABLE "event_dispute" ADD COLUMN "attestation_uid" varchar(66);--> statement-breakpoint
ALTER TABLE "chat_message" ADD COLUMN "country_iso3" varchar(3);--> statement-breakpoint
CREATE INDEX "eas_attestation_schema_ref_idx" ON "eas_attestation" USING btree ("schema_uid","ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "eas_attestation_attester_idx" ON "eas_attestation" USING btree ("attester");--> statement-breakpoint
CREATE INDEX "eas_attestation_ref_idx" ON "eas_attestation" USING btree ("ref_type","ref_id");--> statement-breakpoint
ALTER TABLE "world_event" ADD CONSTRAINT "world_event_canonical_event_id_world_event_id_fk" FOREIGN KEY ("canonical_event_id") REFERENCES "public"."world_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_country_created_idx" ON "chat_message" USING btree ("country_iso3","created_at");--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_scope_exclusive" CHECK ("chat_message"."event_id" IS NULL OR "chat_message"."country_iso3" IS NULL);
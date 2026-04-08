DROP INDEX "walletAddress_address_idx";--> statement-breakpoint
ALTER TABLE "world_event" ADD COLUMN "source_claim_uid" varchar(66);--> statement-breakpoint
ALTER TABLE "world_event" ADD CONSTRAINT "world_event_source_claim_uid_eas_attestation_uid_fk" FOREIGN KEY ("source_claim_uid") REFERENCES "public"."eas_attestation"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "walletAddress_address_idx" ON "wallet_address" USING btree ("address");
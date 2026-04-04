DROP INDEX "wallet_userId_idx";--> statement-breakpoint
DROP INDEX "wallet_address_idx";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "account_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "email_verified" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_address" ALTER COLUMN "chain_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "wallet_address" ALTER COLUMN "is_primary" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD COLUMN "chain_namespace" text NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD COLUMN "siwx_message" text;--> statement-breakpoint
ALTER TABLE "wallet_address" ADD COLUMN "siwx_signature" text;--> statement-breakpoint
ALTER TABLE "world_event" ADD COLUMN "image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "world_event" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "world_event" ADD CONSTRAINT "world_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "walletAddress_userId_idx" ON "wallet_address" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "walletAddress_address_idx" ON "wallet_address" USING btree ("address");
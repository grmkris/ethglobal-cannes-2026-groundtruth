CREATE TABLE "agent_wallet" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_wallet_address_unique" UNIQUE("address")
);
--> statement-breakpoint
ALTER TABLE "agent_wallet" ADD CONSTRAINT "agent_wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agentWallet_userId_idx" ON "agent_wallet" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agentWallet_address_idx" ON "agent_wallet" USING btree ("address");
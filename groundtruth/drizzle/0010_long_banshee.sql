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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profile" ADD CONSTRAINT "agent_profile_agent_wallet_id_agent_wallet_id_fk" FOREIGN KEY ("agent_wallet_id") REFERENCES "public"."agent_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agentProfile_userId_idx" ON "agent_profile" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "agentProfile_ensName_idx" ON "agent_profile" USING btree ("ens_name");
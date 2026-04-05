CREATE TABLE "payment_ledger" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payer_address" text NOT NULL,
	"route" text NOT NULL,
	"amount_usd" text NOT NULL,
	"network" text,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agentkit_usage" ADD COLUMN "window_start" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "paymentLedger_payer_idx" ON "payment_ledger" USING btree ("payer_address");--> statement-breakpoint
CREATE INDEX "paymentLedger_category_idx" ON "payment_ledger" USING btree ("category");
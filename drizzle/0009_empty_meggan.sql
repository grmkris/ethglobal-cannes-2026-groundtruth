DROP INDEX "agentWallet_address_idx";--> statement-breakpoint
CREATE INDEX "worldEvent_userId_idx" ON "world_event" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "worldEvent_category_idx" ON "world_event" USING btree ("category");--> statement-breakpoint
CREATE INDEX "worldEvent_timestamp_idx" ON "world_event" USING btree ("timestamp");
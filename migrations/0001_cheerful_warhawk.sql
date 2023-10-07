ALTER TABLE "spaces" ADD COLUMN "owner" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spaces" ADD CONSTRAINT "spaces_owner_users_id_fk" FOREIGN KEY ("owner") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

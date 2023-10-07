ALTER TABLE "spaces" RENAME COLUMN "owner" TO "ownerId";--> statement-breakpoint
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_owner_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spaces" ADD CONSTRAINT "spaces_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

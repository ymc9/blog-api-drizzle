ALTER TABLE "posts" DROP CONSTRAINT "posts_spaceId_spaces_id_fk";
--> statement-breakpoint
ALTER TABLE "spaceUsers" DROP CONSTRAINT "spaceUsers_spaceId_spaces_id_fk";
--> statement-breakpoint
ALTER TABLE "spaces" DROP CONSTRAINT "spaces_ownerId_users_id_fk";
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_spaceId_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spaceUsers" ADD CONSTRAINT "spaceUsers_spaceId_spaces_id_fk" FOREIGN KEY ("spaceId") REFERENCES "spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spaces" ADD CONSTRAINT "spaces_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

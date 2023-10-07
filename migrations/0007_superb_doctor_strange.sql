ALTER TYPE "SpaceUserRole"
ADD
    VALUE 'MEMBER';

--> statement-breakpoint
COMMIT;

ALTER TABLE
    "spaceUsers"
ALTER COLUMN
    "role"
SET
    DEFAULT 'MEMBER';
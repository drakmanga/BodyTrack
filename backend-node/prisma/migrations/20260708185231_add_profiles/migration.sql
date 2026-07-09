-- Introduces multi-profile support: a "profiles" table sits between accounts (users) and their
-- data (metric_definitions, measurements, progress_photos). Every existing user gets exactly one
-- primary profile carrying their current height/wrist/unit-system, and all their existing rows
-- are re-pointed at that profile. Nothing is deleted at the data level, only re-owned.

-- 1. New profiles table
CREATE TABLE "profiles" (
    "id" BIGSERIAL NOT NULL,
    "account_id" BIGINT NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "height_cm" DECIMAL(5,2),
    "wrist_cm" DECIMAL(5,2),
    "unit_system" VARCHAR(20) NOT NULL DEFAULT 'METRIC',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_profiles_account" ON "profiles"("account_id");

ALTER TABLE "profiles" ADD CONSTRAINT "profiles_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. One primary profile per existing account, carrying over their anthropometric data
INSERT INTO "profiles" ("account_id", "display_name", "is_primary", "height_cm", "wrist_cm", "unit_system")
SELECT "id", "username", true, "height_cm", "wrist_cm", "unit_system" FROM "users";

-- At most one primary profile per account, enforced at the DB level (Prisma can't express
-- partial unique indexes in the schema itself).
CREATE UNIQUE INDEX "uq_profiles_one_primary" ON "profiles"("account_id") WHERE "is_primary";

-- 3. Add profile_id (nullable for now) to every table currently owned by user_id
ALTER TABLE "metric_definitions" ADD COLUMN "profile_id" BIGINT;
ALTER TABLE "measurements" ADD COLUMN "profile_id" BIGINT;
ALTER TABLE "progress_photos" ADD COLUMN "profile_id" BIGINT;

-- 4. Backfill profile_id by matching each row's old owning account to that account's new
-- primary profile (every account has exactly one primary profile from step 2).
UPDATE "metric_definitions" md SET "profile_id" = p."id"
    FROM "profiles" p WHERE p."account_id" = md."user_id" AND p."is_primary" = true;

UPDATE "measurements" m SET "profile_id" = p."id"
    FROM "profiles" p WHERE p."account_id" = m."user_id" AND p."is_primary" = true;

UPDATE "progress_photos" pp SET "profile_id" = p."id"
    FROM "profiles" p WHERE p."account_id" = pp."user_id" AND p."is_primary" = true;

-- 4b. Photo files on disk live at "{storageRoot}/{old_user_id}/{uuid}.ext"; rewrite the stored
-- relative path's leading folder to the new profile id so it matches where the accompanying
-- data-migration script (scripts/move-photo-folders.mjs) physically moves the files on disk.
UPDATE "progress_photos" SET "file_path" = regexp_replace("file_path", '^[0-9]+/', "profile_id"::text || '/');

-- 5. Now that every row has an owner, make profile_id mandatory
ALTER TABLE "metric_definitions" ALTER COLUMN "profile_id" SET NOT NULL;
ALTER TABLE "measurements" ALTER COLUMN "profile_id" SET NOT NULL;
ALTER TABLE "progress_photos" ALTER COLUMN "profile_id" SET NOT NULL;

-- 6. Drop the old user_id-based constraints/indexes/columns
ALTER TABLE "measurements" DROP CONSTRAINT "measurements_user_id_fkey";
ALTER TABLE "metric_definitions" DROP CONSTRAINT "metric_definitions_user_id_fkey";
ALTER TABLE "progress_photos" DROP CONSTRAINT "progress_photos_user_id_fkey";

DROP INDEX "idx_measurements_user_date";
ALTER TABLE "measurements" DROP CONSTRAINT "uq_measurements_user_date";
DROP INDEX "idx_metric_definitions_user";
ALTER TABLE "metric_definitions" DROP CONSTRAINT "uq_metric_definitions_user_name";
DROP INDEX "idx_progress_photos_user_date";

ALTER TABLE "measurements" DROP COLUMN "user_id";
ALTER TABLE "metric_definitions" DROP COLUMN "user_id";
ALTER TABLE "progress_photos" DROP COLUMN "user_id";

-- 7. New profile_id-based constraints/indexes matching the target schema
CREATE INDEX "idx_measurements_profile_date" ON "measurements"("profile_id", "measurement_date");
CREATE UNIQUE INDEX "uq_measurements_profile_date" ON "measurements"("profile_id", "measurement_date");

CREATE INDEX "idx_metric_definitions_profile" ON "metric_definitions"("profile_id");
CREATE UNIQUE INDEX "uq_metric_definitions_profile_name" ON "metric_definitions"("profile_id", "name");

CREATE INDEX "idx_progress_photos_profile_date" ON "progress_photos"("profile_id", "photo_date");

ALTER TABLE "metric_definitions" ADD CONSTRAINT "metric_definitions_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Anthropometric data now lives on profiles, not accounts
ALTER TABLE "users" DROP COLUMN "height_cm";
ALTER TABLE "users" DROP COLUMN "wrist_cm";
ALTER TABLE "users" DROP COLUMN "unit_system";

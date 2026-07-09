-- Adds an optional "sex" field to profiles, used together with height/wrist to compute a
-- sex-specific frame size (small/medium/large) and an estimated ideal weight — the feature
-- height/wrist were originally collected for but never actually implemented. Nullable and
-- unset for all existing profiles; nothing here forces a value.
ALTER TABLE "profiles" ADD COLUMN "sex" VARCHAR(10);

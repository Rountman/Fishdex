-- Opt-in: caught and glowing fish for comparing journals. NULL = not published (the default),
-- otherwise {"caught": [ids], "glowing": [ids]}, both sorted.
ALTER TABLE breeders ADD COLUMN catches TEXT;

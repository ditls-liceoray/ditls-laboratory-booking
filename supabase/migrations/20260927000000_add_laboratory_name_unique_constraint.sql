-- =========================================================
-- Phase 4: Laboratory Name Case-Insensitive Unique Constraint
-- Liceo Laboratory Booking System
-- =========================================================
-- Purpose:
--   Add case-insensitive unique constraint on laboratory names.
--   This enables the admin UI's duplicate-name error handling
--   which already expects PostgreSQL error code 23505.
-- =========================================================

-- =========================================================
-- 1. CHECK FOR EXISTING DUPLICATES (SAFETY CHECK)
-- =========================================================
-- This query will fail if duplicates exist, preventing the
-- unique index creation. If duplicates are found, they must
-- be manually resolved before proceeding.
-- =========================================================
DO $$
DECLARE
    duplicate_count integer;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT lower(trim(name)) AS norm_name, COUNT(*) AS cnt
        FROM public.laboratories
        GROUP BY lower(trim(name))
        HAVING COUNT(*) > 1
    ) dups;

    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot create unique index: % duplicate laboratory name(s) found (case-insensitive). Manual resolution required.', duplicate_count;
    END IF;

    RAISE NOTICE 'No duplicate laboratory names found. Proceeding with unique index creation.';
END $$;

-- =========================================================
-- 2. CASE-INSENSITIVE UNIQUE INDEX ON LABORATORY NAMES
-- =========================================================
-- Protects against duplicate laboratory names that differ
-- only by capitalization or surrounding whitespace.
--
-- Examples considered duplicates:
--   Computer Laboratory 1
--   computer laboratory 1
--   COMPUTER LABORATORY 1
--   Computer Laboratory 1
--
-- Applies regardless of is_active status.
-- =========================================================
CREATE UNIQUE INDEX IF NOT EXISTS uq_laboratories_name_lower
ON public.laboratories (lower(trim(name)));

-- =========================================================
-- 3. VERIFICATION (COMMENTED OUT FOR REFERENCE)
-- =========================================================
-- -- Verify the index exists:
-- SELECT
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'laboratories'
--   AND indexname = 'uq_laboratories_name_lower';
--
-- -- Verify no duplicates remain:
-- SELECT
--     lower(trim(name)) AS norm_name,
--     COUNT(*)
-- FROM public.laboratories
-- GROUP BY lower(trim(name))
-- HAVING COUNT(*) > 1;
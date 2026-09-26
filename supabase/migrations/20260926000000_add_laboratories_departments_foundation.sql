-- =========================================================
-- Phase 1: Laboratories & Departments Foundation
-- Liceo Laboratory Booking System
-- =========================================================
--
-- Purpose:
--   1. Add is_active to existing laboratories table
--   2. Create departments master table
--   3. Seed the existing DITLS department
--   4. Add nullable department_id to teachers
--   5. Safely backfill teacher department relationships
--   6. Establish Admin-only write access
--   7. Allow authenticated users to read active records only
--
-- IMPORTANT:
--   - Do NOT recreate laboratories
--   - Do NOT remove laboratories.status
--   - Do NOT modify bookings
--   - Do NOT remove teachers.department
--   - Do NOT modify authentication
--   - Do NOT implement hard DELETE
--   - Do NOT modify UI
-- =========================================================
-- =========================================================
-- 1. LABORATORIES
-- =========================================================
-- Existing table:
-- public.laboratories
--
-- Existing status remains untouched:
--   available
--   maintenance
--   closed
--
-- New meaning:
--   status    = operational condition
--   is_active = master-record availability for new bookings
-- =========================================================
ALTER TABLE
    public.laboratories
ADD
    COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill existing laboratory records.
--
-- available   -> active
-- maintenance -> active
-- closed      -> inactive
--
-- Unknown/unexpected status values are preserved as active
-- rather than disabling existing records unexpectedly.
UPDATE
    public.laboratories
SET
    is_active = CASE
        WHEN status = 'available' THEN true
        WHEN status = 'maintenance' THEN true
        WHEN status = 'closed' THEN false
        ELSE true
    END;

-- Index for active laboratory filtering.
CREATE INDEX IF NOT EXISTS idx_laboratories_is_active ON public.laboratories (is_active);

-- =========================================================
-- 2. DEPARTMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    code text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness.
--
-- Examples considered duplicates:
--   DITLS
--   ditls
--   DITLS
--
-- This protects the database from duplicate department names
-- that differ only by capitalization.
CREATE UNIQUE INDEX IF NOT EXISTS uq_departments_name_lower ON public.departments (lower(name));

-- Index for active department queries.
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments (is_active);

-- Reuse the existing project's updated_at trigger function.
--
-- This assumes public.touch_updated_at() already exists,
-- as verified during inspection.
DROP TRIGGER IF EXISTS trg_departments_touch ON public.departments;

CREATE TRIGGER trg_departments_touch BEFORE
UPDATE
    ON public.departments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- 3. SEED EXISTING DITLS DEPARTMENT
-- =========================================================
INSERT INTO
    public.departments (name, code)
VALUES
    (
        'Laboratory Services Department (LSD)'
    ) ON CONFLICT (lower(name)) DO NOTHING;

-- =========================================================
-- 4. TEACHERS
-- =========================================================
--
-- Keep existing:
--
--   teachers.department
--
-- Do NOT remove or rename it.
--
-- New relationship:
--
--   teachers.department_id
--          ↓
--   departments.id
--
-- Nullable intentionally for safe migration/backfill.
-- =========================================================
ALTER TABLE
    public.teachers
ADD
    COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE
SET
    NULL;

-- Index for relationship lookups.
CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON public.teachers (department_id);

-- =========================================================
-- 5. BACKFILL TEACHER DEPARTMENT RELATIONSHIP
-- =========================================================
--
-- Match existing text department to the new department record.
--
-- Case-insensitive matching is used.
--
-- Existing teachers.department is NOT changed.
-- Existing department_id values are NOT overwritten.
UPDATE
    public.teachers AS t
SET
    department_id = d.id
FROM
    public.departments AS d
WHERE
    t.department_id IS NULL
    AND lower(trim(t.department)) = lower(trim(d.name));

-- =========================================================
-- 6. RLS — LABORATORIES
-- =========================================================
--
-- Intended final behavior:
--
-- ADMIN:
--   SELECT all
--   INSERT
--   UPDATE
--
-- NORMAL AUTHENTICATED USER:
--   SELECT active laboratories only
--   NO INSERT
--   NO UPDATE
--   NO DELETE
--
-- Hard DELETE is intentionally NOT supported.
--
-- IMPORTANT:
-- Existing permissive SELECT/write policies must not remain
-- in a way that bypasses these restrictions.
-- =========================================================
-- Remove the known existing policies that this migration is
-- replacing.
DROP POLICY IF EXISTS "labs_select_all" ON public.laboratories;

DROP POLICY IF EXISTS "labs_select_active_or_admin" ON public.laboratories;

DROP POLICY IF EXISTS "labs_write_admin" ON public.laboratories;

DROP POLICY IF EXISTS "labs_update_admin" ON public.laboratories;

DROP POLICY IF EXISTS "labs_delete_admin" ON public.laboratories;

-- Admin + authenticated active-laboratory SELECT.
--
-- Admins can see all laboratories.
-- Normal authenticated users can see active laboratories only.
CREATE POLICY "labs_select_active_or_admin" ON public.laboratories FOR
SELECT
    TO authenticated USING (
        public.is_admin()
        OR is_active = true
    );

-- Admin INSERT only.
CREATE POLICY "labs_insert_admin" ON public.laboratories FOR
INSERT
    TO authenticated WITH CHECK (public.is_admin());

-- Admin UPDATE only.
CREATE POLICY "labs_update_admin" ON public.laboratories FOR
UPDATE
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- No DELETE policy is intentionally created.
--
-- Laboratories must be deactivated through:
--
--   is_active = false
--
-- Historical bookings remain intact.
-- =========================================================
-- 7. RLS — DEPARTMENTS
-- =========================================================
--
-- Intended final behavior:
--
-- ADMIN:
--   SELECT all
--   INSERT
--   UPDATE
--
-- NORMAL AUTHENTICATED USER:
--   SELECT active departments only
--   NO INSERT
--   NO UPDATE
--   NO DELETE
-- =========================================================
ALTER TABLE
    public.departments ENABLE ROW LEVEL SECURITY;

-- Remove migration-created policies if this migration is
-- inspected/reworked before application.
DROP POLICY IF EXISTS "depts_select_all_admin" ON public.departments;

DROP POLICY IF EXISTS "depts_select_active" ON public.departments;

DROP POLICY IF EXISTS "depts_insert_admin" ON public.departments;

DROP POLICY IF EXISTS "depts_update_admin" ON public.departments;

DROP POLICY IF EXISTS "depts_delete_admin" ON public.departments;

-- Admins can see all departments.
CREATE POLICY "depts_select_all_admin" ON public.departments FOR
SELECT
    TO authenticated USING (public.is_admin());

-- Normal authenticated users can see active departments only.
CREATE POLICY "depts_select_active" ON public.departments FOR
SELECT
    TO authenticated USING (is_active = true);

-- Admin INSERT only.
CREATE POLICY "depts_insert_admin" ON public.departments FOR
INSERT
    TO authenticated WITH CHECK (public.is_admin());

-- Admin UPDATE only.
CREATE POLICY "depts_update_admin" ON public.departments FOR
UPDATE
    TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- No DELETE policy is intentionally created.
--
-- Departments must be deactivated through:
--
--   is_active = false
--
-- This protects historical teacher relationships.
-- =========================================================
-- 8. VERIFICATION QUERIES
-- =========================================================
--
-- These queries are intentionally commented out.
-- They are for manual validation after migration.
-- =========================================================
-- Laboratory status / active-state distribution:
--
-- SELECT
--     status,
--     is_active,
--     count(*)
-- FROM public.laboratories
-- GROUP BY status, is_active
-- ORDER BY status, is_active;
-- Verify department seed:
--
-- SELECT
--     id,
--     name,
--     code,
--     is_active,
--     created_at,
--     updated_at
-- FROM public.departments
-- ORDER BY name;
-- Verify teacher department backfill:
--
-- SELECT
--     count(*) AS total_teachers,
--     count(department_id) AS teachers_with_department_id,
--     count(*) - count(department_id) AS teachers_with_null_department_id
-- FROM public.teachers;
-- Find teachers that could not be backfilled:
--
-- SELECT
--     id,
--     department,
--     department_id
-- FROM public.teachers
-- WHERE department_id IS NULL
-- ORDER BY department;
-- Verify foreign key:
--
-- SELECT
--     conname,
--     conrelid::regclass AS source_table,
--     confrelid::regclass AS target_table,
--     confdeltype
-- FROM pg_constraint
-- WHERE conrelid = 'public.teachers'::regclass
--   AND conname ILIKE '%department%';
-- Verify RLS policies:
--
-- SELECT
--     schemaname,
--     tablename,
--     policyname,
--     permissive,
--     roles,
--     cmd,
--     qual,
--     with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('laboratories', 'departments')
-- ORDER BY tablename, policyname;
-- =========================================================
-- END OF PHASE 1 MIGRATION
-- =========================================================
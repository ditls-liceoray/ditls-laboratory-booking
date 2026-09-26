-- =========================================================
-- Add backend validation for booking field requirements
-- =========================================================
-- Enforces field-level validation at database level for bookings:
-- - Description: minimum 20 characters, no placeholder values
-- - Remarks: minimum 10 characters, no placeholder values
-- - Equipment needed: required, no placeholder values
-- - Purpose: no placeholder values
-- - Expected students: positive integer
-- - Class name, Subject, Section: required
-- Applies to INSERT and UPDATE on bookings table
-- Only validates when status is 'pending' or 'approved'
-- =========================================================

CREATE OR REPLACE FUNCTION public.enforce_booking_field_requirements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_placeholder_values text[] := ARRAY[
        'none', 'n/a', 'na', '-', '--', 'test', 'testing', 'ok', 'okay',
        'no description', 'no desc', 'not applicable', 'no remarks',
        'no equipment', 'n.a.', 'n / a'
    ];
    v_trimmed_text text;
BEGIN
    -- Only validate for pending/approved bookings (trigger WHEN clause also enforces this)
    IF NEW.status NOT IN ('pending', 'approved') THEN
        RETURN NEW;
    END IF;

    -- Short-circuit: only validate when relevant fields are being created or changed
    IF TG_OP = 'UPDATE' THEN
        IF NEW.class_name IS NOT DISTINCT FROM OLD.class_name
           AND NEW.subject IS NOT DISTINCT FROM OLD.subject
           AND NEW.course IS NOT DISTINCT FROM OLD.course
           AND NEW.year_level IS NOT DISTINCT FROM OLD.year_level
           AND NEW.section IS NOT DISTINCT FROM OLD.section
           AND NEW.purpose IS NOT DISTINCT FROM OLD.purpose
           AND NEW.description IS NOT DISTINCT FROM OLD.description
           AND NEW.equipment_needed IS NOT DISTINCT FROM OLD.equipment_needed
           AND NEW.remarks IS NOT DISTINCT FROM OLD.remarks
           AND NEW.expected_students IS NOT DISTINCT FROM OLD.expected_students
        THEN
            RETURN NEW;
        END IF;
    END IF;

    -- ----- Class name: required, non-empty, not placeholder -----
    IF NEW.class_name IS NULL THEN
        RAISE EXCEPTION 'Class name is required';
    END IF;
    v_trimmed_text := trim(NEW.class_name);
    IF v_trimmed_text = '' THEN
        RAISE EXCEPTION 'Class name is required';
    END IF;
    IF v_trimmed_text ILIKE ANY (v_placeholder_values) THEN
        RAISE EXCEPTION 'Class name cannot be a placeholder value (e.g., "None", "N/A", "-")';
    END IF;

    -- ----- Subject: required, non-empty, not placeholder -----
    IF NEW.subject IS NULL THEN
        RAISE EXCEPTION 'Subject is required';
    END IF;
    v_trimmed_text := trim(NEW.subject);
    IF v_trimmed_text = '' THEN
        RAISE EXCEPTION 'Subject is required';
    END IF;
    IF v_trimmed_text ILIKE ANY (v_placeholder_values) THEN
        RAISE EXCEPTION 'Subject cannot be a placeholder value (e.g., "None", "N/A", "-")';
    END IF;

    -- ----- Course (Strand): required if provided, non-empty -----
    IF NEW.course IS NOT NULL THEN
        v_trimmed_text := trim(NEW.course);
        IF v_trimmed_text = '' THEN
            RAISE EXCEPTION 'Strand is required';
        END IF;
    END IF;

    -- ----- Year Level: required if provided, non-empty -----
    IF NEW.year_level IS NOT NULL THEN
        v_trimmed_text := trim(NEW.year_level);
        IF v_trimmed_text = '' THEN
            RAISE EXCEPTION 'Year Level is required';
        END IF;
    END IF;

    -- ----- Section: required, non-empty, not placeholder -----
    IF NEW.section IS NULL THEN
        RAISE EXCEPTION 'Section is required';
    END IF;
    v_trimmed_text := trim(NEW.section);
    IF v_trimmed_text = '' THEN
        RAISE EXCEPTION 'Section is required';
    END IF;
    IF v_trimmed_text ILIKE ANY (v_placeholder_values) THEN
        RAISE EXCEPTION 'Section cannot be a placeholder value (e.g., "None", "N/A", "-")';
    END IF;

    -- ----- Purpose: required, min 3 chars, not placeholder -----
    IF NEW.purpose IS NULL THEN
        RAISE EXCEPTION 'Purpose is required';
    END IF;
    v_trimmed_text := trim(NEW.purpose);
    IF v_trimmed_text = '' THEN
        RAISE EXCEPTION 'Purpose is required';
    END IF;
    IF char_length(v_trimmed_text) < 3 THEN
        RAISE EXCEPTION 'Purpose must contain at least 3 meaningful characters';
    END IF;
    IF v_trimmed_text ILIKE ANY (v_placeholder_values) THEN
        RAISE EXCEPTION 'Purpose cannot be a placeholder value (e.g., "None", "N/A", "-")';
    END IF;

    -- ----- Description: required, min 20 chars, not placeholder -----
    IF NEW.description IS NULL THEN
        RAISE EXCEPTION 'Description is required';
    END IF;
    v_trimmed_text := trim(NEW.description);
    IF v_trimmed_text = '' THEN
        RAISE EXCEPTION 'Description is required';
    END IF;
    IF char_length(v_trimmed_text) < 20 THEN
        RAISE EXCEPTION 'Description must contain at least 20 meaningful characters';
    END IF;
    IF v_trimmed_text ILIKE ANY (v_placeholder_values) THEN
        RAISE EXCEPTION 'Description cannot be a placeholder value (e.g., "None", "N/A", "-")';
    END IF;

    -- ----- Equipment Needed: required, not placeholder -----
    IF NEW.equipment_needed IS NULL THEN
        RAISE EXCEPTION 'Equipment Needed is required';
    END IF;
    v_trimmed_text := trim(NEW.equipment_needed);
    IF v_trimmed_text = '' THEN
        RAISE EXCEPTION 'Equipment Needed is required';
    END IF;
    IF v_trimmed_text ILIKE ANY (v_placeholder_values) THEN
        RAISE EXCEPTION 'Equipment Needed cannot be a placeholder value (e.g., "None", "N/A", "-")';
    END IF;

    -- ----- Remarks: required, min 10 chars, not placeholder -----
    IF NEW.remarks IS NULL THEN
        RAISE EXCEPTION 'Remarks are required';
    END IF;
    v_trimmed_text := trim(NEW.remarks);
    IF v_trimmed_text = '' THEN
        RAISE EXCEPTION 'Remarks are required';
    END IF;
    IF char_length(v_trimmed_text) < 10 THEN
        RAISE EXCEPTION 'Remarks must contain at least 10 meaningful characters';
    END IF;
    IF v_trimmed_text ILIKE ANY (v_placeholder_values) THEN
        RAISE EXCEPTION 'Remarks cannot be a placeholder value (e.g., "None", "N/A", "-")';
    END IF;

    -- ----- Expected Students: positive integer -----
    IF NEW.expected_students IS NULL THEN
        RAISE EXCEPTION 'Expected number of students is required';
    END IF;
    IF NEW.expected_students < 1 THEN
        RAISE EXCEPTION 'Expected number of students must be greater than 0';
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create new one
DROP TRIGGER IF EXISTS trg_enforce_booking_field_requirements ON public.bookings;

CREATE TRIGGER trg_enforce_booking_field_requirements
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
WHEN (NEW.status IN ('pending', 'approved'))
EXECUTE FUNCTION public.enforce_booking_field_requirements();

GRANT EXECUTE ON FUNCTION public.enforce_booking_field_requirements() TO authenticated;
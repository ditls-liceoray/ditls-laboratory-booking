-- =========================================================
-- Fix check_booking_conflict RPC ambiguity (PGRST203)
-- =========================================================
-- Drop the existing 5-parameter function (with default param)
-- Drop any existing 4-parameter version if present
-- Recreate ONLY ONE canonical 4-parameter function
-- =========================================================

DROP FUNCTION IF EXISTS public.check_booking_conflict(uuid, date, time, time, uuid);
DROP FUNCTION IF EXISTS public.check_booking_conflict(uuid, date, time, time);

CREATE OR REPLACE FUNCTION public.check_booking_conflict(
    p_laboratory_id uuid,
    p_booking_date date,
    p_start_time time,
    p_end_time time
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.bookings b
        WHERE b.laboratory_id = p_laboratory_id
          AND b.booking_date = p_booking_date
          AND b.status IN ('pending','approved')
          AND b.start_time < p_end_time
          AND p_start_time < b.end_time
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_booking_conflict(uuid, date, time, time) TO authenticated;
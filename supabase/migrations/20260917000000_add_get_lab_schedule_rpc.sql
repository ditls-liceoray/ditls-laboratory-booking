-- =========================================================
-- Add get_lab_schedule RPC for cross-faculty schedule visibility
-- =========================================================
-- Allows any authenticated faculty to see bookings for a specific
-- laboratory/date without exposing private teacher information.
-- Only returns bookings that occupy the schedule (pending/approved).
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_lab_schedule(
    p_laboratory_id uuid,
    p_booking_date date
)
RETURNS TABLE (
    id uuid,
    reference_no text,
    booking_date date,
    start_time time,
    end_time time,
    status text,
    class_name text,
    subject text,
    course text,
    teacher_display_name text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT
        b.id,
        b.reference_no,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        b.class_name,
        b.subject,
        b.course,
        CONCAT(t.first_name, ' ', COALESCE(t.middle_name || ' ', ''), t.last_name) AS teacher_display_name
    FROM public.bookings b
    INNER JOIN public.teachers t ON b.teacher_id = t.id
    WHERE b.laboratory_id = p_laboratory_id
      AND b.booking_date = p_booking_date
      AND b.status IN ('pending', 'approved')
    ORDER BY b.start_time;
$$;

GRANT EXECUTE ON FUNCTION public.get_lab_schedule(uuid, date) TO authenticated;

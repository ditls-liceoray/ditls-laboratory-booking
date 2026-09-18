-- =========================================================
-- Add backend booking policy validation
-- =========================================================
-- Enforces booking policy rules at database level:
-- - Minimum booking duration
-- - Maximum booking duration
-- - Allowed booking hours (start/end)
-- Applies to INSERT and UPDATE on bookings table
-- Only validates when status is 'pending' or 'approved'
-- =========================================================

CREATE OR REPLACE FUNCTION public.enforce_booking_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_min_duration_minutes integer;
    v_max_duration_hours integer;
    v_booking_start_hour time;
    v_booking_end_hour time;
    v_interval_minutes integer;
    v_booking_duration_minutes integer;
    v_start_hour integer;
    v_end_hour integer;
BEGIN
    -- Only validate for pending/approved bookings
    IF NEW.status NOT IN ('pending', 'approved') THEN
        RETURN NEW;
    END IF;

    -- Only validate when booking time fields are being created or changed
    IF TG_OP = 'UPDATE' THEN
        IF NEW.booking_date = OLD.booking_date
           AND NEW.start_time = OLD.start_time
           AND NEW.end_time = OLD.end_time THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Fetch current policy settings
    SELECT
        COALESCE(s_min.value, '30')::integer,
        COALESCE(s_max.value, '4')::integer,
        COALESCE(s_start.value, '07:00')::time,
        COALESCE(s_end.value, '22:00')::time,
        COALESCE(s_interval.value, '30')::integer
    INTO
        v_min_duration_minutes,
        v_max_duration_hours,
        v_booking_start_hour,
        v_booking_end_hour,
        v_interval_minutes
    FROM (
        SELECT 'min_booking_duration_minutes' AS key UNION ALL
        SELECT 'max_booking_duration_hours' UNION ALL
        SELECT 'booking_start_hour' UNION ALL
        SELECT 'booking_end_hour' UNION ALL
        SELECT 'time_slot_interval_minutes'
    ) keys
    LEFT JOIN public.settings s_min ON s_min.key = 'min_booking_duration_minutes'
    LEFT JOIN public.settings s_max ON s_max.key = 'max_booking_duration_hours'
    LEFT JOIN public.settings s_start ON s_start.key = 'booking_start_hour'
    LEFT JOIN public.settings s_end ON s_end.key = 'booking_end_hour'
    LEFT JOIN public.settings s_interval ON s_interval.key = 'time_slot_interval_minutes';

    -- Validate minimum booking duration
    v_booking_duration_minutes := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    IF v_booking_duration_minutes < v_min_duration_minutes THEN
        RAISE EXCEPTION 'Booking duration is below the minimum allowed (% minutes)', v_min_duration_minutes;
    END IF;

    -- Validate maximum booking duration
    IF v_booking_duration_minutes > (v_max_duration_hours * 60) THEN
        RAISE EXCEPTION 'Booking duration exceeds the maximum allowed (% hours)', v_max_duration_hours;
    END IF;

    -- Validate booking start hour
    v_start_hour := EXTRACT(HOUR FROM NEW.start_time)::integer;
    IF NEW.start_time < v_booking_start_hour THEN
        RAISE EXCEPTION 'Booking start time is before the allowed laboratory opening hour (%)', v_booking_start_hour;
    END IF;

    -- Validate booking end hour
    v_end_hour := EXTRACT(HOUR FROM NEW.end_time)::integer;
    IF NEW.end_time > v_booking_end_hour THEN
        RAISE EXCEPTION 'Booking end time is after the allowed laboratory closing hour (%)', v_booking_end_hour;
    END IF;

    -- Validate time slot interval alignment (optional - warn but don't block)
    -- Only validate if interval is set and > 0
    IF v_interval_minutes > 0 THEN
        -- Check if start_time aligns with interval
        IF (EXTRACT(MINUTE FROM NEW.start_time)::integer % v_interval_minutes) <> 0 THEN
            RAISE EXCEPTION 'Booking start time must align with the configured time slot interval (% minutes)', v_interval_minutes;
        END IF;
        -- Check if end_time aligns with interval
        IF (EXTRACT(MINUTE FROM NEW.end_time)::integer % v_interval_minutes) <> 0 THEN
            RAISE EXCEPTION 'Booking end time must align with the configured time slot interval (% minutes)', v_interval_minutes;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create new one
DROP TRIGGER IF EXISTS trg_enforce_booking_policy ON public.bookings;
CREATE TRIGGER trg_enforce_booking_policy
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (NEW.status IN ('pending', 'approved'))
    EXECUTE FUNCTION public.enforce_booking_policy();

GRANT EXECUTE ON FUNCTION public.enforce_booking_policy() TO authenticated;

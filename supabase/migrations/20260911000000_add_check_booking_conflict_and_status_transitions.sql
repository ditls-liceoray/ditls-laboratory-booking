/*
# Add check_booking_conflict RPC and enforce status transition rules

## Issues addressed
1. **Missing check_booking_conflict RPC** — Frontend calls this RPC for live conflict detection but it doesn't exist.
2. **No backend enforcement of status transitions** — Teachers can bypass UI and cancel approved bookings; rejected/cancelled/completed bookings can be reactivated.

## Changes
1. Create `check_booking_conflict(p_laboratory_id, p_booking_date, p_start_time, p_end_time, p_exclude_booking_id)` RPC
   - Returns true if conflict exists, false otherwise
   - Excludes a specific booking ID (for updates)
   - Only checks against pending/approved bookings
   - SECURITY DEFINER with fixed search_path

2. Add `enforce_booking_status_transitions()` trigger
   - Prevents invalid status transitions at database level
   - Teachers: can only cancel pending bookings
   - Admins: can approve/reject pending; complete approved; cancel pending/approved
   - No transitions allowed from rejected, cancelled, completed
*/

-- =========================================================
-- 1. check_booking_conflict RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
    p_laboratory_id uuid,
    p_booking_date date,
    p_start_time time,
    p_end_time time,
    p_exclude_booking_id uuid DEFAULT NULL
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
        WHERE b.id IS DISTINCT FROM p_exclude_booking_id
          AND b.laboratory_id = p_laboratory_id
          AND b.booking_date = p_booking_date
          AND b.status IN ('pending','approved')
          AND b.start_time < p_end_time
          AND p_start_time < b.end_time
    );
$$;

GRANT EXECUTE ON FUNCTION public.check_booking_conflict(uuid, date, time, time, uuid) TO authenticated;

-- =========================================================
-- 2. Status transition enforcement
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_booking_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_admin boolean;
    v_current_teacher_id uuid;
    v_old_status text;
    v_new_status text;
BEGIN
    -- Get caller permissions
    v_is_admin := public.is_admin();
    v_current_teacher_id := public.current_teacher_id();

    v_old_status := OLD.status;
    v_new_status := NEW.status;

    -- No change, allow
    IF v_old_status = v_new_status THEN
        RETURN NEW;
    END IF;

    -- Admins can do most transitions, but not from terminal states
    IF v_is_admin THEN
        -- From pending: can go to approved, rejected, cancelled
        IF v_old_status = 'pending' AND v_new_status IN ('approved','rejected','cancelled') THEN
            RETURN NEW;
        END IF;

        -- From approved: can go to completed, cancelled
        IF v_old_status = 'approved' AND v_new_status IN ('completed','cancelled') THEN
            RETURN NEW;
        END IF;

        -- From rejected/cancelled/completed: no transitions allowed
        RAISE EXCEPTION 'Invalid status transition: cannot change booking from % to %', v_old_status, v_new_status;
    END IF;

    -- Teachers: can only cancel their own pending bookings
    IF NEW.teacher_id = v_current_teacher_id THEN
        IF v_old_status = 'pending' AND v_new_status = 'cancelled' THEN
            RETURN NEW;
        END IF;

        RAISE EXCEPTION 'Teachers can only cancel pending bookings';
    END IF;

    -- Should not reach here if RLS works, but deny by default
    RAISE EXCEPTION 'Unauthorized status transition';
END;
$$;

-- Drop existing trigger if any, then create new one
DROP TRIGGER IF EXISTS trg_enforce_booking_status_transitions ON public.bookings;
CREATE TRIGGER trg_enforce_booking_status_transitions
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.enforce_booking_status_transitions();

-- =========================================================
-- 3. Grant execute on new function to authenticated
-- =========================================================
GRANT EXECUTE ON FUNCTION public.enforce_booking_status_transitions() TO authenticated;

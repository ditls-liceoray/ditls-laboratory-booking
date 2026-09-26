-- =========================================================
-- Phase 5: Remove Automatic "Completed Booking" Notes from Auto-Completion
-- =========================================================
-- Purpose:
--   Stop the auto-completion process from creating "Completed Booking"
--   records in the Notes table. The Notes section should be reserved
--   for legitimate announcements, maintenance notices, and system
--   messages created by administrators.
--
-- This migration replaces the existing complete_expired_bookings()
-- function with a version that does NOT create a Note for completed
-- bookings, while preserving all other behavior:
--   - Booking expiration detection (Manila timezone)
--   - approved -> completed transition
--   - FOR UPDATE SKIP LOCKED concurrency control
--   - Authorization/security context
--   - Activity log creation
--   - Teacher notification (with note_id = NULL)
--   - Existing booking safeguards
-- =========================================================

-- =========================================================
-- 1. REPLACE complete_expired_bookings() FUNCTION
-- =========================================================
-- The new version omits the INSERT INTO public.notes block
-- and sets note_id = NULL for the teacher notification.
-- =========================================================

CREATE OR REPLACE FUNCTION public.complete_expired_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    v_booking record;
    v_count integer := 0;
BEGIN
    -- ========================================================
    -- Find expired approved bookings.
    --
    -- booking_date + end_time represents Manila local time.
    -- AT TIME ZONE converts that local timestamp to timestamptz
    -- for comparison against now().
    --
    -- FOR UPDATE SKIP LOCKED prevents concurrent scheduler
    -- executions from processing the same booking.
    -- ========================================================
    FOR v_booking IN
    SELECT
        b.id,
        b.reference_no,
        b.booking_date,
        b.start_time,
        b.end_time,
        b.status,
        b.teacher_id,
        b.laboratory_id,
        t.profile_id,
        concat_ws(
            ' ',
            t.first_name,
            nullif(t.middle_name, ''),
            t.last_name
        ) AS teacher_name,
        l.name AS laboratory_name
    FROM
        public.bookings b
        INNER JOIN public.teachers t ON t.id = b.teacher_id
        INNER JOIN public.laboratories l ON l.id = b.laboratory_id
    WHERE
        b.status = 'approved'
        AND (
            (b.booking_date + b.end_time) AT TIME ZONE 'Asia/Manila'
        ) <= now()
    ORDER BY
        b.id FOR
    UPDATE
        OF b SKIP LOCKED LOOP
        -- ====================================================
        -- Clear any stale context belonging to this transaction.
        -- ====================================================
        DELETE FROM
            booking_automation_private.completion_context
        WHERE
            transaction_id = txid_current();

        -- ====================================================
        -- Create transaction-scoped authorization.
        -- ====================================================
        INSERT INTO
            booking_automation_private.completion_context (
                transaction_id,
                booking_id
            )
        VALUES
            (
                txid_current(),
                v_booking.id
            );

        -- ====================================================
        -- Perform ONLY approved -> completed.
        --
        -- Re-check eligibility inside UPDATE to protect against
        -- stale state and concurrent changes.
        -- ====================================================
        UPDATE
            public.bookings
        SET
            status = 'completed'
        WHERE
            id = v_booking.id
            AND status = 'approved'
            AND (
                (booking_date + end_time)
                AT TIME ZONE 'Asia/Manila'
            ) <= now();

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Automatic booking completion did not update the locked booking';
        END IF;

        -- ====================================================
        -- The trigger must have consumed the authorization.
        -- ====================================================
        IF EXISTS (
            SELECT 1
            FROM booking_automation_private.completion_context
            WHERE transaction_id = txid_current()
              AND booking_id = v_booking.id
        ) THEN
            RAISE EXCEPTION 'Automatic booking completion authorization was not consumed';
        END IF;

        -- ====================================================
        -- Teacher notification (with note_id = NULL).
        -- No Note is created for automatic completions.
        -- ====================================================
        IF v_booking.profile_id IS NOT NULL THEN
            INSERT INTO
                public.notifications (
                    user_id,
                    booking_id,
                    note_id,
                    title,
                    message,
                    type,
                    read
                )
            VALUES
                (
                    v_booking.profile_id,
                    v_booking.id,
                    NULL,
                    'Booking Completed',
                    format(
                        'Your booking %s was automatically marked completed after its scheduled end time.',
                        v_booking.reference_no
                    ),
                    'info',
                    false
                );
        END IF;

        -- ====================================================
        -- Activity log.
        -- ====================================================
        INSERT INTO
            public.activity_logs (
                user_id,
                action,
                description
            )
        VALUES
            (
                NULL,
                'completed_booking',
                format(
                    'Booking %s automatically marked as completed after its scheduled end time. [booking:%s]',
                    v_booking.reference_no,
                    v_booking.id
                )
            );

        -- ====================================================
        -- Increment successful completion count.
        -- ====================================================
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- =========================================================
-- 2. REVOKE EXECUTE from PUBLIC/ANON/AUTHENTICATED
-- =========================================================
REVOKE ALL ON FUNCTION public.complete_expired_bookings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_expired_bookings() TO service_role;

-- =========================================================
-- 3. VERIFICATION (COMMENTED OUT FOR REFERENCE)
-- =========================================================
-- Verify the function exists and has no INSERT INTO public.notes:
-- SELECT prosrc FROM pg_proc WHERE proname = 'complete_expired_bookings';
-- 
-- Test by running manually (as service_role):
-- SELECT public.complete_expired_bookings();
BEGIN;

-- ============================================================
-- AUTOMATIC BOOKING COMPLETION
-- ============================================================
-- Purpose:
--   Automatically transition expired approved bookings:
--
--       approved -> completed
--
-- Eligibility:
--   status = 'approved'
--   AND scheduled Manila end datetime <= current time
--
-- The existing teacher/admin authorization rules remain intact.
-- The automation uses a transaction-scoped authorization context
-- that can only be consumed by the dedicated completion RPC.
-- ============================================================
-- ============================================================
-- 1. PRIVATE AUTOMATION SCHEMA
-- ============================================================
CREATE SCHEMA IF NOT EXISTS booking_automation_private;

REVOKE ALL ON SCHEMA booking_automation_private
FROM
    PUBLIC,
    anon,
    authenticated,
    service_role;

-- ============================================================
-- 2. TRANSACTION-SCOPED COMPLETION CONTEXT
-- ============================================================
CREATE TABLE IF NOT EXISTS booking_automation_private.completion_context (
    transaction_id bigint PRIMARY KEY,
    booking_id uuid NOT NULL
);

REVOKE ALL ON TABLE booking_automation_private.completion_context
FROM
    PUBLIC,
    anon,
    authenticated,
    service_role;

ALTER TABLE
    booking_automation_private.completion_context ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. EXISTING STATUS-TRANSITION TRIGGER FUNCTION
--    WITH NARROW AUTOMATION EXCEPTION
-- ============================================================
CREATE
OR REPLACE FUNCTION public.enforce_booking_status_transitions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = public,
    pg_temp AS $ $ DECLARE v_is_admin boolean;

v_current_teacher_id uuid;

v_old_status text;

v_new_status text;

v_completion_booking_id uuid;

BEGIN -- --------------------------------------------------------
-- Automatic completion exception
-- --------------------------------------------------------
--
-- The exception is valid ONLY when:
--
-- 1. A completion context exists for this transaction.
-- 2. The context belongs to this exact booking.
-- 3. OLD status is approved.
-- 4. NEW status is completed.
-- 5. The scheduled Manila end time has passed.
-- 6. No other booking columns are changed, except
--    updated_at which is handled by the existing trigger.
--
-- This does NOT grant general service-role status-update
-- permission.
-- --------------------------------------------------------
SELECT
    c.booking_id INTO v_completion_booking_id
FROM
    booking_automation_private.completion_context c
WHERE
    c.transaction_id = txid_current();

IF FOUND THEN IF v_completion_booking_id = OLD.id THEN IF OLD.status = 'approved'
AND NEW.status = 'completed'
AND (
    (OLD.booking_date + OLD.end_time) AT TIME ZONE 'Asia/Manila'
) <= now()
AND (
    to_jsonb(NEW) - 'status' - 'updated_at'
) = (
    to_jsonb(OLD) - 'status' - 'updated_at'
) THEN -- Consume the authorization context.
DELETE FROM
    booking_automation_private.completion_context
WHERE
    transaction_id = txid_current()
    AND booking_id = OLD.id;

RETURN NEW;

END IF;

RAISE EXCEPTION 'Invalid automatic completion';

END IF;

-- Context belongs to another booking.
-- Continue through normal authorization rules.
END IF;

-- --------------------------------------------------------
-- Existing normal authorization logic
-- --------------------------------------------------------
v_is_admin := public.is_admin();

v_current_teacher_id := public.current_teacher_id();

v_old_status := OLD.status;

v_new_status := NEW.status;

-- No status change.
IF v_old_status = v_new_status THEN RETURN NEW;

END IF;

-- --------------------------------------------------------
-- Admin transitions
-- --------------------------------------------------------
IF v_is_admin THEN -- pending -> approved/rejected/cancelled
IF v_old_status = 'pending'
AND v_new_status IN ('approved', 'rejected', 'cancelled') THEN RETURN NEW;

END IF;

-- approved -> completed/cancelled
IF v_old_status = 'approved'
AND v_new_status IN ('completed', 'cancelled') THEN RETURN NEW;

END IF;

RAISE EXCEPTION 'Invalid status transition: cannot change booking from % to %',
v_old_status,
v_new_status;

END IF;

-- --------------------------------------------------------
-- Teacher transitions
-- --------------------------------------------------------
IF NEW.teacher_id = v_current_teacher_id THEN -- Teachers may only cancel their own pending bookings.
IF v_old_status = 'pending'
AND v_new_status = 'cancelled' THEN RETURN NEW;

END IF;

RAISE EXCEPTION 'Teachers can only cancel pending bookings';

END IF;

-- --------------------------------------------------------
-- Default deny
-- --------------------------------------------------------
RAISE EXCEPTION 'Unauthorized status transition';

END;

$ $;

-- ============================================================
-- 4. DEDICATED AUTOMATIC COMPLETION RPC
-- ============================================================
CREATE
OR REPLACE FUNCTION public.complete_expired_bookings() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET
    search_path = pg_catalog,
    pg_temp AS $ $ DECLARE v_booking record;

v_note_id uuid;

v_count integer := 0;

BEGIN -- ========================================================
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
    OF b SKIP LOCKED LOOP -- ====================================================
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
        (booking_date + end_time) AT TIME ZONE 'Asia/Manila'
    ) <= now();

IF NOT FOUND THEN RAISE EXCEPTION 'Automatic booking completion did not update the locked booking';

END IF;

-- ====================================================
-- The trigger must have consumed the authorization.
-- ====================================================
IF EXISTS (
    SELECT
        1
    FROM
        booking_automation_private.completion_context
    WHERE
        transaction_id = txid_current()
        AND booking_id = v_booking.id
) THEN RAISE EXCEPTION 'Automatic booking completion authorization was not consumed';

END IF;

-- ====================================================
-- Create one system note.
--
-- Because this entire function runs transactionally,
-- failure rolls back the booking completion.
--
-- The booking becomes completed, so subsequent scheduler
-- executions will not select it again.
-- ====================================================
INSERT INTO
    public.notes (
        type,
        title,
        content,
        pinned,
        created_by
    )
VALUES
    (
        'system',
        'Completed Booking',
        format(
            E 'Booking automatically completed.\n\n' || 'Reference: %s\n' || 'Teacher: %s\n' || 'Laboratory: %s\n' || 'Date: %s\n' || 'Time: %s - %s (Asia/Manila)\n\n' || 'The booking was automatically marked as completed ' || 'after its scheduled end time.\n\n' || '[auto-completed-booking:%s]',
            v_booking.reference_no,
            v_booking.teacher_name,
            v_booking.laboratory_name,
            to_char(
                v_booking.booking_date,
                'YYYY-MM-DD'
            ),
            to_char(
                v_booking.booking_date + v_booking.start_time,
                'HH12:MI AM'
            ),
            to_char(
                v_booking.booking_date + v_booking.end_time,
                'HH12:MI AM'
            ),
            v_booking.id
        ),
        false,
        NULL
    ) RETURNING id INTO v_note_id;

-- ====================================================
-- Teacher notification.
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
        v_note_id,
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

$ $;

-- ============================================================
-- 5. RPC ACCESS CONTROL
-- ============================================================
REVOKE ALL ON FUNCTION public.complete_expired_bookings()
FROM
    PUBLIC,
    anon,
    authenticated;

GRANT EXECUTE ON FUNCTION public.complete_expired_bookings() TO service_role;

-- ============================================================
-- 6. EXPLICITLY KEEP PRIVATE TABLE INACCESSIBLE
-- ============================================================
REVOKE ALL ON TABLE booking_automation_private.completion_context
FROM
    PUBLIC,
    anon,
    authenticated,
    service_role;

ALTER TABLE
    booking_automation_private.completion_context ENABLE ROW LEVEL SECURITY;

COMMIT;
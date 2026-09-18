-- =========================================================
-- 1. Booking indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_bookings_lab_date_status
  ON public.bookings (laboratory_id, booking_date, status)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_bookings_teacher_status
  ON public.bookings (teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_bookings_date_status
  ON public.bookings (booking_date, status);


-- =========================================================
-- 2. Notification indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
  ON public.notifications (user_id, read, created_at DESC);


-- =========================================================
-- 3. Activity log indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created
  ON public.activity_logs (user_id, created_at DESC);


-- =========================================================
-- 4. Teacher indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_teachers_department
  ON public.teachers (department);


-- =========================================================
-- 5. Note indexes
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_notes_pinned_created
  ON public.notes (pinned DESC, created_at DESC);
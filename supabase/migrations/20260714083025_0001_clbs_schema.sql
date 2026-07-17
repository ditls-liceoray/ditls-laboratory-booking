/*
# CLBS — Computer Laboratory Booking System schema

## Overview
Creates the full relational schema for the Computer Laboratory Booking System:
a multi-user app with two roles (Administrator and Teacher). Authentication is
handled by Supabase Auth (email/password). Usernames are presented in the UI
but stored as `<username>@clbs.local` emails in auth.users; the clean username
is mirrored in `profiles.username`.

## New tables
1. `profiles` — extends auth.users with a username and role (admin/teacher).
2. `teachers` — professional records for teacher accounts, linked to a profile.
3. `laboratories` — the bookable labs.
4. `bookings` — lab reservation requests made by teachers.
5. `notifications` — per-user in-app notifications.
6. `notes` — announcements / maintenance / holiday / system / pinned messages.
7. `activity_logs` — audit trail of every meaningful action.
8. `settings` — key/value system settings.

## Security
- RLS enabled on every table.
- `is_admin()` helper: true when the current user's profile role is 'admin'.
- `current_teacher_id()` helper: returns the teachers.id for the current user.
- Admins can read/write everything. Teachers can only access their own rows.
- Public seed: an `admin` account (admin / admin123) is inserted into auth.users.

## Notes
- Passwords are bcrypt-hashed via pgcrypto `crypt()`/`gen_salt('bf')`.
- Teacher IDs auto-generated as `TCH-####` via a sequence-backed default.
- Booking reference numbers auto-generated as `BK-YYYYMMDD-####`.
- A trigger prevents double-booking of the same laboratory for overlapping
  time ranges on the same date (only approved/pending bookings block).
*/

-- Required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- Tables (all created before functions/policies)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'teacher' CHECK (role IN ('admin','teacher')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.teacher_seq START 1;

CREATE TABLE IF NOT EXISTS public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id text UNIQUE NOT NULL DEFAULT ('TCH-' || lpad((nextval('public.teacher_seq'))::text, 4, '0')),
  profile_id uuid UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text NOT NULL,
  contact_number text,
  department text NOT NULL,
  position text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  profile_picture text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.laboratories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  capacity integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','maintenance','closed')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.booking_seq START 1;

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no text UNIQUE NOT NULL DEFAULT (
    'BK-' || to_char(now(),'YYYYMMDD') || '-' || lpad((nextval('public.booking_seq'))::text, 4, '0')
  ),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  laboratory_id uuid NOT NULL REFERENCES public.laboratories(id) ON DELETE CASCADE,
  class_name text NOT NULL,
  subject text NOT NULL,
  course text,
  year_level text,
  section text,
  purpose text NOT NULL,
  description text,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  expected_students integer NOT NULL DEFAULT 30,
  equipment_needed text,
  remarks text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_order CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_teacher ON public.bookings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_bookings_lab_date ON public.bookings(laboratory_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

CREATE TABLE IF NOT EXISTS public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('announcement','maintenance','holiday','system','pinned')),
  title text NOT NULL,
  content text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_created ON public.activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================
-- Helper functions
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_teacher_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT t.id FROM public.teachers t WHERE t.profile_id = auth.uid();
$$;

-- =========================================================
-- RLS: profiles
-- =========================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- =========================================================
-- RLS: teachers
-- =========================================================
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teachers_select_own_or_admin" ON public.teachers;
CREATE POLICY "teachers_select_own_or_admin" ON public.teachers
  FOR SELECT TO authenticated
  USING (public.is_admin() OR profile_id = auth.uid());

DROP POLICY IF EXISTS "teachers_insert_admin" ON public.teachers;
CREATE POLICY "teachers_insert_admin" ON public.teachers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "teachers_update_own_or_admin" ON public.teachers;
CREATE POLICY "teachers_update_own_or_admin" ON public.teachers
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR profile_id = auth.uid())
  WITH CHECK (public.is_admin() OR profile_id = auth.uid());

DROP POLICY IF EXISTS "teachers_delete_admin" ON public.teachers;
CREATE POLICY "teachers_delete_admin" ON public.teachers
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- =========================================================
-- RLS: laboratories
-- =========================================================
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "labs_select_all" ON public.laboratories;
CREATE POLICY "labs_select_all" ON public.laboratories
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "labs_write_admin" ON public.laboratories;
CREATE POLICY "labs_write_admin" ON public.laboratories
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "labs_update_admin" ON public.laboratories;
CREATE POLICY "labs_update_admin" ON public.laboratories
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "labs_delete_admin" ON public.laboratories;
CREATE POLICY "labs_delete_admin" ON public.laboratories
  FOR DELETE TO authenticated USING (public.is_admin());

-- =========================================================
-- RLS: bookings
-- =========================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_select_own_or_admin" ON public.bookings
  FOR SELECT TO authenticated
  USING (public.is_admin() OR teacher_id = public.current_teacher_id());

DROP POLICY IF EXISTS "bookings_insert_own" ON public.bookings;
CREATE POLICY "bookings_insert_own" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (teacher_id = public.current_teacher_id());

DROP POLICY IF EXISTS "bookings_update_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_update_own_or_admin" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR teacher_id = public.current_teacher_id())
  WITH CHECK (public.is_admin() OR teacher_id = public.current_teacher_id());

DROP POLICY IF EXISTS "bookings_delete_own_or_admin" ON public.bookings;
CREATE POLICY "bookings_delete_own_or_admin" ON public.bookings
  FOR DELETE TO authenticated
  USING (public.is_admin() OR teacher_id = public.current_teacher_id());

-- =========================================================
-- RLS: notifications
-- =========================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own_or_admin" ON public.notifications;
CREATE POLICY "notif_select_own_or_admin" ON public.notifications
  FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "notif_insert_own_or_admin" ON public.notifications;
CREATE POLICY "notif_insert_own_or_admin" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "notif_update_own" ON public.notifications;
CREATE POLICY "notif_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_delete_own_or_admin" ON public.notifications;
CREATE POLICY "notif_delete_own_or_admin" ON public.notifications
  FOR DELETE TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

-- =========================================================
-- RLS: notes
-- =========================================================
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notes_select_all" ON public.notes;
CREATE POLICY "notes_select_all" ON public.notes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "notes_write_admin" ON public.notes;
CREATE POLICY "notes_write_admin" ON public.notes
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "notes_update_admin" ON public.notes;
CREATE POLICY "notes_update_admin" ON public.notes
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "notes_delete_admin" ON public.notes;
CREATE POLICY "notes_delete_admin" ON public.notes
  FOR DELETE TO authenticated USING (public.is_admin());

-- =========================================================
-- RLS: activity_logs
-- =========================================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logs_select_own_or_admin" ON public.activity_logs;
CREATE POLICY "logs_select_own_or_admin" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.is_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "logs_insert_authenticated" ON public.activity_logs;
CREATE POLICY "logs_insert_authenticated" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "logs_delete_admin" ON public.activity_logs;
CREATE POLICY "logs_delete_admin" ON public.activity_logs
  FOR DELETE TO authenticated USING (public.is_admin());

-- =========================================================
-- RLS: settings
-- =========================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_all" ON public.settings;
CREATE POLICY "settings_select_all" ON public.settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_write_admin" ON public.settings;
CREATE POLICY "settings_write_admin" ON public.settings
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "settings_update_admin" ON public.settings;
CREATE POLICY "settings_update_admin" ON public.settings
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "settings_delete_admin" ON public.settings;
CREATE POLICY "settings_delete_admin" ON public.settings
  FOR DELETE TO authenticated USING (public.is_admin());

-- =========================================================
-- updated_at triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_teachers_touch ON public.teachers;
CREATE TRIGGER trg_teachers_touch BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_bookings_touch ON public.bookings;
CREATE TRIGGER trg_bookings_touch BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_notes_touch ON public.notes;
CREATE TRIGGER trg_notes_touch BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_settings_touch ON public.settings;
CREATE TRIGGER trg_settings_touch BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================================
-- Double-booking prevention trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings b
  WHERE b.id <> NEW.id
    AND b.laboratory_id = NEW.laboratory_id
    AND b.booking_date = NEW.booking_date
    AND b.status IN ('pending','approved')
    AND b.start_time < NEW.end_time
    AND NEW.start_time < b.end_time;

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Schedule conflict: laboratory is already booked for this time slot.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_double_booking ON public.bookings;
CREATE TRIGGER trg_prevent_double_booking
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('pending','approved'))
  EXECUTE FUNCTION public.prevent_double_booking();

-- =========================================================
-- Seed: admin account (admin / admin123)
-- =========================================================
DO $$
DECLARE
  admin_uid uuid := 'a9710a1f-ad26-41cb-b2d4-da04b8d32129';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@clbs.local') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token
    ) VALUES (
      admin_uid, 'a9710a1f-ad26-41cb-b2d4-da04b8d32129', 'authenticated', 'authenticated',
      'admin@clbs.local',
      crypt('admin123', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', ''
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = admin_uid) THEN
    INSERT INTO public.profiles (id, username, role)
    VALUES (admin_uid, 'admin', 'admin');
  END IF;
END $$;

-- =========================================================
-- Seed: sample laboratories
-- =========================================================
INSERT INTO public.laboratories (name, location, capacity, status, description)
SELECT * FROM (VALUES
  ('Laboratory 1', 'Ground Floor, Room 101', 40, 'available', 'General computing laboratory with 40 workstations.'),
  ('Laboratory 2', 'Ground Floor, Room 102', 35, 'available', 'Programming and software development laboratory.'),
  ('Laboratory 3', 'Second Floor, Room 201', 30, 'available', 'Networking and systems laboratory.'),
  ('Laboratory 4', 'Second Floor, Room 202', 25, 'maintenance', 'Multimedia and graphics laboratory (under maintenance).')
) AS t(name, location, capacity, status, description)
WHERE NOT EXISTS (SELECT 1 FROM public.laboratories);

-- =========================================================
-- Seed: default settings
-- =========================================================
INSERT INTO public.settings (key, value)
SELECT * FROM (VALUES
  ('system_name', 'Computer Laboratory Booking System'),
  ('system_version', '1.0.0'),
  ('university', 'State University'),
  ('session_timeout_minutes', '60')
) AS t(key, value)
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

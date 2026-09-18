-- =========================================================
-- 1. Add note_id column to notifications
-- =========================================================

ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS note_id uuid
REFERENCES public.notes(id)
ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_note
ON public.notifications(note_id);


-- =========================================================
-- 2. Create teacher-profiles storage bucket
-- =========================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('teacher-profiles', 'teacher-profiles', true)
ON CONFLICT (id) DO UPDATE
SET public = true;


-- =========================================================
-- 3. Teacher profile storage policies
-- =========================================================

DROP POLICY IF EXISTS "teacher_profiles_upload_own"
ON storage.objects;

CREATE POLICY "teacher_profiles_upload_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'teacher-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


DROP POLICY IF EXISTS "teacher_profiles_select_own"
ON storage.objects;

CREATE POLICY "teacher_profiles_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'teacher-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


DROP POLICY IF EXISTS "teacher_profiles_update_own"
ON storage.objects;

CREATE POLICY "teacher_profiles_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'teacher-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
    bucket_id = 'teacher-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


DROP POLICY IF EXISTS "teacher_profiles_delete_own"
ON storage.objects;

CREATE POLICY "teacher_profiles_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'teacher-profiles'
    AND auth.uid()::text = (storage.foldername(name))[1]
);


-- =========================================================
-- 4. Admins can manage all teacher profile pictures
-- =========================================================

DROP POLICY IF EXISTS "teacher_profiles_admin_all"
ON storage.objects;

CREATE POLICY "teacher_profiles_admin_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'teacher-profiles'
    AND public.is_admin()
)
WITH CHECK (
    bucket_id = 'teacher-profiles'
    AND public.is_admin()
);


-- =========================================================
-- 5. Public read access
-- =========================================================

DROP POLICY IF EXISTS "teacher_profiles_public_read"
ON storage.objects;

CREATE POLICY "teacher_profiles_public_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
    bucket_id = 'teacher-profiles'
);
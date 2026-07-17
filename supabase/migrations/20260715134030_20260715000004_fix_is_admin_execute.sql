/*
# Fix: restore EXECUTE on is_admin() / current_teacher_id() for authenticated

Migration 0003 revoked EXECUTE on these two SECURITY DEFINER functions from
`authenticated`. However, they are referenced inside RLS policies that are
evaluated as the calling (authenticated) user. PostgreSQL requires EXECUTE
privilege to invoke a function — even a SECURITY DEFINER one — so every policy
that calls is_admin() (profiles/teachers/bookings/notifications/activity_logs
SELECT, plus admin INSERT/UPDATE/DELETE) failed with
"permission denied for function is_admin".

Symptom: admin auth succeeds (last_sign_in_at updates) but loadProfile()
silently returns null, so the post-login redirect never fires and the user
is stuck on the login page.

These functions are safe to expose to authenticated users:
  - SECURITY DEFINER (run as owner, not caller)
  - SET search_path = public, pg_temp (no search_path hijacking)
  - Only read from profiles using auth.uid() (no data leakage)
*/

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_teacher_id() TO authenticated;

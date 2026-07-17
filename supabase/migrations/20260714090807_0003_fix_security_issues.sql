/*
# Fix security vulnerabilities

## Issues addressed
1. **Function Search Path Mutable** — `prevent_double_booking`, `is_admin`, `current_teacher_id`, and `touch_updated_at` had role-mutable search paths, allowing search-path hijacking. All four now have `SET search_path = public, pg_temp`.
2. **RLS Policy Always True** — `activity_logs` INSERT policy `logs_insert_authenticated` used `WITH CHECK (true)`, allowing any authenticated user to insert rows with arbitrary `user_id`. Now scoped to `user_id = auth.uid()`.
3. **Public/Authenticated Can Execute SECURITY DEFINER Functions** — `is_admin()` and `current_teacher_id()` were executable by `anon` and `authenticated` via `/rest/v1/rpc/`. EXECUTE revoked from `public`, `anon`, and `authenticated`. These functions are only referenced internally by RLS policies, never called via RPC.

## Security changes
- All 4 functions: `ALTER FUNCTION ... SET search_path = public, pg_temp`
- `is_admin()`, `current_teacher_id()`: `REVOKE EXECUTE ON FUNCTION ... FROM public, anon, authenticated`
- `activity_logs` INSERT policy: replaced `WITH CHECK (true)` with `WITH CHECK (user_id = auth.uid())`
*/

-- =========================================================
-- 1. Fix mutable search_path on all functions
-- =========================================================
ALTER FUNCTION public.prevent_double_booking() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_teacher_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.touch_updated_at() SET search_path = public, pg_temp;

-- =========================================================
-- 2. Revoke EXECUTE on SECURITY DEFINER functions from anon/authenticated/public
--    These are only used internally by RLS policies, never via RPC.
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_teacher_id() FROM public, anon, authenticated;

-- =========================================================
-- 3. Fix RLS policy: activity_logs INSERT was WITH CHECK (true)
--    Now scoped to only allow inserting your own user_id.
-- =========================================================
DROP POLICY IF EXISTS "logs_insert_authenticated" ON public.activity_logs;
CREATE POLICY "logs_insert_authenticated" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

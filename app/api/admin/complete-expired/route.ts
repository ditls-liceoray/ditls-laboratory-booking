import { createClient } from '@supabase/supabase-js';
import { getSupabaseServerWithAuth, getSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getErrorResponse(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return getErrorResponse('Unauthorized: missing Bearer token', 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !anonKey) {
      return getErrorResponse('Server not configured', 503);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return getErrorResponse('Invalid or expired session', 401);
    }

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== 'admin') {
      return getErrorResponse('Forbidden: admin role required', 403);
    }

    const adminClient = getSupabaseServer();

    const { data, error } = await adminClient
      .rpc('complete_expired_bookings')
      .abortSignal(AbortSignal.timeout(50000));

    if (error || !Number.isInteger(data) || data < 0) {
      console.error('Auto-completion failed:', error);
      return getErrorResponse('Automatic completion failed; retry is safe.', 500);
    }

    return Response.json({ success: true, completed: data });
  } catch (err) {
    console.error('Auto-completion error:', err);
    return getErrorResponse('Automatic completion failed; retry is safe.', 500);
  }
}
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function getSupabaseServer(): ReturnType<typeof createClient> {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server configuration is missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseServerWithAuth(accessToken: string): ReturnType<typeof createClient> {
  if (!supabaseUrl) {
    throw new Error('Supabase URL is missing. Check NEXT_PUBLIC_SUPABASE_URL environment variable.');
  }
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY || '', {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
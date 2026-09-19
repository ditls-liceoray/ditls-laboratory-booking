import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handleCompletion(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const secret = process.env.CRON_SECRET;

  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    return Response.json(
      {
        success: false,
        error: 'Completion scheduler is not configured.',
      },
      {
        status: 503,
        headers,
      },
    );
  }

  const encoder = new TextEncoder();
  const authorization = encoder.encode(
    request.headers.get('authorization') || '',
  );
  const expected = encoder.encode(`Bearer ${secret}`);

  if (
    authorization.length !== expected.length ||
    !timingSafeEqual(authorization, expected)
  ) {
    return Response.json(
      {
        success: false,
        error: 'Unauthorized.',
      },
      {
        status: 401,
        headers,
      },
    );
  }

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return Response.json(
      {
        success: false,
        error: 'Completion database access is not configured.',
      },
      {
        status: 503,
        headers,
      },
    );
  }

  try {
    const supabase = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await supabase
      .rpc('complete_expired_bookings')
      .abortSignal(AbortSignal.timeout(50000));

    if (error || !Number.isInteger(data) || data < 0) {
      return Response.json(
        {
          success: false,
          error: 'Automatic completion failed; retry is safe.',
        },
        {
          status: 500,
          headers,
        },
      );
    }

    return Response.json(
      {
        success: true,
        completed: data,
      },
      {
        headers,
      },
    );
  } catch {
    return Response.json(
      {
        success: false,
        error: 'Automatic completion failed; retry is safe.',
      },
      {
        status: 500,
        headers,
      },
    );
  }
}

export async function GET(request: Request) {
  return handleCompletion(request);
}

export async function POST(request: Request) {
  return handleCompletion(request);
}
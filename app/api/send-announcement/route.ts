import { createClient } from '@supabase/supabase-js';
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Simple in-memory rate limiter (sliding window)
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

function getErrorResponse(message: string, status: number) {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  // Authentication: verify Supabase session
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

  // Rate limiting: 10 requests per minute per IP (additional protection layer)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  const rateLimit = checkRateLimit(`send-announcement:${clientIp}`, 10, 60 * 1000);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000);
    return Response.json(
      {
        success: false,
        error: "Too many requests. Please try again shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetTime / 1000)),
        },
      }
    );
  }

  try {
    const { emails, title, message } = await request.json();

    // Input validation
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return Response.json(
        {
          success: false,
          error: "No email recipients provided.",
        },
        { status: 400 }
      );
    }

    // Validate email format and limit recipients
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails = emails.filter((email: unknown) => typeof email === 'string' && emailRegex.test(email));
    if (validEmails.length === 0) {
      return Response.json(
        {
          success: false,
          error: "No valid email recipients provided.",
        },
        { status: 400 }
      );
    }
    if (validEmails.length > 100) {
      return Response.json(
        {
          success: false,
          error: "Too many recipients. Maximum 100 per request.",
        },
        { status: 400 }
      );
    }

    // Validate title and message
    if (typeof title !== 'string' || title.trim().length === 0) {
      return Response.json(
        {
          success: false,
          error: "Title is required.",
        },
        { status: 400 }
      );
    }
    if (title.length > 200) {
      return Response.json(
        {
          success: false,
          error: "Title too long. Maximum 200 characters.",
        },
        { status: 400 }
      );
    }
    if (typeof message !== 'string' || message.trim().length === 0) {
      return Response.json(
        {
          success: false,
          error: "Message is required.",
        },
        { status: 400 }
      );
    }
    if (message.length > 10000) {
      return Response.json(
        {
          success: false,
          error: "Message too long. Maximum 10,000 characters.",
        },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return Response.json(
        {
          success: false,
          error: "Gmail SMTP credentials are not configured.",
        },
        { status: 500 }
      );
    }

    const results = [];

    for (const email of emails) {
      try {
        const info = await transporter.sendMail({
          from: `"DITLS Computer & Robotics Laboratory Booking System" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: title,
          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 700px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            ">
              <h2 style="margin-bottom: 20px;">
                ${title}
              </h2>

              <div style="
                font-size: 15px;
                line-height: 1.7;
                white-space: pre-wrap;
              ">
                ${message}
              </div>

              <hr style="
                margin: 30px 0;
                border: none;
                border-top: 1px solid #ddd;
              " />

              <p style="font-weight: bold;">
                DITLS Computer & Robotics Laboratory Booking System
              </p>

              <p style="
                font-size: 12px;
                color: #777;
              ">
                This is an automated email. Please do not reply.
              </p>
            </div>
          `,
        });

        results.push({
          email,
          success: true,
          messageId: info.messageId,
          error: null,
        });
      } catch (error: any) {
        console.error(`Failed to send email to ${email}:`, error);

        results.push({
          email,
          success: false,
          messageId: null,
          error: error?.message || "Unknown email error",
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return Response.json(
      {
        success: failed === 0,
        total: emails.length,
        successful,
        failed,
        results,
      },
      {
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetTime / 1000)),
        },
      }
    );
  } catch (error: any) {
    console.error("SEND ANNOUNCEMENT ERROR:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to send emails.",
      },
      { status: 500 }
    );
  }
}
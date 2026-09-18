import nodemailer from "nodemailer";
import { headers } from "next/headers";

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

function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for proxied environments)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}

export async function POST(request: Request) {
  // Rate limiting: 10 requests per minute per IP
  const clientIp = getClientIdentifier(request);
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

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return Response.json(
        {
          success: false,
          error: "No email recipients provided.",
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
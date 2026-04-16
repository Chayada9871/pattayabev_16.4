import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

const handler = toNextJsHandler(auth);

function getAuthRateLimitConfig(pathname: string) {
  if (pathname.endsWith("/sign-in/email")) {
    return {
      keyPrefix: "auth:sign-in",
      limit: 8,
      windowMs: 10 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
      message: "Too many sign-in attempts. Please wait before trying again."
    };
  }

  if (pathname.endsWith("/sign-up/email")) {
    return {
      keyPrefix: "auth:sign-up",
      limit: 5,
      windowMs: 60 * 60 * 1000,
      blockMs: 60 * 60 * 1000,
      message: "Too many registration attempts. Please wait before trying again."
    };
  }

  if (
    pathname.endsWith("/request-password-reset") ||
    pathname.endsWith("/send-verification-email") ||
    pathname.endsWith("/forget-password") ||
    pathname.endsWith("/reset-password")
  ) {
    return {
      keyPrefix: "auth:verification-reset",
      limit: 6,
      windowMs: 60 * 60 * 1000,
      blockMs: 60 * 60 * 1000,
      message: "Too many authentication requests. Please wait before trying again."
    };
  }

  if (pathname.endsWith("/delete-user")) {
    return {
      keyPrefix: "auth:delete-user",
      limit: 4,
      windowMs: 60 * 60 * 1000,
      blockMs: 60 * 60 * 1000,
      message: "Too many delete-account attempts. Please wait before trying again."
    };
  }

  return null;
}

export const GET = handler.GET;
export const PUT = handler.PUT;
export const PATCH = handler.PATCH;
export const DELETE = handler.DELETE;

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname;
  const rateLimitConfig = getAuthRateLimitConfig(pathname);

  if (rateLimitConfig) {
    try {
      enforceRateLimit(request, rateLimitConfig);
    } catch (error) {
      logSecurityEvent("auth.rate-limited", {
        path: pathname,
        reason: error instanceof Error ? error.message : "unknown"
      });

      return Response.json(
        {
          code: "rate_limited",
          message: rateLimitConfig.message
        },
        {
          status: 429
        }
      );
    }
  }

  return handler.POST(request);
}

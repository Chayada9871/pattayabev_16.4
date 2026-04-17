import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { enforceRateLimit, logSecurityEvent } from "@/lib/security";

export const runtime = "nodejs";

function getHandler() {
  return toNextJsHandler(auth);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown";
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  return "";
}

function getErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return {};
  }

  return {
    name: "name" in error ? String(error.name) : undefined,
    code: "code" in error ? String(error.code) : undefined,
    detail: "detail" in error ? String(error.detail) : undefined,
    hint: "hint" in error ? String(error.hint) : undefined,
    stack:
      "stack" in error && typeof error.stack === "string"
        ? error.stack.split("\n").slice(0, 6).join("\n")
        : undefined
  };
}

function getPublicAuthError(error: unknown) {
  const reason = getErrorMessage(error);
  const raw = reason.toLowerCase();
  const errorCode = getErrorCode(error);

  if (raw.startsWith("missing required environment variable: smtp_") || raw.includes("smtp")) {
    return {
      status: 503,
      code: "email_service_unavailable",
      message: "Email verification is temporarily unavailable. Please contact support."
    };
  }

  if (raw.startsWith("missing required environment variable:")) {
    return {
      status: 503,
      code: "auth_service_unavailable",
      message: "Authentication service is temporarily unavailable. Please try again shortly."
    };
  }

  if (raw.includes("invalid base url")) {
    return {
      status: 503,
      code: "auth_base_url_invalid",
      message: "Authentication service is temporarily unavailable. Please try again shortly."
    };
  }

  if (raw.includes("failed to initialize database adapter") || raw.includes("database adapter")) {
    return {
      status: 503,
      code: "auth_database_unavailable",
      message: "Authentication service is temporarily unavailable. Please try again shortly."
    };
  }

  if (
    errorCode === "42P01" ||
    errorCode === "42703" ||
    raw.includes("relation") ||
    raw.includes("column") ||
    raw.includes("does not exist")
  ) {
    return {
      status: 503,
      code: "auth_database_schema_invalid",
      message: "Authentication service is temporarily unavailable. Please try again shortly."
    };
  }

  return {
    status: 500,
    code: "auth_unexpected_error",
    message: "Authentication service is temporarily unavailable. Please try again shortly."
  };
}

async function runAuthHandler(
  method: "GET" | "PUT" | "PATCH" | "DELETE" | "POST",
  request: Request
) {
  try {
    return await getHandler()[method](request);
  } catch (error) {
    const authError = getPublicAuthError(error);

    logSecurityEvent("auth.handler.error", {
      path: new URL(request.url).pathname,
      method,
      reason: getErrorMessage(error),
      status: authError.status,
      ...getErrorDetails(error)
    });

    return Response.json(
      {
        code: authError.code,
        message: authError.message
      },
      {
        status: authError.status
      }
    );
  }
}

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

export async function GET(request: Request) {
  return runAuthHandler("GET", request);
}

export async function PUT(request: Request) {
  return runAuthHandler("PUT", request);
}

export async function PATCH(request: Request) {
  return runAuthHandler("PATCH", request);
}

export async function DELETE(request: Request) {
  return runAuthHandler("DELETE", request);
}

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

  return runAuthHandler("POST", request);
}

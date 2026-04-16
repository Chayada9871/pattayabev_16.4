import "server-only";

type RateLimitRecord = {
  count: number;
  resetAt: number;
  blockedUntil: number;
};

declare global {
  var __pattayabevRateLimitStore: Map<string, RateLimitRecord> | undefined;
}

const rateLimitStore = global.__pattayabevRateLimitStore ?? new Map<string, RateLimitRecord>();

if (process.env.NODE_ENV !== "production") {
  global.__pattayabevRateLimitStore = rateLimitStore;
}

type AppErrorOptions = {
  code?: string;
  expose?: boolean;
  retryAfterSeconds?: number;
};

export class AppError extends Error {
  status: number;
  code: string;
  expose: boolean;
  retryAfterSeconds?: number;

  constructor(message: string, status = 400, options: AppErrorOptions = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = options.code ?? "app_error";
    this.expose = options.expose ?? true;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, { code: "validation_error" });
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, { code: "unauthorized" });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, { code: "forbidden" });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, { code: "not_found" });
    this.name = "NotFoundError";
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, retryAfterSeconds: number) {
    super(message, 429, {
      code: "rate_limited",
      retryAfterSeconds
    });
    this.name = "RateLimitError";
  }
}

export function trimToNull(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function isUuid(value: string | null | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function isValidEmail(value: string | null | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
}

export function isValidOrderNumber(value: string | null | undefined) {
  return Boolean(value && /^PBV\d{6}-[A-Z0-9]{8}$/i.test(value.trim()));
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwarded = forwardedFor?.split(",")[0]?.trim();

  return (
    trimToNull(forwarded) ??
    trimToNull(request.headers.get("x-real-ip")) ??
    trimToNull(request.headers.get("cf-connecting-ip")) ??
    "unknown"
  );
}

function redactLogValue(key: string, value: unknown): unknown {
  if (/(token|secret|password|authorization|cookie|signature)/i.test(key)) {
    return "[redacted]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactLogValue(key, item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, childValue]) => [childKey, redactLogValue(childKey, childValue)])
    );
  }

  return value;
}

export function logSecurityEvent(event: string, details: Record<string, unknown> = {}) {
  const sanitized = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [key, redactLogValue(key, value)])
  );

  console.warn(`[security] ${event}`, sanitized);
}

export function getPublicErrorDetails(error: unknown, fallbackMessage: string) {
  if (error instanceof AppError) {
    return {
      message: error.message,
      status: error.status,
      retryAfterSeconds: error.retryAfterSeconds
    };
  }

  return {
    message: fallbackMessage,
    status: 500,
    retryAfterSeconds: undefined
  };
}

export function enforceRateLimit(
  request: Request,
  options: {
    keyPrefix: string;
    limit: number;
    windowMs: number;
    blockMs?: number;
    message?: string;
  }
) {
  const ip = getClientIp(request);
  const key = `${options.keyPrefix}:${ip}`;
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (current && current.blockedUntil > now) {
    throw new RateLimitError(
      options.message ?? "Too many requests. Please try again later.",
      Math.max(1, Math.ceil((current.blockedUntil - now) / 1000))
    );
  }

  const nextRecord =
    !current || current.resetAt <= now
      ? {
          count: 1,
          resetAt: now + options.windowMs,
          blockedUntil: 0
        }
      : {
          ...current,
          count: current.count + 1
        };

  if (nextRecord.count > options.limit) {
    const blockedUntil = now + (options.blockMs ?? options.windowMs);

    rateLimitStore.set(key, {
      count: nextRecord.count,
      resetAt: now + options.windowMs,
      blockedUntil
    });

    throw new RateLimitError(
      options.message ?? "Too many requests. Please try again later.",
      Math.max(1, Math.ceil((blockedUntil - now) / 1000))
    );
  }

  rateLimitStore.set(key, nextRecord);
}

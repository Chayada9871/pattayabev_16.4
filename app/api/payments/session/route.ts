import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth";
import { getCheckoutSchemaMessage } from "@/lib/orders";
import { canAccessOrderRecord, getOrderAccessRecord, sanitizeOrderAccessToken } from "@/lib/order-security";
import { createPaymentSessionForOrder } from "@/lib/payment-service";
import { enforceRateLimit, getPublicErrorDetails, logSecurityEvent } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, {
      keyPrefix: "payments:create-session",
      limit: 8,
      windowMs: 10 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
      message: "Too many payment session requests. Please wait before trying again."
    });

    const body = (await request.json()) as { orderNumber?: string; accessToken?: string };
    const orderNumber = body.orderNumber?.trim() ?? "";

    if (!orderNumber) {
      return NextResponse.json({ error: "Missing order number." }, { status: 400 });
    }

    const accessToken = sanitizeOrderAccessToken(body.accessToken);
    const session = await getRequestSession(request);
    const accessRecord = await getOrderAccessRecord(orderNumber);

    if (
      !accessRecord ||
      !canAccessOrderRecord(accessRecord, {
        role: session?.user.role,
        userId: session?.user.id,
        accessToken
      })
    ) {
      logSecurityEvent("payments.create-session.unauthorized", {
        path: new URL(request.url).pathname,
        orderNumber
      });

      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const paymentSession = await createPaymentSessionForOrder({
      orderNumber,
      accessToken
    });

    return NextResponse.json({ ok: true, session: paymentSession });
  } catch (error) {
    const schemaMessage = getCheckoutSchemaMessage();
    const details =
      error instanceof Error && error.message === schemaMessage
        ? { message: schemaMessage, status: 503, retryAfterSeconds: undefined }
        : getPublicErrorDetails(error, "Unable to start the payment session right now.");

    logSecurityEvent("payments.create-session.denied", {
      path: new URL(request.url).pathname,
      status: details.status,
      reason: error instanceof Error ? error.message : "unknown"
    });

    return NextResponse.json(
      { error: details.message },
      {
        status: details.status,
        headers: details.retryAfterSeconds
          ? {
              "Retry-After": String(details.retryAfterSeconds)
            }
          : undefined
      }
    );
  }
}

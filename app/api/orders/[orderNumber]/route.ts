import { NextResponse } from "next/server";

import { getRequestSession } from "@/lib/auth";
import { getCheckoutSchemaMessage, getOrderByOrderNumber } from "@/lib/orders";
import { canAccessOrderRecord, getOrderAccessRecord, sanitizeOrderAccessToken } from "@/lib/order-security";
import { enforceRateLimit, getPublicErrorDetails, logSecurityEvent } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { orderNumber: string } }
) {
  try {
    enforceRateLimit(request, {
      keyPrefix: "orders:status",
      limit: 40,
      windowMs: 10 * 60 * 1000,
      blockMs: 10 * 60 * 1000,
      message: "Too many order status checks. Please wait before refreshing again."
    });

    const url = new URL(request.url);
    const accessToken = sanitizeOrderAccessToken(url.searchParams.get("access"));
    const session = await getRequestSession(request);
    const accessRecord = await getOrderAccessRecord(params.orderNumber);

    if (
      !accessRecord ||
      !canAccessOrderRecord(accessRecord, {
        role: session?.user.role,
        userId: session?.user.id,
        accessToken
      })
    ) {
      logSecurityEvent("orders.status.unauthorized", {
        path: url.pathname,
        orderNumber: params.orderNumber
      });

      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const order = await getOrderByOrderNumber(params.orderNumber);

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        paymentReference: order.paymentReference,
        currency: order.currency,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        items: order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          subtotal: item.subtotal
        }))
      }
    });
  } catch (error) {
    const schemaMessage = getCheckoutSchemaMessage();
    const details =
      error instanceof Error && error.message === schemaMessage
        ? { message: schemaMessage, status: 503, retryAfterSeconds: undefined }
        : getPublicErrorDetails(error, "Unable to load the order right now.");

    logSecurityEvent("orders.status.denied", {
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

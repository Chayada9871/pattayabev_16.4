import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  createOrder,
  type BillingAddressInput,
  type CheckoutCartLineInput,
  getCheckoutSchemaMessage,
  type ShippingAddressInput
} from "@/lib/orders";
import { enforceRateLimit, getPublicErrorDetails, logSecurityEvent } from "@/lib/security";

type RequestBody = {
  cartItems?: CheckoutCartLineInput[];
  shippingAddress?: ShippingAddressInput;
  billingAddress?: BillingAddressInput;
  deliveryMethod?: "standard" | "express";
  paymentMethod?: "promptpay" | "card" | "cod";
  notes?: string;
  guestId?: string;
  ageConfirmed?: boolean;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    enforceRateLimit(request, {
      keyPrefix: "checkout:create-order",
      limit: 6,
      windowMs: 10 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
      message: "Too many checkout attempts. Please wait before trying again."
    });

    const body = (await request.json()) as RequestBody;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!body.cartItems?.length) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    if (!body.shippingAddress || !body.billingAddress || !body.deliveryMethod || !body.paymentMethod) {
      return NextResponse.json({ error: "Checkout details are incomplete." }, { status: 400 });
    }

    const order = await createOrder({
      userId: session?.user?.id ?? null,
      guestId: body.guestId?.trim() || "guest-checkout",
      cartItems: body.cartItems,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      deliveryMethod: body.deliveryMethod,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      ageConfirmed: Boolean(body.ageConfirmed)
    });

    return NextResponse.json({
      ok: true,
      orderNumber: order.orderNumber,
      orderAccessToken: order.guestAccessToken,
      summary: order.summary
    });
  } catch (error) {
    const schemaMessage = getCheckoutSchemaMessage();
    const details =
      error instanceof Error && error.message === schemaMessage
        ? { message: schemaMessage, status: 503, retryAfterSeconds: undefined }
        : getPublicErrorDetails(error, "Unable to create the order right now.");

    logSecurityEvent("checkout.create-order.denied", {
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

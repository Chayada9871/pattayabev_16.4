import "server-only";

import Stripe from "stripe";

import { getAppUrl as getNormalizedAppUrl } from "@/lib/app-url";
import { buildPaymentFailedPath, buildPaymentSuccessPath } from "@/lib/order-links";
import type { CheckoutOrder } from "@/lib/orders";

let stripeClient: Stripe | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getAppUrl() {
  return getNormalizedAppUrl(process.env.NEXT_PUBLIC_APP_URL, process.env.BETTER_AUTH_URL, process.env.VERCEL_URL);
}

function toStripeAmount(value: number) {
  return Math.max(0, Math.round(value * 100));
}

export function isStripePaymentConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripeClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"));
  }

  return stripeClient;
}

export function getStripeWebhookSecret() {
  return getRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export type HostedStripeSession = {
  sessionId: string;
  checkoutUrl: string;
  paymentReference: string;
  paymentIntentId: string | null;
  expiresAt: string | null;
  rawSession: Stripe.Checkout.Session;
};

export async function createHostedStripeCheckoutSession(
  order: CheckoutOrder,
  accessToken?: string | null
): Promise<HostedStripeSession> {
  const stripe = getStripeClient();
  const appUrl = getAppUrl();
  const successPath = buildPaymentSuccessPath(order.orderNumber, accessToken);
  const cancelPath = buildPaymentFailedPath(order.orderNumber, "cancelled", accessToken);
  const successUrl = `${appUrl}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appUrl}${cancelPath}`;

  const lineItems = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: (order.currency || "THB").toLowerCase(),
      unit_amount: toStripeAmount(item.unitPrice),
      product_data: {
        name: item.productName
      }
    }
  }));

  if (order.shippingFee > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: (order.currency || "THB").toLowerCase(),
        unit_amount: toStripeAmount(order.shippingFee),
        product_data: {
          name: "ค่าจัดส่ง"
        }
      }
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    locale: "th",
    client_reference_id: order.orderNumber,
    customer_email: order.customerEmail,
    payment_method_types: order.paymentMethod === "promptpay" ? ["promptpay"] : ["card"],
    line_items: lineItems,
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    submit_type: "pay",
    expires_at: Math.floor(Date.now() / 1000) + 60 * 30
  });

  if (!session.url) {
    throw new Error("Stripe did not return a hosted checkout URL.");
  }

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    paymentReference: session.id,
    paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
    rawSession: session
  };
}

export async function retrieveHostedStripeCheckoutSession(sessionId: string) {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
}

export function constructVerifiedStripeEvent(payload: string, signature: string | null) {
  if (!signature) {
    throw new Error("Missing Stripe-Signature header");
  }

  return getStripeClient().webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
}

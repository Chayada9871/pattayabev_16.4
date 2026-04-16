import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { isValidOrderNumber, trimToNull } from "@/lib/security";

export type OrderAccessRecord = {
  orderNumber: string;
  userId: string | null;
  guestAccessTokenHash: string | null;
};

export function createOrderAccessToken() {
  return randomBytes(24).toString("hex");
}

export function hashOrderAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sanitizeOrderAccessToken(value: string | null | undefined) {
  const token = trimToNull(value)?.toLowerCase() ?? null;

  if (!token || !/^[a-f0-9]{32,128}$/.test(token)) {
    return null;
  }

  return token;
}

function hasMatchingAccessToken(storedHash: string | null, providedToken: string | null | undefined) {
  const sanitizedToken = sanitizeOrderAccessToken(providedToken);

  if (!storedHash || !sanitizedToken) {
    return false;
  }

  const expected = Buffer.from(storedHash, "hex");
  const actual = Buffer.from(hashOrderAccessToken(sanitizedToken), "hex");

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}

export async function getOrderAccessRecord(orderNumber: string): Promise<OrderAccessRecord | null> {
  if (!isValidOrderNumber(orderNumber)) {
    return null;
  }

  const result = await db.query(
    `
      select
        order_number,
        user_id,
        guest_access_token_hash
      from public.orders
      where order_number = $1
      limit 1
    `,
    [orderNumber]
  );

  if (!result.rowCount) {
    return null;
  }

  return {
    orderNumber: String(result.rows[0].order_number),
    userId: result.rows[0].user_id ? String(result.rows[0].user_id) : null,
    guestAccessTokenHash: result.rows[0].guest_access_token_hash ? String(result.rows[0].guest_access_token_hash) : null
  };
}

export function canAccessOrderRecord(
  record: OrderAccessRecord,
  options: {
    role?: string | null;
    userId?: string | null;
    accessToken?: string | null;
  }
) {
  if (options.role === "admin") {
    return true;
  }

  if (options.userId && record.userId && options.userId === record.userId) {
    return true;
  }

  return hasMatchingAccessToken(record.guestAccessTokenHash, options.accessToken);
}

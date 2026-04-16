import "server-only";

import type { CheckoutOrder } from "@/lib/orders";
import { getOrderByOrderNumber } from "@/lib/orders";
import { canAccessOrderRecord, getOrderAccessRecord, sanitizeOrderAccessToken } from "@/lib/order-security";

export async function getAccessibleOrderByOrderNumber(args: {
  orderNumber: string;
  userId?: string | null;
  role?: string | null;
  accessToken?: string | null;
}): Promise<CheckoutOrder | null> {
  const accessRecord = await getOrderAccessRecord(args.orderNumber);

  if (
    !accessRecord ||
    !canAccessOrderRecord(accessRecord, {
      role: args.role,
      userId: args.userId,
      accessToken: sanitizeOrderAccessToken(args.accessToken)
    })
  ) {
    return null;
  }

  return getOrderByOrderNumber(args.orderNumber);
}

export const ORDER_ACCESS_QUERY_KEY = "access";

export function appendOrderAccessToPath(path: string, accessToken?: string | null) {
  if (!accessToken) {
    return path;
  }

  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${ORDER_ACCESS_QUERY_KEY}=${encodeURIComponent(accessToken)}`;
}

export function buildPaymentPath(orderNumber: string, accessToken?: string | null) {
  return appendOrderAccessToPath(`/payment?order=${encodeURIComponent(orderNumber)}`, accessToken);
}

export function buildPaymentProcessPath(orderNumber: string, accessToken?: string | null) {
  return appendOrderAccessToPath(`/payment/process?order=${encodeURIComponent(orderNumber)}`, accessToken);
}

export function buildPaymentSuccessPath(orderNumber: string, accessToken?: string | null) {
  return appendOrderAccessToPath(`/payment/success?order=${encodeURIComponent(orderNumber)}`, accessToken);
}

export function buildPaymentFailedPath(orderNumber: string, reason?: string | null, accessToken?: string | null) {
  const base = `/payment/failed?order=${encodeURIComponent(orderNumber)}${
    reason ? `&reason=${encodeURIComponent(reason)}` : ""
  }`;

  return appendOrderAccessToPath(base, accessToken);
}

export function buildOrderConfirmationPath(orderNumber: string, accessToken?: string | null) {
  return appendOrderAccessToPath(`/order-confirmation/${encodeURIComponent(orderNumber)}`, accessToken);
}

export function buildInvoicePath(orderNumber: string, accessToken?: string | null) {
  return appendOrderAccessToPath(`/order-confirmation/${encodeURIComponent(orderNumber)}/invoice`, accessToken);
}

export function buildOrderStatusApiPath(orderNumber: string, accessToken?: string | null) {
  return appendOrderAccessToPath(`/api/orders/${encodeURIComponent(orderNumber)}`, accessToken);
}

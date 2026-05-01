export type OrderDisplayTone = "success" | "warning" | "error";

export function getPaymentMethodLabel(method: string) {
  if (method === "promptpay") return "PromptPay QR";
  if (method === "card") return "Credit / debit card";
  if (method === "cod") return "Cash on delivery";
  return method || "-";
}

export function getPaymentStatusLabel(status: string) {
  if (status === "paid") return "Payment completed";
  if (status === "pending") return "Waiting for payment confirmation";
  if (status === "failed") return "Payment failed";
  if (status === "expired") return "Payment link expired";
  if (status === "refunded") return "Refunded";
  return "Waiting for payment";
}

export function getOrderStatusLabel(orderStatus: string, paymentStatus: string) {
  if (paymentStatus === "paid") return "Paid";
  if (paymentStatus === "pending") return "Waiting for payment confirmation";
  if (paymentStatus === "failed") return "Payment failed";
  if (paymentStatus === "expired") return "Payment link expired";
  if (orderStatus === "processing") return "Preparing order";
  if (orderStatus === "shipped") return "Shipped";
  if (orderStatus === "completed") return "Completed";
  if (orderStatus === "cancelled") return "Cancelled";
  return "Waiting for payment";
}

export function canRetryPayment(paymentMethod: string, paymentStatus: string) {
  return paymentMethod !== "cod" && ["unpaid", "failed", "expired"].includes(paymentStatus);
}

export function formatOrderDate(date: string) {
  return new Date(date).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function getOrderStatusHeadline({
  orderStatus,
  paymentStatus,
  paymentMethod
}: {
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
}): {
  title: string;
  description: string;
  tone: OrderDisplayTone;
} {
  if (paymentStatus === "paid") {
    return {
      title: "Payment completed",
      description: "Your payment has been confirmed. Our team will prepare and ship your order.",
      tone: "success"
    };
  }

  if (paymentStatus === "pending") {
    return {
      title: "Waiting for payment confirmation",
      description: "We have received the payment information and are waiting for confirmation from the payment provider.",
      tone: "warning"
    };
  }

  if (paymentMethod === "cod" && orderStatus === "processing") {
    return {
      title: "Order confirmed",
      description: "This order will be paid to the delivery staff when you receive the items.",
      tone: "success"
    };
  }

  if (paymentStatus === "failed") {
    return {
      title: "Payment failed",
      description: "We could not confirm this payment. You can start the payment again.",
      tone: "error"
    };
  }

  if (paymentStatus === "expired") {
    return {
      title: "Payment link expired",
      description: "The previous payment link has expired. Please create a new payment session to continue.",
      tone: "warning"
    };
  }

  return {
    title: "Waiting for payment",
    description: "Your order has been created. Please complete payment so we can start preparing the items.",
    tone: "warning"
  };
}

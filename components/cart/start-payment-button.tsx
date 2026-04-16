"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { buildPaymentProcessPath } from "@/lib/order-links";

type StartPaymentButtonProps = {
  orderNumber: string;
  accessToken?: string | null;
  className?: string;
  disabled?: boolean;
  label?: string;
};

export function StartPaymentButton({
  orderNumber,
  accessToken = null,
  className,
  disabled = false,
  label = "ชำระเงิน"
}: StartPaymentButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async () => {
    if (disabled || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/payments/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ orderNumber, accessToken })
      });

      const payload = (await response.json()) as {
        error?: string;
        session?: {
          redirectUrl?: string | null;
          redirectPath?: string;
        };
      };

      if (!response.ok || !payload.session) {
        throw new Error(payload.error || "ไม่สามารถสร้างรายการชำระเงินได้");
      }

      if (payload.session.redirectUrl) {
        window.location.assign(payload.session.redirectUrl);
        return;
      }

      router.push(payload.session.redirectPath || buildPaymentProcessPath(orderNumber, accessToken));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "ไม่สามารถสร้างรายการชำระเงินได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={disabled || isSubmitting} className={className}>
      {isSubmitting ? "กำลังเชื่อมต่อหน้าชำระเงิน..." : label}
    </button>
  );
}

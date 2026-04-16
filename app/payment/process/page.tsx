import Link from "next/link";
import { redirect } from "next/navigation";

import { OrderSummaryCard } from "@/components/cart/order-summary-card";
import { ResponsiblePurchaseBanner } from "@/components/cart/responsible-purchase-banner";
import { StartPaymentButton } from "@/components/cart/start-payment-button";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getServerSession } from "@/lib/auth";
import {
  buildOrderConfirmationPath,
  buildPaymentPath
} from "@/lib/order-links";
import { getAccessibleOrderByOrderNumber } from "@/lib/order-access";
import { getCheckoutSchemaMessage } from "@/lib/orders";
import { sanitizeOrderAccessToken } from "@/lib/order-security";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/order-display";

function sectionCardClassName() {
  return "border border-[#dcd6cb] bg-white";
}

function sectionTitleClassName() {
  return "border-b border-[#e5dfd5] px-5 py-4 text-[24px] font-extrabold text-[#171212]";
}

function sectionBodyClassName() {
  return "px-5 py-5";
}

export default async function PaymentProcessPage({
  searchParams
}: {
  searchParams: { order?: string; access?: string };
}) {
  const session = await getServerSession();
  const orderNumber = typeof searchParams.order === "string" ? searchParams.order : "";
  const accessToken = sanitizeOrderAccessToken(
    typeof searchParams.access === "string" ? searchParams.access : null
  );
  let order = null;
  let schemaMessage = "";

  if (orderNumber) {
    try {
      order = await getAccessibleOrderByOrderNumber({
        orderNumber,
        userId: session?.user.id ?? null,
        role: session?.user.role ?? null,
        accessToken
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === getCheckoutSchemaMessage()) {
        schemaMessage = message;
      } else {
        throw error;
      }
    }
  }

  if (order?.paymentStatus === "pending") {
    redirect(buildOrderConfirmationPath(order.orderNumber, accessToken));
  }

  if (order?.paymentStatus === "paid") {
    redirect(buildOrderConfirmationPath(order.orderNumber, accessToken));
  }

  if (order?.paymentMethod === "cod") {
    redirect(buildOrderConfirmationPath(order.orderNumber, accessToken));
  }

  return (
    <div className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-[1380px] px-4 pb-16 pt-8">
        {schemaMessage ? (
          <div className="mb-6 border border-[#f2d1b0] bg-[#fff6ec] px-5 py-4 text-sm text-[#7a5c2d]">
            {schemaMessage}
          </div>
        ) : null}

        {!order ? (
          <section className="border border-[#dcd6cb] bg-white text-center shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
            <div className="px-6 py-10">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">Payment</p>
              <h1 className="mt-3 text-4xl font-extrabold text-[#171212]">Order not found</h1>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#5f5852]">
                Return to your order list or checkout flow and start the payment process again.
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  href="/account/orders"
                  className="inline-flex h-11 items-center justify-center bg-[#171212] px-8 text-sm font-bold text-white transition hover:bg-[#2b2424]"
                >
                  back
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div>
            <div className="mb-4 text-[11px] uppercase tracking-[0.12em] text-[#8b6a2b]">
              เธซเธเนเธฒเนเธฃเธ / เธเธณเธฃเธฐเน€เธเธดเธเธเธฃเธดเธ / เธ”เธณเน€เธเธดเธเธเธฒเธฃเธเธณเธฃเธฐเน€เธเธดเธ
            </div>

            <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4">
                <ResponsiblePurchaseBanner />

                <section className={sectionCardClassName()}>
                  <div className={sectionTitleClassName()}>เธเธณเธฃเธฐเน€เธเธดเธเธเธฃเธดเธ</div>
                  <div className={sectionBodyClassName()}>
                    <div className="border border-[#d7d1c7] bg-[#faf8f4] px-5 py-4 text-sm leading-7 text-[#5f5852]">
                      <p className="font-semibold text-[#171212]">เธเธณเธชเธฑเนเธเธเธทเนเธญ {order.orderNumber}</p>
                      <p className="mt-2">
                        เธงเธดเธเธตเธเธณเธฃเธฐเน€เธเธดเธ: <span className="font-semibold text-[#171212]">{getPaymentMethodLabel(order.paymentMethod)}</span>
                      </p>
                      <p className="mt-2">
                        เธชเธ–เธฒเธเธฐ: <span className="font-semibold text-[#171212]">{getPaymentStatusLabel(order.paymentStatus)}</span>
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <StartPaymentButton
                        orderNumber={order.orderNumber}
                        accessToken={accessToken}
                        label="เธเธณเธฃเธฐเน€เธเธดเธ"
                        className="inline-flex h-12 items-center justify-center bg-[#171212] px-6 text-sm font-bold text-white transition hover:bg-[#2b2424]"
                      />

                      <Link
                        href={buildPaymentPath(order.orderNumber, accessToken)}
                        className="inline-flex h-12 items-center justify-center border border-[#d7d1c7] bg-white px-6 text-sm font-bold text-[#171212] transition hover:bg-[#faf7f1]"
                      >
                        เน€เธเธฅเธตเนเธขเธเธงเธดเธเธตเธเธณเธฃเธฐเน€เธเธดเธ
                      </Link>

                      <Link
                        href="/account/orders"
                        className="inline-flex h-12 items-center justify-center border border-[#d7d1c7] bg-white px-6 text-sm font-bold text-[#171212] transition hover:bg-[#faf7f1]"
                      >
                        back
                      </Link>
                    </div>
                  </div>
                </section>
              </div>

              <div className="xl:sticky xl:top-6 xl:h-fit">
                <OrderSummaryCard
                  items={order.items.map((item) => ({
                    id: item.productId,
                    name: item.productName,
                    quantity: item.quantity,
                    subtotal: item.subtotal
                  }))}
                  currency={order.currency}
                  subtotal={order.subtotal}
                  shippingFee={order.shippingFee}
                  discountAmount={order.discountAmount}
                  totalAmount={order.totalAmount}
                  footer={
                    <div className="border border-[#dcd6cb] bg-white px-4 py-4 text-sm leading-7 text-[#5f5852]">
                      <p>
                        เธเธนเนเธฃเธฑเธเธชเธดเธเธเนเธฒ: <span className="font-semibold text-[#171212]">{order.shippingAddress.fullName}</span>
                      </p>
                      <p className="mt-2">
                        เธ—เธตเนเธญเธขเธนเนเธเธฑเธ”เธชเนเธ:{" "}
                        <span className="font-semibold text-[#171212]">
                          {[
                            order.shippingAddress.addressLine1,
                            order.shippingAddress.addressLine2,
                            order.shippingAddress.subdistrict,
                            order.shippingAddress.district,
                            order.shippingAddress.province,
                            order.shippingAddress.postalCode
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </p>
                    </div>
                  }
                />
              </div>
            </section>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

import { PaymentPageClient } from "@/components/cart/payment-page-client";
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { getServerSession } from "@/lib/auth";
import { getCheckoutSchemaMessage } from "@/lib/orders";
import { getAccessibleOrderByOrderNumber } from "@/lib/order-access";
import { sanitizeOrderAccessToken } from "@/lib/order-security";

export default async function PaymentPage({
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

  return (
    <div className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <main className="mx-auto max-w-[1380px] px-4 pb-16 pt-8">
        {schemaMessage ? (
          <div className="mb-6 border border-[#f2d1b0] bg-[#fff6ec] px-5 py-4 text-sm text-[#7a5c2d]">
            {schemaMessage}
          </div>
        ) : null}
        <PaymentPageClient order={order} accessToken={accessToken} />
      </main>

      <SiteFooter />
    </div>
  );
}

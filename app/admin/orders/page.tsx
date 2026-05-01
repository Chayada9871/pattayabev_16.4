import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import {
  AdminShell,
  adminPrimaryActionClass,
  adminSecondaryActionClass
} from "@/components/admin/admin-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminPayments,
  getAdminPaymentSummary,
  type AdminPaymentListItem
} from "@/lib/admin-payments";
import { formatPrice } from "@/lib/currency";

export const dynamic = "force-dynamic";

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date(value));
}

function getOrderStatusLabel(status: string) {
  if (status === "pending_payment") return "Pending payment";
  if (status === "paid") return "Paid";
  if (status === "processing") return "Processing";
  if (status === "shipped") return "Shipped";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  if (status === "cart") return "Cart";
  return status || "-";
}

function getPaymentStatusLabel(status: string) {
  if (status === "paid") return "Paid";
  if (status === "pending") return "Pending";
  if (status === "failed") return "Failed";
  if (status === "expired") return "Expired";
  if (status === "refunded") return "Refunded";
  return "Unpaid";
}

function getStatusPillClass(status: string) {
  if (["paid", "processing", "shipped", "completed"].includes(status)) {
    return "border-[#d6eadc] bg-[#edf7ef] text-[#207443]";
  }

  if (["pending_payment", "pending", "cart"].includes(status)) {
    return "border-[#eedeb2] bg-[#fff7e8] text-[#9a5d00]";
  }

  return "border-[#f3d1d3] bg-[#fbe9e9] text-[#a61b1f]";
}

function SummaryCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[24px] border border-[#ece4d6] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">{label}</p>
      <p className="mt-3 text-3xl font-extrabold text-[#171212]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#625b54]">{helper}</p>
    </div>
  );
}

function OrderRow({ order }: { order: AdminPaymentListItem }) {
  return (
    <article className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">Order</p>
          <h3 className="mt-2 text-xl font-extrabold text-[#171212]">{order.orderNumber}</h3>
          <p className="mt-2 text-sm text-[#5f5852]">
            {order.customerName} by {order.customerEmail}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8b6a2b]">Total</p>
          <p className="mt-2 text-2xl font-extrabold text-[#171212]">
            {formatPrice(order.totalAmount, order.currency)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">Order status</p>
          <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusPillClass(order.orderStatus)}`}>
            {getOrderStatusLabel(order.orderStatus)}
          </span>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">Payment</p>
          <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusPillClass(order.paymentStatus)}`}>
            {getPaymentStatusLabel(order.paymentStatus)}
          </span>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">Customer phone</p>
          <p className="mt-2 text-sm font-semibold text-[#171212]">{order.customerPhone}</p>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">Reference</p>
          <p className="mt-2 truncate text-sm font-semibold text-[#171212]">{order.paymentReference ?? "-"}</p>
        </div>
        <div className="rounded-2xl border border-[#ece4d6] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#8b6a2b]">Created</p>
          <p className="mt-2 text-sm font-semibold text-[#171212]">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/admin/orders/${order.orderNumber}`}
          className="inline-flex rounded-full bg-[#171212] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
        >
          Manage order
        </Link>
        <Link
          href={`/order-confirmation/${order.orderNumber}`}
          className="inline-flex rounded-full border border-[#d8cec0] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#171212]"
        >
          View customer page
        </Link>
      </div>
    </article>
  );
}

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  noStore();

  const session = await requireAdmin();
  const query = getFirstValue(searchParams?.q);
  const orderStatus = getFirstValue(searchParams?.orderStatus);
  const paymentStatus = getFirstValue(searchParams?.paymentStatus);
  const paymentMethod = getFirstValue(searchParams?.paymentMethod);

  let summary = {
    totalOrders: 0,
    awaitingPayment: 0,
    paidOrders: 0,
    problemOrders: 0,
    totalPaidAmount: 0
  };
  let orders: AdminPaymentListItem[] = [];
  let schemaMessage = "";

  try {
    [summary, orders] = await Promise.all([
      getAdminPaymentSummary(),
      getAdminPayments({ query, orderStatus, paymentStatus, paymentMethod }, 120)
    ]);
  } catch (error) {
    schemaMessage = error instanceof Error ? error.message : "Unable to load orders.";
  }

  return (
    <AdminShell
      currentPath="/admin/orders"
      eyebrow="PattayaBev Admin"
      title={`Manage orders, ${session.user.name}`}
      description="Search customer orders, review payment state, open the full order detail, and update fulfillment status from one admin workspace."
      actions={
        <>
          <Link className={adminSecondaryActionClass} href="/admin/payments">
            Payments
          </Link>
          <LogoutButton className={adminPrimaryActionClass} redirectTo="/login" />
        </>
      }
    >
      {schemaMessage ? (
        <div className="rounded-[24px] border border-[#f0d8be] bg-[#fff7ec] px-5 py-4 text-sm leading-7 text-[#7a5a21]">
          {schemaMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="All orders" value={String(summary.totalOrders)} helper="Orders in the checkout system." />
        <SummaryCard label="Awaiting payment" value={String(summary.awaitingPayment)} helper="Unpaid or pending payment orders." />
        <SummaryCard label="Paid" value={String(summary.paidOrders)} helper="Orders confirmed as paid." />
        <SummaryCard label="Needs review" value={String(summary.problemOrders)} helper="Failed, expired, or refunded payments." />
        <SummaryCard label="Paid revenue" value={formatPrice(summary.totalPaidAmount)} helper="Total paid amount in the system." />
      </div>

      <section className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ece4d6] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">Filters</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212] sm:text-3xl">Find an order</h2>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_190px_190px_190px_auto]">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search order number, customer, email, or payment reference"
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          />
          <select
            name="orderStatus"
            defaultValue={orderStatus}
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          >
            <option value="">All order statuses</option>
            <option value="pending_payment">Pending payment</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            name="paymentStatus"
            defaultValue={paymentStatus}
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          >
            <option value="">All payment statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            name="paymentMethod"
            defaultValue={paymentMethod}
            className="min-h-[46px] rounded-2xl border border-[#ddd3c5] bg-white px-4 text-sm text-[#171212] outline-none transition focus:border-[#171212]"
          >
            <option value="">All payment methods</option>
            <option value="promptpay">PromptPay QR</option>
            <option value="card">Card</option>
            <option value="cod">Cash on delivery</option>
          </select>
          <button
            type="submit"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#171212] px-6 text-sm font-bold text-white"
          >
            Apply
          </button>
        </form>
      </section>

      <section className="rounded-[24px] border border-[#ece4d6] bg-white p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ece4d6] pb-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#8b6a2b]">Order list</p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#171212] sm:text-3xl">Customer orders</h2>
          </div>
        </div>

        {orders.length ? (
          <div className="mt-6 space-y-4">
            {orders.map((order) => (
              <OrderRow key={order.orderId} order={order} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#d8cec0] bg-[#fbf7f0] px-6 py-10 text-center text-sm leading-7 text-[#5f5852]">
            No orders match the selected filters.
          </div>
        )}
      </section>
    </AdminShell>
  );
}

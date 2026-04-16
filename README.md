# PattayaBev

Next.js storefront using BetterAuth, PostgreSQL/Supabase, and Stripe.

## Security Hardening / Production Readiness

### 1. Authorization

- Already implemented
- BetterAuth roles already exist for `admin`, `manager`, and `user`.
- Many admin server actions/pages already required `requireAdmin()`.

- Improved now
- Added [app/admin/layout.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/admin/layout.tsx) and [app/manager/layout.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/manager/layout.tsx) so protected route trees are server-guarded consistently.
- Locked guest order/payment/order-confirmation access behind a per-order access token instead of order number alone in [app/api/orders/[orderNumber]/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/orders/[orderNumber]/route.ts), [app/api/payments/session/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/payments/session/route.ts), [app/payment/page.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/payment/page.tsx), [app/payment/process/page.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/payment/process/page.tsx), [app/order-confirmation/[orderNumber]/page.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/order-confirmation/[orderNumber]/page.tsx), and related cart components.

- Recommended next step
- If admin/manager APIs grow, move role checks into shared API wrappers or route groups so every future route gets RBAC by default.

### 2. Backend Validation

- Already implemented
- Checkout already recalculated totals from server-side product data in [lib/orders.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/orders.ts).

- Improved now
- Added stricter server-side validation for product IDs, order numbers, email fields, quantity ranges, note lengths, address lengths, delivery/payment options, and guest checkout state in [lib/orders.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/orders.ts).
- Added reusable validation/error/rate-limit helpers in [lib/security.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/security.ts).
- Added upload validation helpers in [lib/upload-security.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/upload-security.ts) and applied them to admin/product/article/promotion/business-document uploads.

- Recommended next step
- Replace any remaining `FormData` parsing with schema-based validators such as Zod once the project is ready for a broader refactor.

### 3. Supabase / Database Security

- Already implemented
- The app does not expose direct browser writes to checkout/order tables through client-side Supabase calls.

- Improved now
- Added [supabase/add-order-access-token.sql](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/supabase/add-order-access-token.sql) for hashed guest order access tokens.

- Recommended next step
- Review and stage [supabase/security-hardening.sql](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/supabase/security-hardening.sql) before enabling RLS broadly. Current PattayaBev data access uses a server-side `pg` connection, so JWT-aware RLS needs a deliberate rollout to avoid breaking server queries.

### 4. Secure Checkout Flow

- Already implemented
- Server-side checkout already fetched product pricing from the database and computed shipping/totals in [lib/orders.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/orders.ts).

- Improved now
- Checkout creation now rejects tampered cart payloads more aggressively and stores a hashed guest access token with each order.
- Stripe/payment session creation now verifies order ownership/access before creating or reusing a checkout session in [lib/payment-service.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/payment-service.ts) and [app/api/payments/session/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/payments/session/route.ts).
- Guest order links now preserve signed access through payment success/failure/confirmation flows via [lib/order-links.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/order-links.ts).

- Recommended next step
- Add inventory reservation or stock recheck inside the payment-confirmation path if overselling risk matters in production.

### 5. Secrets Management

- Already implemented
- `.env` and `.env.local` are already gitignored.
- I did not find tracked client code exposing Stripe secret keys or Supabase service role keys.

- Improved now
- Added `server-only` boundaries to sensitive modules such as [lib/auth.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/auth.ts), [lib/db.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/db.ts), [lib/security.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/security.ts), and [lib/email.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/email.ts).
- Reduced SMTP detail logging in [lib/email.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/email.ts) so operational logs no longer echo mail server credentials/metadata unnecessarily.

- Recommended next step
- Rotate any real local development secrets that were previously committed to personal machines or shared insecurely, even if they are not tracked in git.

### 6. Session and Account Security

- Already implemented
- BetterAuth email verification was already enabled in [lib/auth.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/auth.ts).

- Improved now
- Raised minimum password length from 8 to 10 in [lib/auth.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/auth.ts).
- Added rate limiting for sign-in, sign-up, resend-verification, and reset-related BetterAuth endpoints in [app/api/auth/[...all]/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/auth/[...all]/route.ts).
- Updated auth-facing error normalization in [lib/auth-utils.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/auth-utils.ts).

- Recommended next step
- Review BetterAuth session lifetime/rotation settings and consider MFA for admin accounts before production launch.

### 7. Upload Security

- Already implemented
- Product/article/promotion uploads were already server-side only.

- Improved now
- Added MIME type, extension, and file-size validation for product/article/promotion images.
- Moved new B2B business-document uploads out of `public/` into private server storage in [app/account/actions.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/account/actions.ts).
- Added authenticated document serving in [app/api/business-documents/[documentId]/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/business-documents/[documentId]/route.ts) and updated admin links through [lib/admin-business.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/admin-business.ts).

- Recommended next step
- Add malware scanning and image/content inspection if uploads will be opened by internal staff from untrusted customers.

### 8. API Abuse Protection

- Already implemented
- Payment webhook processing already stayed server-side.

- Improved now
- Added request rate limiting and safer public error handling on checkout, order-status, payment-session, business-document, and auth endpoints.
- Added security logging for unauthorized order/payment access attempts in [app/api/checkout/orders/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/checkout/orders/route.ts), [app/api/orders/[orderNumber]/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/orders/[orderNumber]/route.ts), [app/api/payments/session/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/payments/session/route.ts), and [app/api/auth/[...all]/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/auth/[...all]/route.ts).

- Recommended next step
- Move rate limiting to a shared distributed store such as Redis/Upstash before multi-instance deployment; the current in-memory limiter is safe for one instance but not globally consistent across many nodes.

## Main Files Changed

- [lib/orders.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/orders.ts): stronger checkout validation, hashed guest access token support, hardened order lookup rules.
- [lib/order-security.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/order-security.ts), [lib/order-access.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/order-access.ts), [lib/order-links.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/order-links.ts): secure guest order access model.
- [components/cart/checkout-page-client.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/components/cart/checkout-page-client.tsx), [components/cart/payment-page-client.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/components/cart/payment-page-client.tsx), [components/cart/payment-status-page-client.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/components/cart/payment-status-page-client.tsx), [components/cart/start-payment-button.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/components/cart/start-payment-button.tsx), [components/cart/order-link-panel.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/components/cart/order-link-panel.tsx): preserved guest checkout usability while enforcing new access rules.
- [app/account/actions.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/account/actions.ts), [app/api/business-documents/[documentId]/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/business-documents/[documentId]/route.ts), [lib/business-documents.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/business-documents.ts), [lib/admin-business.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/admin-business.ts): private business document storage and authenticated document access.
- [app/api/auth/[...all]/route.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/api/auth/[...all]/route.ts), [lib/auth.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/auth.ts), [lib/auth-utils.ts](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/lib/auth-utils.ts): account security hardening.
- [app/admin/layout.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/admin/layout.tsx), [app/manager/layout.tsx](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/app/manager/layout.tsx): frontend route protection.
- [next.config.mjs](/C:/Users/ACER/Desktop/SIIT/Subject/year4-2/sophon_liquor/next.config.mjs): safer default response headers.

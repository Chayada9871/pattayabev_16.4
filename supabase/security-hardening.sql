-- Review before executing in production.
-- PattayaBev currently talks to Postgres through a server-side pg connection.
-- The policies below are intended for Supabase JWT-authenticated access paths
-- such as PostgREST, Supabase client reads, or RPCs that carry auth.uid().
-- If your current DATABASE_URL role does not bypass RLS, test these changes
-- in a staging database first and move user-facing reads/writes to JWT-aware
-- queries or security-definer RPCs before enabling them broadly.

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipping_addresses enable row level security;
alter table public.billing_addresses enable row level security;
alter table public.business_profiles enable row level security;
alter table public.business_documents enable row level security;

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own
  on public.orders
  for select
  to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists order_items_select_own on public.order_items;
create policy order_items_select_own
  on public.order_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()::text
    )
  );

drop policy if exists shipping_addresses_select_own on public.shipping_addresses;
create policy shipping_addresses_select_own
  on public.shipping_addresses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = shipping_addresses.order_id
        and o.user_id = auth.uid()::text
    )
  );

drop policy if exists billing_addresses_select_own on public.billing_addresses;
create policy billing_addresses_select_own
  on public.billing_addresses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = billing_addresses.order_id
        and o.user_id = auth.uid()::text
    )
  );

drop policy if exists business_profiles_select_own on public.business_profiles;
create policy business_profiles_select_own
  on public.business_profiles
  for select
  to authenticated
  using (user_id = auth.uid()::text);

drop policy if exists business_documents_select_own on public.business_documents;
create policy business_documents_select_own
  on public.business_documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.business_profiles bp
      where bp.id = business_documents.business_profile_id
        and bp.user_id = auth.uid()::text
    )
  );

-- Intentionally do not add broad client-side insert/update/delete policies here.
-- Keep writes on the server, or expose narrow security-definer RPCs for the
-- exact mutations you want to allow.

-- If you move uploads to Supabase Storage, keep the bucket private and use
-- per-user policies similar to:
--
-- create policy "business_docs_read_own"
--   on storage.objects
--   for select
--   to authenticated
--   using (
--     bucket_id = 'business-documents'
--     and owner = auth.uid()
--   );
--
-- create policy "business_docs_write_own"
--   on storage.objects
--   for insert
--   to authenticated
--   with check (
--     bucket_id = 'business-documents'
--     and owner = auth.uid()
--   );

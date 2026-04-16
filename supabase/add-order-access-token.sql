alter table if exists public.orders
  add column if not exists guest_access_token_hash text;

create index if not exists idx_orders_guest_access_token_hash
  on public.orders (guest_access_token_hash)
  where guest_access_token_hash is not null;

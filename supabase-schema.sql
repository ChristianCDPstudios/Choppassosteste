create table if not exists public.orders (
  id uuid primary key,
  table_number smallint not null check (table_number between 1 and 20),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  note text not null default '',
  total numeric(10, 2) not null check (total >= 0),
  status text not null default 'novo' check (status in ('novo', 'preparando', 'pronto', 'entregue')),
  created_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

revoke all on public.orders from anon, authenticated;
grant insert on public.orders to anon;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

drop policy if exists "Customers can create new orders" on public.orders;
create policy "Customers can create new orders"
  on public.orders for insert to anon
  with check (status = 'novo');

drop policy if exists "Staff can view orders" on public.orders;
create policy "Staff can view orders"
  on public.orders for select to authenticated
  using (true);

drop policy if exists "Staff can update order status" on public.orders;
create policy "Staff can update order status"
  on public.orders for update to authenticated
  using (true)
  with check (status in ('novo', 'preparando', 'pronto', 'entregue'));

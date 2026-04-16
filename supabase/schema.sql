-- Park Greenhouse database schema
-- Run this in the Supabase SQL Editor once, in order.
-- Idempotent: safe to re-run.

-- ───────────────────────────────────────────────────────────────
-- TABLES
-- ───────────────────────────────────────────────────────────────

create table if not exists public.plants (
  id          text primary key,
  name        text not null,
  variety     text,
  category    text not null,
  size        text,
  price       numeric(10,2) not null default 0,
  quantity    integer not null default 0,
  pack_size   integer not null default 1,
  comments    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.orders (
  id              text primary key,
  customer_name   text not null,
  customer_email  text,
  customer_phone  text,
  notes           text,
  status          text not null default 'pending',
  items           jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

-- Allow-list of admin emails. Any user whose auth email is in this
-- table can write to plants/orders. Seeded with your email below.
create table if not exists public.admins (
  email text primary key
);

-- ───────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────

alter table public.plants  enable row level security;
alter table public.orders  enable row level security;
alter table public.admins  enable row level security;

-- Helper: is the current auth user an admin?
-- SECURITY DEFINER so the query against public.admins bypasses RLS on that
-- table (which itself uses is_admin(), creating infinite recursion without it).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = (auth.jwt() ->> 'email')
  );
$$;

-- PLANTS: anyone can read, only admins can write.
drop policy if exists "plants_read_all"   on public.plants;
drop policy if exists "plants_write_admin" on public.plants;
create policy "plants_read_all"
  on public.plants for select
  using (true);
create policy "plants_write_admin"
  on public.plants for all
  using (public.is_admin())
  with check (public.is_admin());

-- ORDERS: anyone can insert a new order. Only admins can read/update.
-- (Customers submitting checkout don't need to read the orders table.)
drop policy if exists "orders_insert_all"  on public.orders;
drop policy if exists "orders_read_admin"  on public.orders;
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_insert_all"
  on public.orders for insert
  with check (true);
create policy "orders_read_admin"
  on public.orders for select
  using (public.is_admin());
create policy "orders_update_admin"
  on public.orders for update
  using (public.is_admin())
  with check (public.is_admin());

-- ADMINS: only admins can read/write this table.
drop policy if exists "admins_read_admin"  on public.admins;
drop policy if exists "admins_write_admin" on public.admins;
create policy "admins_read_admin"
  on public.admins for select
  using (public.is_admin());
create policy "admins_write_admin"
  on public.admins for all
  using (public.is_admin())
  with check (public.is_admin());

-- ───────────────────────────────────────────────────────────────
-- RPC: submit_order
-- Atomically decrements plant stock and inserts a new order row.
-- Runs as SECURITY DEFINER so anonymous shoppers can decrement plants
-- without having direct write access to the plants table. Any failure
-- (insufficient stock, missing plant) rolls back the whole transaction.
-- ───────────────────────────────────────────────────────────────

create or replace function public.submit_order(
  p_customer_name  text,
  p_customer_email text,
  p_customer_phone text,
  p_notes          text,
  p_items          jsonb
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order public.orders;
  item      jsonb;
  new_id    text := 'ord-' || substr(md5(random()::text || clock_timestamp()::text), 1, 10);
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'customer name required';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'order must contain at least one item';
  end if;

  -- Decrement stock for each line item, failing if any line is short.
  for item in select * from jsonb_array_elements(p_items) loop
    update public.plants
       set quantity   = quantity - (item->>'quantity')::int,
           updated_at = now()
     where id = item->>'plantId'
       and quantity >= (item->>'quantity')::int;
    if not found then
      raise exception 'insufficient stock for plant %', item->>'plantId';
    end if;
  end loop;

  insert into public.orders (id, customer_name, customer_email, customer_phone, notes, status, items)
  values (new_id, p_customer_name, p_customer_email, p_customer_phone, coalesce(p_notes, ''), 'pending', p_items)
  returning * into new_order;

  return new_order;
end;
$$;

grant execute on function public.submit_order(text, text, text, text, jsonb) to anon, authenticated;

-- ───────────────────────────────────────────────────────────────
-- SEED DATA
-- ───────────────────────────────────────────────────────────────

-- Matches SEED_PLANTS from src/App.jsx. Upsert so re-runs don't duplicate.
insert into public.plants (id, name, variety, category, size, price, quantity, pack_size, comments) values
  ('p1',  'Japanese Maple',        'Bloodgood',                 'Trees',      '5 gal',  45.00,  24, 1,  'Fall color specimen'),
  ('p2',  'Lavender',              'Hidcote',                   'Perennials', '1 gal',   8.50, 120, 18, 'Fragrant, drought tolerant'),
  ('p3',  'Knockout Rose',         'Double Red',                'Shrubs',     '3 gal',  22.00,  56, 8,  'Disease resistant, reblooming'),
  ('p4',  'Blue Fescue',           'Elijah Blue',               'Grasses',    '1 gal',   6.00, 200, 32, 'Silver-blue foliage'),
  ('p5',  'Dwarf Alberta Spruce',  'Conica',                    'Trees',      '5 gal',  38.00,  18, 1,  'Slow growing, conical form'),
  ('p6',  'Hosta',                 'Sum & Substance',           'Perennials', '1 gal',  12.00,  80, 12, 'Giant chartreuse leaves'),
  ('p7',  'Crepe Myrtle',          'Natchez',                   'Trees',      '15 gal', 89.00,   8, 1,  'White blooms, exfoliating bark'),
  ('p8',  'Boxwood',               'Green Velvet',              'Shrubs',     '3 gal',  18.50,   0, 10, 'Dense, formal hedging'),
  ('p9',  'Daylily',               'Stella de Oro',             'Perennials', '1 gal',   7.00, 150, 18, 'Reblooming yellow'),
  ('p10', 'Maiden Grass',          'Gracillimus',               'Grasses',    '3 gal',  16.00,  45, 6,  'Graceful plumes in fall'),
  ('p11', 'Hydrangea',             'Endless Summer',            'Shrubs',     '3 gal',  28.00,  35, 6,  'Reblooming, color-changing'),
  ('p12', 'Japanese Maple',        'Crimson Queen',             'Trees',      '15 gal', 125.00,  6, 1,  'Weeping form, red lace-leaf'),
  ('p13', 'Salvia',                'May Night',                 'Perennials', '1 gal',   7.50,  90, 18, 'Long blooming, hummingbird magnet'),
  ('p14', 'Arborvitae',            'Green Giant',               'Trees',      '5 gal',  32.00,  40, 4,  'Fast growing privacy screen'),
  ('p15', 'Knockout Rose',         'Pink',                      'Shrubs',     '3 gal',  22.00,  42, 8,  'Disease resistant'),
  ('p16', 'Black-Eyed Susan',      'Goldsturm',                 'Perennials', '1 gal',   6.50, 110, 18, 'Native wildflower, drought tolerant'),
  ('p17', 'Fountain Grass',        'Rubrum',                    'Grasses',    '3 gal',  14.00,  60, 8,  'Burgundy foliage, annual in cold zones'),
  ('p18', 'Azalea',                'Encore Autumn Amethyst',    'Shrubs',     '3 gal',  19.00,   3, 6,  'Spring bloomer, evergreen')
on conflict (id) do nothing;

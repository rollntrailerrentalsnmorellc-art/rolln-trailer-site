-- Run once in the Roll'N Supabase SQL editor before enabling dashboard tracking.
-- Requests remain owner-only. Public submissions use the existing server-side service key.
begin;

create extension if not exists btree_gist with schema extensions;

create table if not exists public.equipment_inventory (
  id text primary key,
  status text not null default 'available' check (status in ('available','maintenance','inactive')),
  updated_at timestamptz not null default now()
);

insert into public.equipment_inventory (id) values
  ('generac-gp6500'),
  ('predator-earth-auger'),
  ('werner-mt26-ladder'),
  ('single-stack-baker-scaffold')
on conflict (id) do nothing;

create table if not exists public.equipment_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  equipment_id text not null references public.equipment_inventory(id),
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  intended_use text not null,
  quote_cents integer not null check (quote_cents >= 0),
  deposit_cents integer not null check (deposit_cents >= 0),
  status text not null default 'requested' check (status in ('requested','held','active','completed','declined')),
  owner_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_at > pickup_at)
);

create index if not exists equipment_requests_owner_queue on public.equipment_requests (status, pickup_at);
create index if not exists equipment_requests_item_history on public.equipment_requests (equipment_id, created_at desc);

-- Held and active rentals cannot overlap for the same physical item.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'equipment_requests_no_overlap') then
    alter table public.equipment_requests add constraint equipment_requests_no_overlap
      exclude using gist (equipment_id with =, tstzrange(pickup_at, return_at, '[)') with &&)
      where (status in ('held','active'));
  end if;
end $$;

alter table public.equipment_inventory enable row level security;
alter table public.equipment_requests enable row level security;
-- No anon/authenticated policies: server actions check owner/staff before using service key.
commit;

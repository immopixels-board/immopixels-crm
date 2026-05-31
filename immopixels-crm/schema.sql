-- ImmoPixels CRM — Supabase Schema
-- Futtatd a Supabase SQL Editor-ban

-- STAFF (Mitarbeiter)
create table if not exists staff (
  id uuid default gen_random_uuid() primary key,
  init text not null,
  name text not null,
  role text,
  email text,
  tel text,
  cal_id text,
  color text default '#b8892a',
  avatar_url text,
  created_at timestamptz default now()
);

-- CLIENTS (Ügyfelek)
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  addr text,
  email text,
  tel text,
  vat text,
  category text default 'Maklerunternehmen',
  contact_name text,
  contact_email text,
  contact_tel text,
  created_at timestamptz default now()
);

-- COLUMNS (Board oszlopok)
create table if not exists columns (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  dot_color text default '#9c9589',
  position integer not null,
  created_at timestamptz default now()
);

-- CARDS (Kártyák)
create table if not exists cards (
  id uuid default gen_random_uuid() primary key,
  column_id uuid references columns(id) on delete cascade,
  title text not null,
  addr text,
  description text,
  client_name text,
  card_date date,
  card_time time,
  card_type text default 'foto',
  price integer default 0,
  note text,
  is_gcal boolean default false,
  is_todo boolean default false,
  gcal_id text,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CARD_TEAM (kártya ↔ staff kapcsolat)
create table if not exists card_team (
  card_id uuid references cards(id) on delete cascade,
  staff_id uuid references staff(id) on delete cascade,
  primary key (card_id, staff_id)
);

-- CHECKLIST items
create table if not exists checklist_items (
  id uuid default gen_random_uuid() primary key,
  card_id uuid references cards(id) on delete cascade,
  text text not null,
  done boolean default false,
  position integer default 0
);

-- Default columns
insert into columns (title, dot_color, position) values
  ('Shootings', '#1d5ec7', 0),
  ('Reels', '#6d28d9', 1),
  ('Visszaigazolt', '#15803d', 2),
  ('Elvégzés alatt', '#a16207', 3),
  ('Leadás / Edit', '#1d5ec7', 4),
  ('Számlázás', '#b91c1c', 5),
  ('Kész', '#15803d', 6)
on conflict do nothing;

-- Default staff
insert into staff (init, name, role, email, tel, cal_id, color) values
  ('CD', 'Cristian Dina', 'Vezető / Fotós', 'cristian@immopixels.de', '', 'immopixels@gmail.com', '#b8892a'),
  ('DB', 'Daniel Bene', 'Videós / Cutter', 'd.bene@immopixels.de', '+49 176 60950921', 'daniel@immopixels.de', '#1d5ec7'),
  ('EL', 'Elias Kutscha', 'Fotós / Drón', 'apple3@immopixels.de', '+49 178 5585497', 'elias@immopixels.de', '#15803d'),
  ('NS', 'Nurefsan Sahan', 'Backoffice', 'n.sahan@immopixels.de', '+49 176 20243153', '', '#6d28d9'),
  ('CA', 'Caro', 'Social Media', 'caroline@immopixels.de', '', '', '#b91c1c')
on conflict do nothing;

-- RLS (Row Level Security) — egyenlőre mindenki olvashat/írhat
alter table staff enable row level security;
alter table clients enable row level security;
alter table columns enable row level security;
alter table cards enable row level security;
alter table card_team enable row level security;
alter table checklist_items enable row level security;

create policy "public access" on staff for all using (true) with check (true);
create policy "public access" on clients for all using (true) with check (true);
create policy "public access" on columns for all using (true) with check (true);
create policy "public access" on cards for all using (true) with check (true);
create policy "public access" on card_team for all using (true) with check (true);
create policy "public access" on checklist_items for all using (true) with check (true);

-- Realtime engedélyezés
alter publication supabase_realtime add table cards;
alter publication supabase_realtime add table columns;
alter publication supabase_realtime add table checklist_items;

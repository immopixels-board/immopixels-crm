-- ImmoPixels CRM v2.2.4
-- Notifications click-to-card + card comments with @mentions

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists recipient_id uuid;
alter table public.notifications add column if not exists sender_id uuid;
alter table public.notifications add column if not exists type text default 'card_mention';
alter table public.notifications add column if not exists card_id uuid;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists read boolean default false;

alter table public.notifications enable row level security;
do $$ begin
  create policy "public access notifications" on public.notifications for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists notifications_recipient_idx on public.notifications(recipient_id);
create index if not exists notifications_card_idx on public.notifications(card_id);
create index if not exists notifications_created_idx on public.notifications(created_at desc);

create table if not exists public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references public.cards(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete set null,
  message text not null,
  mentioned_staff_ids uuid[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.card_comments enable row level security;
do $$ begin
  create policy "public access card_comments" on public.card_comments for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create index if not exists card_comments_card_idx on public.card_comments(card_id);
create index if not exists card_comments_created_idx on public.card_comments(created_at);

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.card_comments;
exception when duplicate_object then null;
end $$;

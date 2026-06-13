-- =====================================================================
-- Connect! · Stage 1 schema + RLS  (migration 1 of 2)
-- Tables per CLAUDE.md §6. RLS on every table. Read-time computation
-- preferred over triggers/cron (see §5).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ============ VENUES ============
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text,
  location text,
  sports text[],
  created_at timestamptz not null default now()
);

-- ============ USERS (profile, 1:1 with auth.users) ============
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  avatar_url text,
  sport text,
  skill_level text,
  language text not null default 'en' check (language in ('en','ar')),
  dob date,
  attendance_rate numeric not null default 100,
  created_at timestamptz not null default now()
);

-- ============ MATCHES ============
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.users(id) on delete cascade,
  sport text not null,
  venue_id uuid references public.venues(id),
  venue_name text,
  venue_location text,
  court_number text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  skill_level text,
  total_spots int not null check (total_spots > 0),
  spots_available int not null check (spots_available >= 0),
  fee_total numeric not null default 0,
  fee_per_player numeric not null default 0,
  join_mode text not null default 'open' check (join_mode in ('open','approval','invite')),
  status text not null default 'open' check (status in ('open','full','live','completed','closed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

-- ============ MATCH_PLAYERS ============
create table public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  attended boolean,
  unique(match_id, player_id)
);

-- ============ MATCH_REQUESTS (request / invite / waitlist) ============
create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('request','invite','waitlist')),
  status text not null check (status in (
    'requested','invited','waitlisted','approved','accepted','promoted','joined','declined','left','expired'
  )),
  created_at timestamptz not null default now(),
  unique(match_id, player_id, kind)
);

-- ============ NO_SHOW_REPORTS ============
create table public.no_show_reports (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  reported_player uuid not null references public.users(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(match_id, reported_player, reporter_id)
);

-- ============ MATCH_RESULTS ============
create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.users(id) on delete cascade,
  result text check (result in ('win','loss','draw')),
  unique(match_id, player_id)
);

-- ============ NOTIFICATIONS ============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text,
  title_en text, title_ar text,
  body_en text,  body_ar text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ INDEXES ============
create index idx_matches_host    on public.matches(host_id);
create index idx_matches_status  on public.matches(status);
create index idx_mp_match        on public.match_players(match_id);
create index idx_mp_player       on public.match_players(player_id);
create index idx_mr_match_kind   on public.match_requests(match_id, kind, created_at);
create index idx_mr_player       on public.match_requests(player_id);
create index idx_notif_user      on public.notifications(user_id, is_read);

-- ============ RLS ============
alter table public.venues          enable row level security;
alter table public.users           enable row level security;
alter table public.matches         enable row level security;
alter table public.match_players   enable row level security;
alter table public.match_requests  enable row level security;
alter table public.no_show_reports enable row level security;
alter table public.match_results   enable row level security;
alter table public.notifications   enable row level security;

create policy venues_read on public.venues for select to authenticated using (true);

create policy users_read        on public.users for select to authenticated using (true);
create policy users_insert_self on public.users for insert to authenticated with check (id = auth.uid());
create policy users_update_self on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy matches_read        on public.matches for select to authenticated using (true);
create policy matches_insert_host on public.matches for insert to authenticated with check (host_id = auth.uid());
create policy matches_update_host on public.matches for update to authenticated using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy matches_delete_host on public.matches for delete to authenticated using (host_id = auth.uid());

create policy mp_read        on public.match_players for select to authenticated using (true);
create policy mp_delete_self on public.match_players for delete to authenticated using (player_id = auth.uid());

create policy mr_read on public.match_requests for select to authenticated
  using (player_id = auth.uid() or exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()));
create policy mr_player_insert on public.match_requests for insert to authenticated
  with check (player_id = auth.uid());
create policy mr_update on public.match_requests for update to authenticated
  using (player_id = auth.uid() or exists (select 1 from public.matches m where m.id = match_id and m.host_id = auth.uid()));

create policy nsr_read on public.no_show_reports for select to authenticated
  using (reporter_id = auth.uid() or reported_player = auth.uid()
         or exists (select 1 from public.match_players mp where mp.match_id = no_show_reports.match_id and mp.player_id = auth.uid()));
create policy nsr_insert on public.no_show_reports for insert to authenticated
  with check (reporter_id = auth.uid());

create policy results_read        on public.match_results for select to authenticated using (true);
create policy results_insert_self on public.match_results for insert to authenticated with check (player_id = auth.uid());

create policy notif_read   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

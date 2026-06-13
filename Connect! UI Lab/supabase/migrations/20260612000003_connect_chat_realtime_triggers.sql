-- =====================================================================
-- Connect! · Stage 1 backend completion  (migration 3 of 3)
-- Closes the gaps before the client is wired to Supabase:
--   1. chat_threads / chat_messages (+ RLS)            → real chat
--   2. group-thread auto-creation + participant sync   → no client thread mgmt
--   3. get_or_create_dm RPC                            → 1:1 DMs, never forked
--   4. handle_new_user trigger                         → profile per sign-up
--   5. set_attendance RPC                              → post-match (no UPDATE RLS gap)
--   6. Realtime publication + REPLICA IDENTITY         → cross-window live updates
-- All idempotent. SECURITY DEFINER funcs pin search_path = public.
-- =====================================================================

-- ============ CHAT THREADS ============
-- One canonical thread per match (match_id set) or per DM pair (match_id null).
-- participant_ids is the live membership; for group threads it's kept in sync
-- with match_players by trigger, so the client never manages it (CLAUDE.md §5).
create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  match_id uuid unique references public.matches(id) on delete cascade,
  participant_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null,
  system boolean not null default false,  -- system line (joined / created / result)
  tone text,                               -- SystemTone: info|wait|pos|warm|alert
  icon text,                               -- SystemIcon: flag|userPlus|…
  created_at timestamptz not null default now()
);

create index if not exists idx_cm_thread       on public.chat_messages(thread_id, created_at);
create index if not exists idx_ct_participants  on public.chat_threads using gin(participant_ids);

alter table public.chat_threads  enable row level security;
alter table public.chat_messages enable row level security;

-- threads: you can read a thread you're a participant of. Creation/updates happen
-- only via SECURITY DEFINER triggers/RPCs (which bypass RLS), so no insert/update
-- policy is granted to authenticated — keeps thread membership tamper-proof.
drop policy if exists ct_read on public.chat_threads;
create policy ct_read on public.chat_threads for select to authenticated
  using (auth.uid() = any(participant_ids));

-- messages: read if you're in the thread; insert only your own messages into a
-- thread you belong to. System lines are written by definer funcs, not here.
drop policy if exists cm_read on public.chat_messages;
create policy cm_read on public.chat_messages for select to authenticated
  using (exists (select 1 from public.chat_threads t
                  where t.id = thread_id and auth.uid() = any(t.participant_ids)));
drop policy if exists cm_insert on public.chat_messages;
create policy cm_insert on public.chat_messages for insert to authenticated
  with check (sender_id = auth.uid()
    and exists (select 1 from public.chat_threads t
                 where t.id = thread_id and auth.uid() = any(t.participant_ids)));

-- ---------- group thread: auto-create on match insert ----------
create or replace function public._create_match_thread()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.chat_threads(match_id, participant_ids)
  values (new.id, array[new.host_id])
  on conflict (match_id) do nothing;
  insert into public.chat_messages(thread_id, sender_id, body, system, tone, icon)
  select t.id, new.host_id, 'Match created', true, 'info', 'flag'
  from public.chat_threads t where t.match_id = new.id;
  return new;
end; $$;
drop trigger if exists trg_match_thread on public.matches;
create trigger trg_match_thread after insert on public.matches
  for each row execute function public._create_match_thread();

-- ---------- group thread: add player + post "joined" on membership insert ----------
create or replace function public._sync_thread_on_join()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_thread uuid; v_host uuid; v_name text;
begin
  select t.id, m.host_id into v_thread, v_host
    from public.chat_threads t join public.matches m on m.id = t.match_id
   where t.match_id = new.match_id;
  if v_thread is null then return new; end if;
  update public.chat_threads
     set participant_ids = (select array(select distinct e from unnest(participant_ids || new.player_id) e))
   where id = v_thread;
  if new.player_id <> v_host then  -- host's own membership is covered by "Match created"
    select coalesce(split_part(name,' ',1), 'A player') into v_name
      from public.users where id = new.player_id;
    insert into public.chat_messages(thread_id, sender_id, body, system, tone, icon)
    values (v_thread, new.player_id, coalesce(v_name,'A player') || ' joined', true, 'info', 'userPlus');
  end if;
  return new;
end; $$;
drop trigger if exists trg_thread_join on public.match_players;
create trigger trg_thread_join after insert on public.match_players
  for each row execute function public._sync_thread_on_join();

-- ---------- group thread: drop player on cancel ----------
create or replace function public._sync_thread_on_leave()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.chat_threads
     set participant_ids = array_remove(participant_ids, old.player_id)
   where match_id = old.match_id;
  return old;
end; $$;
drop trigger if exists trg_thread_leave on public.match_players;
create trigger trg_thread_leave after delete on public.match_players
  for each row execute function public._sync_thread_on_leave();

-- ---------- backfill threads for the seeded matches ----------
insert into public.chat_threads(match_id, participant_ids)
select m.id, coalesce(array(select mp.player_id from public.match_players mp where mp.match_id = m.id), array[m.host_id])
from public.matches m
where not exists (select 1 from public.chat_threads t where t.match_id = m.id);

-- ---------- DM: one canonical 1:1 thread, never forked ----------
create or replace function public.get_or_create_dm(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_other = v_actor then raise exception 'cannot DM yourself'; end if;
  select id into v_id from public.chat_threads
   where match_id is null
     and participant_ids @> array[v_actor, p_other]
     and array_length(participant_ids, 1) = 2
   limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.chat_threads(match_id, participant_ids)
  values (null, array[v_actor, p_other]) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.get_or_create_dm(uuid) from public, anon;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- ============ PROFILE AUTO-PROVISION on sign-up ============
-- Every new auth user gets a public.users row (name from metadata, else email
-- local-part) so they are immediately visible/invitable. Onboarding later
-- updates sport/skill/dob via the users_update_self policy.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users(id, name, email)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- internal trigger functions are not REST-callable (mirror migration 2)
revoke all on function public._create_match_thread()  from public, anon, authenticated;
revoke all on function public._sync_thread_on_join()  from public, anon, authenticated;
revoke all on function public._sync_thread_on_leave() from public, anon, authenticated;
revoke all on function public.handle_new_user()       from public, anon, authenticated;

-- ============ ATTENDANCE RPC (post-match step 1) ============
-- match_players has no UPDATE policy by design; attendance flips go through this
-- definer RPC. Any participant of the match can record (host + players, §5).
create or replace function public.set_attendance(p_match uuid, p_player uuid, p_attended boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match and player_id = v_actor)
    then raise exception 'only participants can record attendance'; end if;
  update public.match_players set attended = p_attended
   where match_id = p_match and player_id = p_player;
  return jsonb_build_object('ok', true);
end; $$;
revoke all on function public.set_attendance(uuid, uuid, boolean) from public, anon;
grant execute on function public.set_attendance(uuid, uuid, boolean) to authenticated;

-- ============ REALTIME ============
-- Full row image so the client sees player_id/match_id on UPDATE/DELETE events
-- (cancel removes a match_players row; promotion mutates requests).
alter table public.matches         replica identity full;
alter table public.match_players   replica identity full;
alter table public.match_requests  replica identity full;
alter table public.chat_threads    replica identity full;

do $$
declare t text;
begin
  foreach t in array array[
    'matches','match_players','match_requests','match_results',
    'chat_threads','chat_messages','notifications'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

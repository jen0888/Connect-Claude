-- "Ladies only" gender restriction on matches (Stage 1).
-- 'mixed' = open to all; 'ladies' = female players only. Enum leaves room for a
-- future 'men' value (NOT built now). Enforcement is SERVER-SIDE: a host-gating
-- trigger on matches, a hard join-gate trigger on match_players (covers every
-- join path incl. waitlist promotion), explicit raises in the flow RPCs (clear
-- 'gender_restricted' error), and a defensive RLS WITH CHECK on match_requests.
-- Applied live to project ybmvzhpcuwapayhjhmzd on 2026-06-15.

-- 1. Column ---------------------------------------------------------------
alter table public.matches
  add column if not exists gender_restriction text not null default 'mixed';

do $$ begin
  alter table public.matches
    add constraint matches_gender_restriction_chk
    check (gender_restriction in ('mixed','ladies'));
exception when duplicate_object then null; end $$;

-- 2. Helper: is this user female? -----------------------------------------
create or replace function public._is_female(uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (select 1 from public.users where id = uid and gender = 'female');
$$;

-- 3. Host-side guard: a 'ladies' match's host MUST be female. Fires on the
--    create_match RPC AND the direct (RLS) UPDATE used by Match Edit. --------
create or replace function public._enforce_match_host_gender()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.gender_restriction = 'ladies' and not public._is_female(new.host_id) then
    raise exception 'gender_restricted';
  end if;
  return new;
end; $$;

drop trigger if exists trg_match_host_gender on public.matches;
create trigger trg_match_host_gender
  before insert or update of gender_restriction, host_id on public.matches
  for each row execute function public._enforce_match_host_gender();

-- 4. Hard join gate: never seat a non-female in a 'ladies' match. Backstop
--    under EVERY join path; fires even inside SECURITY DEFINER RPCs. ---------
create or replace function public._enforce_player_gender()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_restriction text;
begin
  select gender_restriction into v_restriction from public.matches where id = new.match_id;
  if v_restriction = 'ladies' and not public._is_female(new.player_id) then
    raise exception 'gender_restricted';
  end if;
  return new;
end; $$;

drop trigger if exists trg_player_gender on public.match_players;
create trigger trg_player_gender
  before insert on public.match_players
  for each row execute function public._enforce_player_gender();

-- 5. Defensive RLS on direct request/waitlist inserts ----------------------
drop policy if exists mr_player_insert on public.match_requests;
create policy mr_player_insert on public.match_requests
  for insert
  with check (
    player_id = auth.uid()
    and (
      not exists (
        select 1 from public.matches m
        where m.id = match_requests.match_id and m.gender_restriction = 'ladies'
      )
      or public._is_female(player_id)
    )
  );

-- 6. create_match — recreated with a p_gender_restriction param ------------
drop function if exists public.create_match(text,text,uuid,text,text,text,timestamptz,timestamptz,text,text,integer,numeric,numeric,text,text);

create or replace function public.create_match(
  p_sport text, p_name text, p_venue_id uuid, p_venue_name text, p_venue_location text,
  p_court_number text, p_start timestamptz, p_end timestamptz, p_skill_min text, p_skill_max text,
  p_total_spots integer, p_fee_total numeric, p_fee_per_player numeric, p_join_mode text, p_notes text,
  p_gender_restriction text default 'mixed')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_total_spots is null or p_total_spots < 1 then raise exception 'total_spots must be >= 1'; end if;
  if coalesce(p_gender_restriction,'mixed') not in ('mixed','ladies') then raise exception 'bad gender_restriction'; end if;
  insert into public.matches(
    host_id, sport, name, venue_id, venue_name, venue_location, court_number,
    start_time, end_time, skill_min, skill_max, total_spots, spots_available,
    fee_total, fee_per_player, join_mode, status, notes, gender_restriction)
  values (
    v_actor, p_sport, p_name, p_venue_id, p_venue_name, p_venue_location, p_court_number,
    p_start, p_end, p_skill_min, p_skill_max, p_total_spots, greatest(p_total_spots - 1, 0),
    coalesce(p_fee_total, 0), coalesce(p_fee_per_player, 0),
    coalesce(p_join_mode, 'open'), 'open', p_notes, coalesce(p_gender_restriction,'mixed'))
  returning id into v_id;
  insert into public.match_players(match_id, player_id) values (v_id, v_actor)
    on conflict (match_id, player_id) do nothing;
  return v_id;
end; $function$;

-- 7. join_match -----------------------------------------------------------
create or replace function public.join_match(p_match uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_actor uuid := auth.uid(); m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
  if m.gender_restriction = 'ladies' and not public._is_female(v_actor) then raise exception 'gender_restricted'; end if;
  if m.status = 'full' then raise exception 'match is full — use join_waitlist'; end if;
  if m.status <> 'open' then raise exception 'match not open (status=%)', m.status; end if;
  if m.join_mode <> 'open' then raise exception 'this match requires % — not direct join', m.join_mode; end if;
  if exists (select 1 from public.match_players where match_id = p_match and player_id = v_actor)
    then raise exception 'already joined'; end if;
  if m.spots_available <= 0 then raise exception 'no spots'; end if;

  insert into public.match_players(match_id, player_id) values (p_match, v_actor);
  update public.matches set spots_available = spots_available - 1 where id = p_match;
  perform public._fill_if_full(p_match);
  perform public._notify(m.host_id, 'join', 'New player joined', 'A player joined your match.');
  return jsonb_build_object('ok', true, 'action', 'joined');
end; $function$;

-- 8. request_to_join ------------------------------------------------------
create or replace function public.request_to_join(p_match uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_actor uuid := auth.uid(); m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
  if m.gender_restriction = 'ladies' and not public._is_female(v_actor) then raise exception 'gender_restricted'; end if;
  if m.join_mode <> 'approval' then raise exception 'match is not approval-mode'; end if;
  if m.status not in ('open') then raise exception 'match not open (status=%)', m.status; end if;
  if exists (select 1 from public.match_players where match_id = p_match and player_id = v_actor)
    then raise exception 'already joined'; end if;

  insert into public.match_requests(match_id, player_id, kind, status)
  values (p_match, v_actor, 'request', 'requested')
  on conflict (match_id, player_id, kind)
  do update set status = 'requested', created_at = now();
  perform public._notify(m.host_id, 'request', 'Join request', 'A player requested to join your match.');
  return jsonb_build_object('ok', true, 'action', 'requested');
end; $function$;

-- 9. join_waitlist --------------------------------------------------------
create or replace function public.join_waitlist(p_match uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_actor uuid := auth.uid(); m public.matches; v_pos int;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
  if m.gender_restriction = 'ladies' and not public._is_female(v_actor) then raise exception 'gender_restricted'; end if;
  if m.status <> 'full' then raise exception 'waitlist is only for full matches (status=%)', m.status; end if;
  if m.host_id = v_actor then raise exception 'host cannot waitlist own match'; end if;
  if exists (select 1 from public.match_players where match_id = p_match and player_id = v_actor)
    then raise exception 'you already joined this match'; end if;

  insert into public.match_requests(match_id, player_id, kind, status)
  values (p_match, v_actor, 'waitlist', 'waitlisted')
  on conflict (match_id, player_id, kind)
  do update set status = 'waitlisted', created_at = now();

  select count(*) into v_pos from public.match_requests
   where match_id = p_match and kind = 'waitlist' and status = 'waitlisted';
  return jsonb_build_object('ok', true, 'action', 'waitlisted', 'position', v_pos);
end; $function$;

-- 10. accept_invite -------------------------------------------------------
create or replace function public.accept_invite(p_request uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_actor uuid := auth.uid(); r public.match_requests; m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into r from public.match_requests where id = p_request for update;
  if not found then raise exception 'invite not found'; end if;
  if r.player_id <> v_actor then raise exception 'this invite is not yours'; end if;
  if r.kind <> 'invite' or r.status <> 'invited' then raise exception 'not an open invite'; end if;
  select * into m from public.matches where id = r.match_id for update;
  if m.gender_restriction = 'ladies' and not public._is_female(v_actor) then raise exception 'gender_restricted'; end if;
  if m.spots_available <= 0 then raise exception 'match already full'; end if;

  update public.match_requests set status = 'joined' where id = p_request;
  insert into public.match_players(match_id, player_id) values (r.match_id, v_actor)
    on conflict do nothing;
  update public.matches set spots_available = spots_available - 1 where id = r.match_id;
  perform public._fill_if_full(r.match_id);
  perform public._notify(m.host_id, 'invite_accepted', 'Invite accepted', 'An invited player joined your match.');
  return jsonb_build_object('ok', true, 'action', 'invite_accepted_joined');
end; $function$;

-- 11. invite_player -------------------------------------------------------
create or replace function public.invite_player(p_match uuid, p_player uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_actor uuid := auth.uid(); m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
  if m.host_id <> v_actor then raise exception 'only the host can invite'; end if;
  if m.gender_restriction = 'ladies' and not public._is_female(p_player) then raise exception 'gender_restricted'; end if;
  if m.status not in ('open') then raise exception 'match not open (status=%)', m.status; end if;
  if exists (select 1 from public.match_players where match_id = p_match and player_id = p_player)
    then raise exception 'player already joined'; end if;

  insert into public.match_requests(match_id, player_id, kind, status)
  values (p_match, p_player, 'invite', 'invited')
  on conflict (match_id, player_id, kind)
  do update set status = 'invited', created_at = now();
  perform public._notify(p_player, 'invite', 'Match invite', 'You were invited to a match.');
  return jsonb_build_object('ok', true, 'action', 'invited');
end; $function$;

-- 12. cancel_participation — FIFO promotion skips non-female waitlisters on a
--     'ladies' match (promote the earliest ELIGIBLE entry, §5) -------------
create or replace function public.cancel_participation(p_match uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_actor uuid := auth.uid(); m public.matches; w public.match_requests; v_promoted uuid;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
  if not exists (select 1 from public.match_players where match_id = p_match and player_id = v_actor)
    then raise exception 'you are not in this match'; end if;

  delete from public.match_players where match_id = p_match and player_id = v_actor;
  update public.matches
     set spots_available = spots_available + 1,
         status = case when status = 'full' then 'open' else status end
   where id = p_match;

  if m.start_time > now() then
    select * into w from public.match_requests mr
      where mr.match_id = p_match and mr.kind = 'waitlist' and mr.status = 'waitlisted'
        and (m.gender_restriction <> 'ladies' or public._is_female(mr.player_id))
      order by mr.created_at asc limit 1 for update skip locked;
    if found then
      update public.match_requests set status = 'joined' where id = w.id;
      insert into public.match_players(match_id, player_id) values (p_match, w.player_id)
        on conflict do nothing;
      update public.matches set spots_available = spots_available - 1 where id = p_match;
      perform public._fill_if_full(p_match);
      perform public._notify(w.player_id, 'promoted', 'You''re in!', 'A spot opened and you were auto-promoted from the waitlist.');
      v_promoted := w.player_id;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'action', 'cancelled', 'promoted_player', v_promoted);
end; $function$;

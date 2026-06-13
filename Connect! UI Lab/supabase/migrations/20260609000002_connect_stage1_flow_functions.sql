-- =====================================================================
-- Connect! · Stage 1 flow RPCs  (migration 2 of 2)
-- join / request / invite / waitlist + cancel(FIFO auto-promote).
-- All SECURITY DEFINER, actor = auth.uid(). Rules per CLAUDE.md §5:
-- no slot-hold while pending; pending requests/invites expire on fill;
-- FIFO waitlist promotion runs inside cancel (no cron/trigger);
-- promotion only before start_time.
-- =====================================================================

-- ---------- internal helper: notify ----------
create or replace function public._notify(p_user uuid, p_type text, p_title text, p_body text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id, type, title_en, body_en)
  values (p_user, p_type, p_title, p_body);
$$;

-- ---------- internal helper: mark full + expire pending ----------
create or replace function public._fill_if_full(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.matches set status = 'full'
   where id = p_match and spots_available = 0 and status = 'open';
  if (select spots_available from public.matches where id = p_match) = 0 then
    update public.match_requests
       set status = 'expired'
     where match_id = p_match
       and kind in ('request','invite')
       and status in ('requested','invited');
  end if;
end;
$$;

-- ---------- OPEN: self-join ----------
create or replace function public.join_match(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
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
end;
$$;

-- ---------- APPROVAL: player requests ----------
create or replace function public.request_to_join(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
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
end;
$$;

-- ---------- APPROVAL: host approves ----------
create or replace function public.approve_request(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); r public.match_requests; m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into r from public.match_requests where id = p_request for update;
  if not found then raise exception 'request not found'; end if;
  select * into m from public.matches where id = r.match_id for update;
  if m.host_id <> v_actor then raise exception 'only the host can approve'; end if;
  if r.kind <> 'request' or r.status <> 'requested' then raise exception 'not an open request'; end if;
  if m.spots_available <= 0 then raise exception 'match already full'; end if;

  update public.match_requests set status = 'joined' where id = p_request;
  insert into public.match_players(match_id, player_id) values (r.match_id, r.player_id)
    on conflict do nothing;
  update public.matches set spots_available = spots_available - 1 where id = r.match_id;
  perform public._fill_if_full(r.match_id);
  perform public._notify(r.player_id, 'approved', 'Request approved', 'Your join request was approved.');
  return jsonb_build_object('ok', true, 'action', 'approved_joined');
end;
$$;

create or replace function public.decline_request(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); r public.match_requests; m public.matches;
begin
  select * into r from public.match_requests where id = p_request for update;
  select * into m from public.matches where id = r.match_id;
  if m.host_id <> v_actor then raise exception 'only the host can decline'; end if;
  update public.match_requests set status = 'declined' where id = p_request;
  perform public._notify(r.player_id, 'declined', 'Request declined', 'Your join request was declined.');
  return jsonb_build_object('ok', true, 'action', 'declined');
end;
$$;

-- ---------- INVITE: host invites a player ----------
create or replace function public.invite_player(p_match uuid, p_player uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
  if m.host_id <> v_actor then raise exception 'only the host can invite'; end if;
  if m.status not in ('open') then raise exception 'match not open (status=%)', m.status; end if;
  if exists (select 1 from public.match_players where match_id = p_match and player_id = p_player)
    then raise exception 'player already joined'; end if;

  insert into public.match_requests(match_id, player_id, kind, status)
  values (p_match, p_player, 'invite', 'invited')
  on conflict (match_id, player_id, kind)
  do update set status = 'invited', created_at = now();
  perform public._notify(p_player, 'invite', 'Match invite', 'You were invited to a match.');
  return jsonb_build_object('ok', true, 'action', 'invited');
end;
$$;

-- ---------- INVITE: player accepts ----------
create or replace function public.accept_invite(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); r public.match_requests; m public.matches;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into r from public.match_requests where id = p_request for update;
  if not found then raise exception 'invite not found'; end if;
  if r.player_id <> v_actor then raise exception 'this invite is not yours'; end if;
  if r.kind <> 'invite' or r.status <> 'invited' then raise exception 'not an open invite'; end if;
  select * into m from public.matches where id = r.match_id for update;
  if m.spots_available <= 0 then raise exception 'match already full'; end if;

  update public.match_requests set status = 'joined' where id = p_request;
  insert into public.match_players(match_id, player_id) values (r.match_id, v_actor)
    on conflict do nothing;
  update public.matches set spots_available = spots_available - 1 where id = r.match_id;
  perform public._fill_if_full(r.match_id);
  perform public._notify(m.host_id, 'invite_accepted', 'Invite accepted', 'An invited player joined your match.');
  return jsonb_build_object('ok', true, 'action', 'invite_accepted_joined');
end;
$$;

create or replace function public.decline_invite(p_request uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); r public.match_requests;
begin
  select * into r from public.match_requests where id = p_request for update;
  if r.player_id <> v_actor then raise exception 'this invite is not yours'; end if;
  update public.match_requests set status = 'declined' where id = p_request;
  return jsonb_build_object('ok', true, 'action', 'invite_declined');
end;
$$;

-- ---------- WAITLIST: join FIFO queue on a full match ----------
create or replace function public.join_waitlist(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); m public.matches; v_pos int;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match not found'; end if;
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
end;
$$;

-- ---------- CANCEL participation (+ FIFO auto-promote earliest waitlister) ----------
create or replace function public.cancel_participation(p_match uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
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
    select * into w from public.match_requests
      where match_id = p_match and kind = 'waitlist' and status = 'waitlisted'
      order by created_at asc limit 1 for update skip locked;
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
end;
$$;

-- ---------- grants: internal helpers are NOT callable via API ----------
revoke all on function public._notify(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public._fill_if_full(uuid)             from public, anon, authenticated;

-- ---------- grants: flow RPCs callable by signed-in users only ----------
revoke all on function public.join_match(uuid)            from public, anon;
revoke all on function public.request_to_join(uuid)       from public, anon;
revoke all on function public.approve_request(uuid)       from public, anon;
revoke all on function public.decline_request(uuid)       from public, anon;
revoke all on function public.invite_player(uuid,uuid)    from public, anon;
revoke all on function public.accept_invite(uuid)         from public, anon;
revoke all on function public.decline_invite(uuid)        from public, anon;
revoke all on function public.join_waitlist(uuid)         from public, anon;
revoke all on function public.cancel_participation(uuid)  from public, anon;
grant execute on function public.join_match(uuid)           to authenticated;
grant execute on function public.request_to_join(uuid)      to authenticated;
grant execute on function public.approve_request(uuid)      to authenticated;
grant execute on function public.decline_request(uuid)      to authenticated;
grant execute on function public.invite_player(uuid,uuid)   to authenticated;
grant execute on function public.accept_invite(uuid)        to authenticated;
grant execute on function public.decline_invite(uuid)       to authenticated;
grant execute on function public.join_waitlist(uuid)        to authenticated;
grant execute on function public.cancel_participation(uuid) to authenticated;

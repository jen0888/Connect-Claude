-- The no-show flag is the only time-bounded post-match action (CLAUDE.md §5):
-- accepted only after the match ends and within ~24h of end_time. Results &
-- share cards remain open with no deadline (handled client-side). Applied live
-- via MCP apply_migration; mirrored here.
create or replace function public.flag_no_show(p_match uuid, p_subject uuid)
returns public.no_show_flags
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_host uuid;
  v_end timestamptz;
  v_flag public.no_show_flags;
  v_allowed boolean := false;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_subject = v_actor then raise exception 'cannot flag yourself'; end if;
  select host_id, end_time into v_host, v_end from public.matches where id = p_match;
  if v_host is null then raise exception 'match not found'; end if;

  -- 24h post-match flag window (objective; results/cards are NOT bounded)
  if now() < v_end then raise exception 'match_not_finished'; end if;
  if now() > v_end + interval '24 hours' then raise exception 'no_show_window_closed'; end if;

  -- host flags a participant in their own match
  if v_host = v_actor
     and exists (select 1 from public.match_players mp where mp.match_id = p_match and mp.player_id = p_subject) then
    v_allowed := true;
  end if;
  -- a participant who showed flags the host
  if p_subject = v_host
     and exists (select 1 from public.match_players mp where mp.match_id = p_match and mp.player_id = v_actor and coalesce(mp.attended, true) <> false) then
    v_allowed := true;
  end if;
  if not v_allowed then raise exception 'not allowed to flag this player'; end if;

  insert into public.no_show_flags(match_id, subject_player, set_by, status)
  values (p_match, p_subject, v_actor, 'confirmed')
  on conflict (match_id, subject_player) do nothing
  returning * into v_flag;

  if v_flag.id is null then
    select * into v_flag from public.no_show_flags where match_id = p_match and subject_player = p_subject;
  else
    perform public._notify(
      p_subject, 'no_show',
      'You were marked as a no-show',
      'A host or player flagged you as not showing up. You can dispute it from the match.'
    );
  end if;

  return v_flag;
end; $$;

grant execute on function public.flag_no_show(uuid, uuid) to authenticated;

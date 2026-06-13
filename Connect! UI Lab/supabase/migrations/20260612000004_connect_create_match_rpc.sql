-- =====================================================================
-- Connect! · create_match RPC  (migration 4 of N)
-- Host-creates-a-match: insert the match AND seat the host in match_players
-- atomically. match_players has no INSERT policy by design (joins go through
-- the flow RPCs), so this SECURITY DEFINER function is the one sanctioned way
-- the host gets a membership row on create. The match insert fires
-- trg_match_thread (group thread + "Match created"); the host membership fires
-- the participant-sync trigger.
-- =====================================================================
create or replace function public.create_match(
  p_sport text,
  p_venue_id uuid,
  p_venue_name text,
  p_venue_location text,
  p_court_number text,
  p_start timestamptz,
  p_end timestamptz,
  p_skill text,
  p_total_spots int,
  p_fee_total numeric,
  p_fee_per_player numeric,
  p_join_mode text,
  p_notes text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_id uuid;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_total_spots is null or p_total_spots < 1 then raise exception 'total_spots must be >= 1'; end if;
  insert into public.matches(
    host_id, sport, venue_id, venue_name, venue_location, court_number,
    start_time, end_time, skill_level, total_spots, spots_available,
    fee_total, fee_per_player, join_mode, status, notes)
  values (
    v_actor, p_sport, p_venue_id, p_venue_name, p_venue_location, p_court_number,
    p_start, p_end, p_skill, p_total_spots, greatest(p_total_spots - 1, 0),
    coalesce(p_fee_total, 0), coalesce(p_fee_per_player, 0),
    coalesce(p_join_mode, 'open'), 'open', p_notes)
  returning id into v_id;
  insert into public.match_players(match_id, player_id) values (v_id, v_actor)
    on conflict (match_id, player_id) do nothing;
  return v_id;
end; $$;
revoke all on function public.create_match(text,uuid,text,text,text,timestamptz,timestamptz,text,int,numeric,numeric,text,text) from public, anon;
grant execute on function public.create_match(text,uuid,text,text,text,timestamptz,timestamptz,text,int,numeric,numeric,text,text) to authenticated;

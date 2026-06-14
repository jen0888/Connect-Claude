-- Connect! — "X left the match" system line in the match group chat.
--
-- The match thread already drops a leaving player from participant_ids via the
-- trg_thread_leave trigger (migration 20260612000003), but it posted no message,
-- so the remaining players had no signal that someone left. This recreates
-- _sync_thread_on_leave to also insert a centred system line ("Name left the
-- match"), mirroring the "Name joined" line from _sync_thread_on_join. The host
-- is skipped (a host doesn't "leave" — they cancel the match), matching the join
-- trigger's host guard. SECURITY DEFINER bypasses the chat RLS, same as join.

create or replace function public._sync_thread_on_leave()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_thread uuid; v_host uuid; v_name text;
begin
  select t.id, m.host_id into v_thread, v_host
    from public.chat_threads t join public.matches m on m.id = t.match_id
   where t.match_id = old.match_id;

  update public.chat_threads
     set participant_ids = array_remove(participant_ids, old.player_id)
   where match_id = old.match_id;

  -- announce the departure to everyone still in the thread (skip the host)
  if v_thread is not null and old.player_id <> v_host then
    select coalesce(split_part(name, ' ', 1), 'A player') into v_name
      from public.users where id = old.player_id;
    insert into public.chat_messages(thread_id, sender_id, body, system, tone, icon)
    values (v_thread, old.player_id, coalesce(v_name, 'A player') || ' left the match', true, 'warm', 'userMinus');
  end if;

  return old;
end; $$;

drop trigger if exists trg_thread_leave on public.match_players;
create trigger trg_thread_leave after delete on public.match_players
  for each row execute function public._sync_thread_on_leave();

-- internal trigger function: not REST-callable (mirror migration 3)
revoke all on function public._sync_thread_on_leave() from public, anon, authenticated;

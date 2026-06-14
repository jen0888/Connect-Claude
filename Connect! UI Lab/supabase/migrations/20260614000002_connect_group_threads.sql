-- =====================================================================
-- Connect! · Group chat threads  (chat-room build, §8)
-- New Message multi-select: 1 person → canonical DM, 2+ → a group thread.
-- chat_threads already supports group threads (match_id null, N participants)
-- under the existing participant-based RLS; the only gap was a way to CREATE
-- one (no INSERT policy by design — membership is set by definer funcs).
-- This adds the single SECURITY DEFINER RPC the client calls. Idempotent.
-- =====================================================================

create or replace function public.create_group_thread(p_others uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_actor   uuid := auth.uid();
  v_members uuid[];
  v_other   uuid;
  v_id      uuid;
  v_name    text;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;

  -- members = distinct(actor + others), nulls dropped
  select array(
           select distinct e
           from unnest(array_append(coalesce(p_others, '{}'::uuid[]), v_actor)) e
           where e is not null
         )
    into v_members;

  if coalesce(array_length(v_members, 1), 0) < 2 then
    raise exception 'a chat needs at least one other member';
  end if;

  -- every member must be a real profile row
  if exists (
    select 1 from unnest(v_members) e
    where not exists (select 1 from public.users u where u.id = e)
  ) then
    raise exception 'unknown member in group';
  end if;

  -- exactly one other → reuse the canonical 1:1 DM (never fork, CLAUDE.md §5)
  if array_length(v_members, 1) = 2 then
    select e into v_other from unnest(v_members) e where e <> v_actor limit 1;
    return public.get_or_create_dm(v_other);
  end if;

  -- reuse an existing group with the EXACT same member set (never fork)
  select id into v_id
    from public.chat_threads
   where match_id is null
     and participant_ids @> v_members
     and v_members @> participant_ids
   limit 1;
  if v_id is not null then return v_id; end if;

  insert into public.chat_threads(match_id, participant_ids)
  values (null, v_members)
  returning id into v_id;

  -- opening system line so the thread isn't empty
  select coalesce(split_part(name, ' ', 1), 'Someone') into v_name
    from public.users where id = v_actor;
  insert into public.chat_messages(thread_id, sender_id, body, system, tone, icon)
  values (v_id, v_actor, coalesce(v_name, 'Someone') || ' started this group', true, 'info', 'userPlus');

  return v_id;
end; $$;

-- callable by signed-in users only (mirrors get_or_create_dm)
revoke all on function public.create_group_thread(uuid[]) from public, anon;
grant execute on function public.create_group_thread(uuid[]) to authenticated;

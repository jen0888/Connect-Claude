-- ── Server-side read marker + structured @mentions (Stage 1.8) ─────────────
-- Applied live via MCP apply_migration (project ybmvzhpcuwapayhjhmzd); mirrored here.

-- chat_reads: one per-user last-read marker per thread (powers normal unread + mentions)
create table if not exists public.chat_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique(user_id, thread_id)
);
alter table public.chat_reads enable row level security;
drop policy if exists cr_read on public.chat_reads;
create policy cr_read on public.chat_reads for select to authenticated using (user_id = auth.uid());
alter table public.chat_reads replica identity full;
create index if not exists idx_chat_reads_user on public.chat_reads(user_id);

-- chat_mentions: structured mention rows (no read-time regex), one per mentioned user per message
create table if not exists public.chat_mentions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  mentioned_user uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_cmen_thread on public.chat_mentions(thread_id);
create index if not exists idx_cmen_user on public.chat_mentions(mentioned_user);
create index if not exists idx_cmen_msg on public.chat_mentions(message_id);
alter table public.chat_mentions enable row level security;
-- only thread members may read a thread's mentions
drop policy if exists cmen_read on public.chat_mentions;
create policy cmen_read on public.chat_mentions for select to authenticated
using (exists (select 1 from public.chat_threads t where t.id = chat_mentions.thread_id and auth.uid() = any(t.participant_ids)));
alter table public.chat_mentions replica identity full;

-- realtime (so a mention alert / read-clear appears live)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_reads') then
    alter publication supabase_realtime add table public.chat_reads; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='chat_mentions') then
    alter publication supabase_realtime add table public.chat_mentions; end if;
end $$;

-- mark_thread_read: the single server-side "I read this thread"
create or replace function public.mark_thread_read(p_thread uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.chat_threads t where t.id = p_thread and v_actor = any(t.participant_ids))
    then raise exception 'not a thread member'; end if;
  insert into public.chat_reads(user_id, thread_id, last_read_at)
  values (v_actor, p_thread, now())
  on conflict (user_id, thread_id) do update set last_read_at = excluded.last_read_at;
end; $$;
grant execute on function public.mark_thread_read(uuid) to authenticated;

-- send_message: atomic message + structured mentions (members only) + advance sender's read marker
create or replace function public.send_message(p_thread uuid, p_body text, p_mentions uuid[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $$
declare v_actor uuid := auth.uid(); v_msg uuid; v_uid uuid;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.chat_threads t where t.id = p_thread and v_actor = any(t.participant_ids))
    then raise exception 'not a thread member'; end if;

  insert into public.chat_messages(thread_id, sender_id, body)
  values (p_thread, v_actor, p_body) returning id into v_msg;

  -- only thread members are mentionable; dedupe; non-members silently dropped
  if p_mentions is not null then
    for v_uid in
      select distinct mm from unnest(p_mentions) as mm
      where exists (select 1 from public.chat_threads t where t.id = p_thread and mm = any(t.participant_ids))
    loop
      insert into public.chat_mentions(message_id, thread_id, mentioned_user)
      values (v_msg, p_thread, v_uid);
    end loop;
  end if;

  -- sender has, by definition, read their own message → no self-mention alert
  insert into public.chat_reads(user_id, thread_id, last_read_at)
  values (v_actor, p_thread, now())
  on conflict (user_id, thread_id) do update set last_read_at = excluded.last_read_at;

  return v_msg;
end; $$;
grant execute on function public.send_message(uuid, text, uuid[]) to authenticated;

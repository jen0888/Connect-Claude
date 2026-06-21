-- ── Light Stage 1 no-show + post-match model ──────────────────────────────
-- Reputation-only, read-time status, first-submitter result. Removes the
-- heavier variants (consensus auto-close, attend check-in chat line, scaled
-- corroboration table, set_attendance RPC). Applied live via MCP apply_migration
-- (project ybmvzhpcuwapayhjhmzd); this file mirrors it into the repo history.

-- 1. first-submitter ordering + 24h edit window
alter table public.match_results add column if not exists created_at timestamptz not null default now();

-- 2. drop heavier variants
drop trigger if exists trg_close_on_consensus on public.match_results;
drop function if exists public._close_match_on_result_consensus() cascade;
drop trigger if exists trg_thread_checkin on public.match_players;
drop function if exists public._sync_thread_on_checkin() cascade;
drop function if exists public.set_attendance(uuid, uuid, boolean) cascade;
-- (legacy stored status='closed' rows are left as-is: they're past matches that
--  read 'closed' via read-time computeStatus regardless; nothing NEW stores it.)

-- 3. no_show_flags (replaces no_show_reports): one flag lands it
create table if not exists public.no_show_flags (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  subject_player uuid not null references public.users(id) on delete cascade,
  set_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'confirmed' check (status in ('confirmed','contested')),
  created_at timestamptz not null default now(),
  unique(match_id, subject_player)
);
alter table public.no_show_flags replica identity full;
create index if not exists idx_nsf_match on public.no_show_flags(match_id);
create index if not exists idx_nsf_subject on public.no_show_flags(subject_player);
alter table public.no_show_flags enable row level security;

-- RLS: participants read; host→participant OR participant-who-showed→host may insert;
--      subject may only move their own flag to 'contested' (one-way dispute).
drop policy if exists nsf_read on public.no_show_flags;
create policy nsf_read on public.no_show_flags for select to authenticated
using (
  subject_player = auth.uid()
  or set_by = auth.uid()
  or exists (select 1 from public.match_players mp where mp.match_id = no_show_flags.match_id and mp.player_id = auth.uid())
  or exists (select 1 from public.matches m where m.id = no_show_flags.match_id and m.host_id = auth.uid())
);

drop policy if exists nsf_insert on public.no_show_flags;
create policy nsf_insert on public.no_show_flags for insert to authenticated
with check (
  set_by = auth.uid()
  and subject_player <> set_by
  and (
    ( exists (select 1 from public.matches m where m.id = no_show_flags.match_id and m.host_id = auth.uid())
      and exists (select 1 from public.match_players mp where mp.match_id = no_show_flags.match_id and mp.player_id = no_show_flags.subject_player) )
    or
    ( exists (select 1 from public.matches m where m.id = no_show_flags.match_id and m.host_id = no_show_flags.subject_player)
      and exists (select 1 from public.match_players mp where mp.match_id = no_show_flags.match_id and mp.player_id = auth.uid() and coalesce(mp.attended, true) <> false) )
  )
);

drop policy if exists nsf_dispute on public.no_show_flags;
create policy nsf_dispute on public.no_show_flags for update to authenticated
using (subject_player = auth.uid())
with check (subject_player = auth.uid() and status = 'contested');

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='no_show_flags'
  ) then
    alter publication supabase_realtime add table public.no_show_flags;
  end if;
end $$;

-- 4. flag_no_show RPC — enforces the same rule, dedupes (one flag lands it), notifies subject
create or replace function public.flag_no_show(p_match uuid, p_subject uuid)
returns public.no_show_flags
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
  v_host uuid;
  v_flag public.no_show_flags;
  v_allowed boolean := false;
begin
  if v_actor is null then raise exception 'not authenticated'; end if;
  if p_subject = v_actor then raise exception 'cannot flag yourself'; end if;
  select host_id into v_host from public.matches where id = p_match;
  if v_host is null then raise exception 'match not found'; end if;

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

-- 5. retire the old scaled-corroboration table
drop table if exists public.no_show_reports cascade;

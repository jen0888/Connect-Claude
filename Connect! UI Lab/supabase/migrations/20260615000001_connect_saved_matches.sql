-- =====================================================================
-- Connect! · saved_matches (Home "Matches you saved")
-- Personal bookmarks of not-yet-joined matches. RLS so a user sees/edits
-- only their own saves. Realtime so the bookmark icon reflects live
-- across windows. Read-time joinability (open + not joined) is computed
-- in the client (CLAUDE.md §5 — no cron/triggers).
-- =====================================================================

create table public.saved_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, match_id)
);

create index idx_saved_user  on public.saved_matches(user_id);
create index idx_saved_match on public.saved_matches(match_id);

alter table public.saved_matches enable row level security;

create policy saved_read        on public.saved_matches for select to authenticated using (user_id = auth.uid());
create policy saved_insert_self on public.saved_matches for insert to authenticated with check (user_id = auth.uid());
create policy saved_delete_self on public.saved_matches for delete to authenticated using (user_id = auth.uid());

alter publication supabase_realtime add table public.saved_matches;

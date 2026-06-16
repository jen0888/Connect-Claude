-- Attend check-in (CLAUDE.md §5) — NEXT UP "I'm here / played" presence signal.
--
-- A participant records a POSITIVE attendance signal on their OWN match_players
-- row (attended = true). This is read-time only: visibility is computed from
-- start_time in the client (status.ts `attendCheckInOpen`) — there is NO cron and
-- NO trigger here, consistent with the rest of the lifecycle.
--
-- match_players previously had only:
--   mp_read        (select, using true)            -- participants/host (all authed) can read
--   mp_delete_self (delete, using player_id = auth.uid())
-- ...and NO update policy, so a client write of `attended` was blocked by RLS.
--
-- Add the missing self-only UPDATE policy so "only the participant can record
-- their own attend" is enforced by RLS (player_id = auth.uid() on both USING and
-- WITH CHECK). The host flagging OTHER players' attendance in the post-match step
-- is a separate concern (no-show corroboration runs through no_show_reports) and
-- is intentionally NOT granted here.
create policy mp_update_self on public.match_players
  for update to authenticated
  using (player_id = auth.uid())
  with check (player_id = auth.uid());

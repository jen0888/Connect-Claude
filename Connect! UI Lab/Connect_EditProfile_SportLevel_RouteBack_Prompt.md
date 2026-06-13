# Claude Code prompt — Edit Profile (sport + level): save → View Profile, with persisted pre-fill

> Paste into Claude Code from the repo root. Read `CLAUDE.md` first; obey §4 (save-then-route, carry-forward), §5 (public-by-default profiles), §6 (`users` table), §3 tokens, §7 EN/AR + RTL. Single source of truth for profile data — no per-screen copies.

## Goal
When a user sets/changes their **sport** and **skill level** in Edit Profile and taps **Save changes**:
1. Persist the values and **route back to View Profile (`/profile`)** with the updated sport + level shown.
2. When the user opens **Edit Profile again**, those saved values are **already there, pre-filled**, ready to edit further.

## Behavior
- **Save changes** (`/profile/edit`):
  - Write `sport` and `skill_level` (and any other edited fields) to the user's `users` row in Supabase.
  - Update the shared profile store, then **save-then-route → `/profile` + transient toast** ("Profile updated", ~2s).
  - `/profile` immediately renders the new sport + level — no manual refresh.
- **Re-open Edit Profile:**
  - `/profile/edit` opens **pre-filled with the current saved values** (sport selector and level selector reflect what was saved; never blank, never reset to defaults). This is carry-forward (§4): the form reads from the store / `users` row.
- **Propagation (consistent with §5):** the updated sport + level also reflect on the **Other-Player Profile (`/players/:id`)** as everyone else sees it, and on the **canonical match card / Match Details roster / chat identity** wherever the user appears. All surfaces read from the one `users` row; Realtime updates an already-open screen in place.

## Acceptance criteria
1. Add/change sport + level → Save changes → land on `/profile` showing the new sport + level, plus toast.
2. Tap Edit Profile again → the sport and level selectors are pre-set to the saved values (not empty, not defaults).
3. Values persist across an app reload (confirms Supabase write, not just memory).
4. A different user viewing `/players/:id` sees the updated sport + level; match cards/roster/chat where the user appears also update — no manual refresh.

## Note on routing
- This routes **Edit Profile → `/profile`** (View Profile). CLAUDE.md §4 currently says Edit Profile → `/settings`. If `/profile` is the intended behavior, update §4 (route map row + Save-then-route line) to match so the docs and build agree.

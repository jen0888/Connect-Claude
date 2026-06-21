# Connect! — No-Show / Attendance Spec (Stage 1.7)

*Drafted 2026-05-30 · Trimmed to the light model 2026-06-19 · Stage 1 build reference*
*Authoritative source: **CLAUDE.md §5** (no-show rules) + **§6** (data model). If this doc and CLAUDE.md ever diverge, CLAUDE.md wins.*

## Model in one line

A no-show is **reputation-only**: a visible mark on the player's profile next to their attendance rate. **No block, no penalty.** The deterrent is the public record itself. Stage 1 keeps the whole system deliberately light — most casual players just fill a court and leave, so attendance has to need near-zero effort.

## Default

**Everyone who joined a match is treated as "played."** Nobody has to check in, confirm, or mark anyone. A no-show is the exception, and it lands only in the ways below.

## How a no-show is created

1. **Within-2h cancellation → automatic.** If a player or host cancels and `now` is within 2 hours of `start_time`, the system records a no-show automatically — objective, immediate, no UI, no corroboration. Applies equally to hosts and joiners. (Cancelling **≥2 hours** before start is always safe — no mark.)
2. **"Didn't show up" → an optional manual flag.** For the rare case someone simply ghosts:
   - The **host can flag a player** who didn't show.
   - **Any player who showed can flag the host** (a host won't flag themselves).
   - **Players cannot flag each other** — only host↔player. This removes player-vs-player false-flagging.
   - **One flag lands it** — no corroboration threshold. Results/attendance are low-stakes and reputation-only, so a single flag is enough.
   - The flagged person is **notified** and may **dispute** → the mark shows as `contested` until resolved.

There is **no attend/check-in button, no provisional drafting, and no required "who played" review** in Stage 1. (All were considered and cut — they assume post-match engagement we don't yet know exists. Revisit only if real usage shows flaking is a genuine problem.)

## What shows on the profile

- **Attendance rate** (% of joined matches actually played).
- **No-show count.**
- Both are **public by default** — that visibility is the deterrent.
- They sit next to the optional "win rate (for fun)" from the post-match result step.

## Data model

A single table (replaces the old `no_show_reports`):

```
no_show_flags
  id             uuid primary key
  match_id       uuid references matches(id)
  subject_player uuid references users(id)
  set_by         uuid references users(id)
  status         text         -- 'confirmed' | 'contested'
  created_at     timestamptz default now()
  unique (match_id, subject_player)
```

- Attendance also lives on `match_players.attended` (default = played; set `false` by a within-2h cancel or a landed flag).
- **RLS:** the host may write a flag against a player **in their own match**; a player who showed may write a flag **only against the host**. No peer-vs-peer.
- Within-2h cancellations are recorded automatically from the objective timestamp — no flag row needed.
- Confirmed/contested status is read at **read time** — no triggers, no cron, no background jobs.

## Host no-show

**No role reassignment.** The host role is pre-match only (approve / invite / edit / cancel), so once the match starts there's nothing for a successor to do. A no-show host just gets the mark like anyone — automatically from a within-2h cancel, or flagged by any player who showed. The result stays first-submitter and the group chat persists. (See CLAUDE.md §5 "Host departure".)

## Removed from earlier drafts (do NOT reintroduce in Stage 1)

- The scaled report-threshold / corroboration model (2→1, 3–4→2, 5–8→3, 9+→4).
- Peer-to-peer reporting (any player reporting any player).
- The attend / check-in button + provisional "no-tap = no-show" drafting + host review-both-ways.
- The old `no_show_reports` table (replaced by `no_show_flags`).
- Any automatic block / penalty ladder.

## Open / revisit during build

- Whether no-show marks ever "age out" after a long clean streak.
- Display treatment of the no-show count (number vs. badge) — tie to profile design.
- Notification copy when a flag lands / is disputed.

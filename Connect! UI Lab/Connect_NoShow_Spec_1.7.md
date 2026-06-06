# Connect! — No-Show Reporting Spec (Stage 1.7)

*Drafted 2026-05-30 · Stage 1 build reference*

## Model in one line

A no-show is **reputation-only**: it appears as a mark on the player's profile, alongside their attendance rate. There is **no block or join penalty**. The deterrent is the public record itself.

## Two ways a no-show is created

There are two distinct paths, and they behave differently:

1. **Cancellation within 2 hours of start — lands immediately.** This is an objective fact (a timestamp), so it needs no corroboration. When any player or host cancels and `now` is within 2h of match start, the system records a confirmed no-show automatically. Applies equally to hosts and joiners.
2. **Didn't turn up — needs corroboration.** This is a human judgment, so it requires a threshold of independent reports before the mark lands (see below). Captured in the Step 1 "Who played?" post-match screen.

## Report threshold by match size

The number of independent reports needed to confirm a "didn't turn up" no-show scales with how many people were in the match:

| Players in match | Reports needed |
|---|---|
| 2 | 1 |
| 3–4 | 2 |
| 5–8 | 3 |
| 9+ | 4 (cap) |

Feasibility safety net: the required count is also clamped to the number of players who actually showed up, so the threshold is always reachable even if several people no-showed at once.

## Reporting rules

- **Only match participants can report** — enforce with a Supabase row-level security policy, not app code.
- **One report per reporter per player** — a unique constraint guarantees nobody can pad the count.
- **No self-reporting**, and a player flagged as a no-show can't act as a reporter.
- **24-hour window** — reports are only valid within 24h after match start, so stale grudges can't land a mark days later.

## Data model

A single new table:

```
no_show_reports
  id              uuid primary key
  match_id        uuid references matches(id)
  reported_player uuid references users(id)
  reporter_id     uuid references users(id)
  created_at      timestamptz default now()
  unique (match_id, reported_player, reporter_id)
```

"Confirmed" no-shows are computed at read time — no triggers or background jobs needed. A Postgres view groups reports per match+player, counts distinct reporters, and keeps only those that meet the size-based threshold. The profile screen reads confirmed no-shows from that view. Auto-recorded within-2h cancellations are written as already-confirmed (e.g. a system reporter row, or a separate `source = 'late_cancel'` flag that bypasses the count).

## What shows on the profile

- Attendance rate (% of joined matches actually played).
- Confirmed no-show count.
- These sit next to the optional "win rate (for fun)" stat from the post-match result step.

## Open / revisit during build

- Whether confirmed no-shows ever "age out" of the profile after a long clean streak.
- Exact display treatment of the no-show count (number vs. badge) — tie to the profile design.
- Notification timing: do we notify a player the moment a no-show is confirmed against them?

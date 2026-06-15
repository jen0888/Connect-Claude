# Home — "You're hosting" + "My Matches" columns, each with Upcoming/Past archive

Follow CLAUDE.md (§4 navigation, §5 business logic, §3 tokens). Reuse existing patterns —
canonical match card via `variant` prop, read-time status, no forked screens, no new card
component.

## Model — two parallel buckets, never merged

- **You're hosting** = matches the user **created** (host).
- **My Matches** = matches the user **joined but did NOT create**.

Both are Home sections, both have a "See all", and both See-all pages use the **same**
`[ Upcoming ] [ Past ]` pill layout — only the data source and card variant differ.

## Problem being solved

A user who only joins matches (never hosts) currently has no path to past matches: the
joined section drops a match once it's completed, the JUST PLAYED card expires after 24h,
and there is no archive entry that doesn't depend on hosting. The "My Matches" column +
its See-all fixes this directly.

## 1. Home sections (keep §4 order and caps)

- **You're hosting** — matches the user hosts. **Full** card variant (per-card Edit +
  Record results where still valid). Max 3. "See all" at the section header inline-start
  **only when >3** → `/hosting`.
- **My Matches** — matches the user joined but did not host. **Brief** card variant.
  Max 3. "See all" at the section header inline-start **only when >3** → `/my-matches`.
- All other Home sections and behavior unchanged. NEXT UP unchanged. Transient JUST PLAYED
  card unchanged.

## 2. Archive pages — built ONCE, reused for both routes

Build a single pill-archive layout/component and reuse it for both routes. Only the data
source and card variant change.

- **`/hosting`** — lists ONLY matches the user hosts.
  - `[ Upcoming ] [ Past ]` pills, **Upcoming** default.
    - Upcoming → hosted, not yet started (open/full/live), soonest first.
    - Past → hosted, completed/closed, most recent first. Read-only, result chip
      (Won / Lost / Draw / Cancelled).
  - **Full** card variant (per-card Edit on upcoming where valid).
- **`/my-matches`** — lists ONLY matches the user joined and did not host.
  - Same `[ Upcoming ] [ Past ]` pills, **Upcoming** default.
    - Upcoming → joined, not yet started, soonest first.
    - Past → joined, completed/closed, most recent first. Read-only, result chip.
  - **Brief** card variant.
- Never merge the buckets; never merge Upcoming + Past. Status/filtering is **read-time**
  computed from `start_time`/`end_time` (§5) — no cron, no triggers.

## 3. Home header — remove the calendar icon

- **Remove the calendar/schedule icon** in the top-right of the Home header.
- Keep the **+ (create match)** action and the **avatar/gear** (Profile + Settings) entry.
- Do not add a separate "My Matches" header link — the My Matches section + its See-all is
  the canonical entry, including for join-only users.

## 4. Route-map update (§4)

CLAUDE.md currently defines `/my-matches` as the hosting See-all (+ `?filter=week`). This
change splits them cleanly:

- `/my-matches` = **JOINED** archive (Upcoming/Past pills, brief card).
- `/hosting` = **HOSTED** archive (Upcoming/Past pills, full card).

Update the §4 route table to match: both pages carry Upcoming/Past pill state, not
`?filter=week`. "You're hosting → See all" → `/hosting`; "My Matches → See all" →
`/my-matches`.

## Constraints

- Tokens over hardcoded values (§3).
- Canonical match card only, via `variant` prop — no per-page card variants.
- Read-time computation over cron/triggers (§5).
- Carry-forward + save-then-route unchanged (§4).
- RTL from the start: pills/list mirror cleanly; numerals and times stay LTR (§7).

Before coding, confirm the canonical card exposes what the Past view needs (result chip /
score) and both brief/full variants. Flag gaps rather than hardcoding.

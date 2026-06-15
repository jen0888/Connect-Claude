# Claude Code prompt — Discover dedup (joined/requested/hosting → Home) + "Requested" badge

> Paste into Claude Code from repo root. Read `CLAUDE.md` first; obey §4 (Home sections, route map), §5 (Discover always seeded, join paths, saved ≠ joined), §6 data model, §3 tokens (use semantic colors, no hardcoded hex), §7 EN/AR + RTL. Reuse the canonical match card.

## Goal
A match should only appear in a user's **Discover** feed if they can still freshly act on it. Once the user is involved, it leaves *their* Discover and shows on *their* **Home** instead.

## Rule
For the **current user**, exclude a match from Discover when they:
- have **joined** it (`match_players` row), or
- have a **pending request** on it (approval mode — `match_requests.kind='request'`, status `requested`), or
- are the **host** (`matches.host_id = me`).

These instead appear on **Home**:
- **joined** → NEXT UP (imminent) or This week (other joined).
- **hosting** → You're hosting.
- **pending request** → **This week** (placed by timing), rendered with a **"Requested" state badge** until the host approves/declines.

Do **not** exclude:
- **Saved / bookmarked** matches (`saved_matches`) — save ≠ join; they STAY in Discover, still joinable, with the bookmark icon filled.
- **Invite** matches — they're private offers and never list in Discover anyway (no change needed).

Discover must **stay seeded for everyone** (§5) — dedup is per-user filtering, never an empty state.

## Implementation
- **Discover query (per current user):** exclude match ids where the user is host, has a `match_players` row, or has a `match_requests` row with `kind='request'` and `status='requested'`. Keep saved matches in the results. Do this in the Supabase query / RLS-aware view, not client-side after fetch, so paging stays correct.
- **Live updates (Supabase Realtime):** the moment the user joins or requests a match, it disappears from their Discover and appears on Home — no manual refresh. If a request is **declined**, the match returns to Discover (it's freshly actionable again); if **approved**, it becomes a joined match (NEXT UP/This week).
- **"Requested" badge:** add a state to the canonical match card for `requested`. Style with the warning/`--color-warning`-adjacent semantic token (per §3 lifecycle states), label "Requested" (EN) + AR string. The card's CTA in this state is non-actionable/secondary (e.g. "Request pending"), not a Join button.
- **Home placement:** pending-request matches sort into **This week** by `start_time`; no new Home section.

## Acceptance criteria
1. Joining a match removes it from the user's Discover and shows it under NEXT UP/This week — live, no refresh.
2. Requesting to join (approval mode) removes it from Discover and shows it in This week with a "Requested" badge and a non-Join CTA.
3. If the request is declined, the match reappears in Discover; if approved, it moves to a joined section.
4. The user's own hosted matches never appear in their Discover (only in You're hosting).
5. Saved/bookmarked matches still appear in Discover with the bookmark filled.
6. Another user (not involved) still sees all these matches in their Discover — the feed stays seeded.
7. EN + AR/RTL correct for the Requested badge and card states.

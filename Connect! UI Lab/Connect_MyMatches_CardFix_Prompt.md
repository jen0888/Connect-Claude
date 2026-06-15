# Cursor + Claude Code Prompt — Fix My Matches cards (Upcoming + Past)

Fix two rendering bugs on the **My Matches** screen (`/my-matches`, a sub-screen of Home). Both tabs must render the **canonical match card** — the single shared component reused on Discover, Home, and My Matches. Do **not** create a per-tab or per-tab-state card variant. Consume design tokens only; never hardcode a hex or size.

## Files to touch (confirm exact names in the repo)
- `src/pages/MyMatches.tsx` (or `src/screens/MyMatches.tsx`) — the Upcoming/Past tabbed list at route `/my-matches`.
- `src/components/MatchCard.tsx` — the canonical match card (sport, venue + court #, date/time, host + avatar, spots joined/needed, state badge). This is THE priority shared component — fix it here, not in a copy.
- The avatar-stack / roster sub-component if the footer avatars live separately (e.g. `src/components/AvatarStack.tsx`).
- Token source: `:root` CSS vars + `tokens.js` (mirror). Use these, don't inline values.

## Tokens to use (from CLAUDE.md §3)
- Card radius: `--radius-lg` = **14**. Bottom-sheet `xl` = 28; avatars/pills `pill` = 999.
- Card padding: **20–24px**; inner gaps **8–14px**; section rhythm **32+**.
- Spacing scale (4px base): `2=8  3=12  4=16  5=20  6=24`.
- Surfaces: `--surface-card` `#ffffff` (raised cards), `--surface-dark` `#161310` / `--surface-dark-2` `#27241c` (night/court art), `--surface-page` `#F4F0E8`.
- State badge tokens (match lifecycle → use the right one per card): `--color-success` open · `--color-info` full/locked-in · `--color-warning` just-played · `--color-danger` cancelled · `--color-live` live now · `--color-neutral` closed/inactive.

## Bug 1 — Upcoming tab: card footer is clipped / overflowing
On the "Wed afternoon tennis double" card, the footer row (avatar stack "AW FS BD" + "Roster full" label + "View" button) bleeds past the card's rounded bottom edge and is cut off.
- Remove any fixed/`max-height` on the card container — let it size to content (`height: auto`).
- The footer must sit inside the card: apply bottom padding of token **5–6 (20–24px)** and make sure `--radius-lg` (14) rounding isn't clipping the last row (check `overflow-hidden` on the card wrapper — the cover art at top needs the clip, but it must not crop the white content/footer; clip the media region, not the whole card).
- Vertically center the footer row (avatars ↔ "Roster full" ↔ "View" button) with gap **8–14px**; avatar pills use `--radius-pill`.
- The "View" outline button must be fully inside the card with right/bottom padding, not flush to the edge.

## Bug 2 — Past tab: cards render as empty gray/dark skeleton bars
The Past tab shows "9 MATCHES" but each card renders as a blank gray bar (two dark at the bottom) instead of a real card — looks like a skeleton loader that never resolves, or a broken empty layout.
- Render the **same `MatchCard`** as Upcoming, populated with past-match data, with the correct lifecycle **state badge**: `completed`/`closed` → `--color-neutral`; `cancelled` → `--color-danger`. The two dark bars are almost certainly the night/`--surface-dark` variant of the canonical card — confirm they're the same component with a state token, not a separate stub.
- If a skeleton is being shown: ensure it unmounts once data loads, and confirm the past-matches query (status `completed`/`closed`/`cancelled`, `end_time` in the past) actually returns rows and binds them. Past status is computed at read time from `start_time`/`end_time` — verify that read-time logic isn't returning empty.
- No empty/placeholder bars should remain after load.

## Verify before done
- Screenshot both tabs at mobile width (PWA). Upcoming: footer fully visible inside the card with padding. Past: real, readable cards (sport, venue + court #, date/time, host + avatar, spots, correct state badge) — no gray bars.
- Confirm Upcoming, Past, Home, and Discover all render the identical `MatchCard` (no divergent variants).
- RTL pass: numbers/times stay LTR; confirm the footer doesn't re-clip and `MapPin`/numeric elements aren't flipped (CLAUDE.md §7).

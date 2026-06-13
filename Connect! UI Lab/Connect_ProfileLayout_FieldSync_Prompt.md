# Claude Code prompt — Profile layout (location + bio under name) + full field sync

> Paste into Claude Code from the repo root. Read `CLAUDE.md` first; obey §3 (design tokens — no hardcoded hex/size), §4 (carry-forward, save-then-route), §5 (public-by-default profiles), §6 (data model), §7 (EN/AR + RTL). Reuse existing components; don't fork variants.

## Goal
1. On the **profile page**, show the **location** and **bio** sections directly **under the user's name** (in the profile header block).
2. **Every field edited in Edit Profile** must reflect on the **View Profile** page, the **Other-Player Profile** page, and **anywhere else the profile renders** — including **sport** and **skill level** (and name, avatar, location, bio, languages).

---

## Part 1 — Location + bio under the name

- In the profile header, stack the identity block as: **name** → **location** → **bio**, directly beneath the name (not in a separate lower card).
- Type/spacing from tokens (§3): name uses `display-s`/`title`; location as a muted line (`--color-text-muted`, `body`/`label` with a `MapPin` lucide icon — **do not flip the pin in RTL**, §7); bio as `body` in `--color-text`. Use the 4px spacing scale for gaps; don't hardcode.
- Empty states: if location or bio is blank, hide that line cleanly (no empty label, no layout jump). On the user's **own** View Profile, an empty bio may show a subtle "Add a bio" affordance that deep-links to `/profile/edit`; on **Other-Player Profile** just hide it.
- RTL: right-align the block; numerals stay LTR.

## Part 2 — Data model

- Ensure the `users` table has fields for **location** (reuse the sign-up city/country, e.g. `city`/`country`, or a single `location` string) and **bio** (`text`, nullable). If `bio` doesn't exist yet, add it via migration and expose it in Edit Profile. Keep RLS so public fields are readable by other players (§5).

## Part 3 — Full field sync (edit reflects everywhere)

- **Single source of truth:** the current user's profile lives in one shared store (auth/profile context or query cache), and **all** profile surfaces read from it / from the `users` row — never per-screen local copies.
- On **Edit Profile → Save**: write all changed fields to the `users` row in Supabase, update the store, then save-then-route → `/settings` + toast (§4). No manual refresh.
- Fields that must propagate to **every** surface: **name, avatar, location, bio, sport, skill level, languages** (and any other editable public field).
- Surfaces that must reflect the change:
  - **View Profile (`/profile`)** — the editing user's own profile.
  - **Other-Player Profile (`/players/:id`)** — what everyone else sees (public fields only; profiles are public by default, §5). A viewer opening it fetches the current row (no stale cache); if already on the screen when the edit lands, Realtime updates it in place.
  - **Settings (`/settings`)** — mirrored header identity (name/avatar) + language.
  - **Canonical match card, Match Details roster, and chat identity** — host/player name, avatar, sport, level wherever shown.

## Acceptance criteria
1. Profile page shows location and bio stacked directly under the name, with empty fields hidden gracefully.
2. Edit **sport** and **skill level** → Save → View Profile and Other-Player Profile both show the new sport/level immediately; match cards/roster/chat where the user appears also update.
3. Edit name, avatar, location, bio, languages → all reflect on View Profile, Other-Player Profile, Settings, and match-card/chat identity — no manual refresh.
4. A **different user** viewing `/players/:id` sees the updated public fields (and never sees private/settings fields).
5. Re-opening `/profile/edit` is pre-filled with the just-saved values (carry-forward, §4); persisted values survive an app reload (confirms Supabase write).

## Decision to confirm
- I read "location and bio show **under the name**" as **layout/placement** (stacked beneath the name in the header), not an underline text decoration. If you meant a literal underline style on the name, say so and I'll switch it.

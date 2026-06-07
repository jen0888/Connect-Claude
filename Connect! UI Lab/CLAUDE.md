# CLAUDE.md — Connect!

Project memory for Claude Code. Read this before making changes. It captures product scope, stack, design tokens, architecture, and the non-obvious business rules. When something here conflicts with code, flag it rather than silently picking one.

> Place this file at the **repo root**. (It currently lives in the design/spec folder "Connect! UI Lab"; copy it into the GitHub repo Lovable syncs to.)

---

## 1. Product

**Connect!** — a mobile-first PWA that helps people in **Doha** find pickup sports matches (padel, tennis, badminton, running). **Stage 1 = free player matching only.** Target: ~500 active players.

- **Matching supports three join paths** (see §5): (1) **open** — player self-selects in, instant; (2) **approval** — player requests to join, host approves/declines; (3) **invite** — host invites a specific player, who accepts/declines. Open is pull-based with no gatekeeping; approval and invite are additive and do not replace it.
- **18+ only.** Collect date of birth at sign-up (not a checkbox) and hard-gate under-18.
- **Money:** free + cash-on-arrival. No in-app payments. Any "QAR 25" figure is informational (host's stated cost), never a transaction.
- **Doha-only**, **web app first**. Native **iOS + Android apps are planned for a later stage** (the Supabase backend carries over). No geolocation/"nearby" logic.
- **Bilingual EN/AR, RTL from day one.**
- **Solo builder, ~Month 4 launch.** Bias to the simplest rule that solves the current problem; defer scale features explicitly.

Later stages (do **not** build now): coach booking (10% commission), court booking, player star-ratings, payments, push notifications, geolocation/multi-city, **native iOS + Android apps** (planned), minors/teen support.

---

## 2. Stack

- **Frontend:** React + TypeScript (Vite). Styling: Tailwind + shadcn/ui. Icons: **lucide-react** (`npm i lucide-react`; reference by name — same icon = same action everywhere).
- **Backend:** **Supabase** — Postgres, Auth, Row Level Security, Realtime (chat + live feed).
- **Repo & hosting:** GitHub repo. **Hosting:** Vercel.
- **Build environment:** **Cursor + Claude Code** do all the work — UI, CRUD, and heavy logic (no-show thresholds, RLS policies, realtime chat tuning, RTL/bidi edge cases, read-time computed state). *(Lovable is no longer used to generate or edit the app; its handoff docs in §9 remain as the spec/reference for what to build.)*

---

## 3. Design tokens — single source of truth

Extracted from the live EN screens (`Connect! — Design Tokens.pdf`). **Never hardcode a hex/size in a component — consume the token.** Define on `:root` and mirror in a `tokens.js` for styled-in-JS.

**Color**

| Token | Value | Use |
|---|---|---|
| `--color-brand` | `#C76A48` | primary CTA / brand action |
| `--color-brandstrong` | `#A04A2C` | pressed / deep brand |
| `--color-accent` | `#8A6B3A` | identity, eyebrows, links |
| `--color-text` | `#1a1a1a` | primary ink |
| `--color-text-muted` | `rgba(26,26,26,.55)` | secondary / labels |
| `--color-text-faint` | `rgba(26,26,26,.42)` | dimmed / disabled |
| `--color-text-onbrand` | `#F4F0E8` | cream text on brand/dark |
| `--surface-page` | `#F4F0E8` | app background (cream) |
| `--surface-card` | `#ffffff` | raised cards |
| `--surface-dark` | `#161310` | night-mode shell |
| `--surface-dark-2` | `#27241c` | dark media / court art |
| `--blob-peach` / `--blob-sage` / `--blob-pink` | `#f3c79b` / `#cfe1d6` / `#e8c7d4` | ambient background blobs (blur 50px, ~0.55 opacity) |

**Semantic — sourced from match lifecycle states**

| Token | Value | Lifecycle meaning |
|---|---|---|
| `--color-success` | `#3E7A5A` | open · accepting |
| `--color-info` | `#3C6079` | full · locked-in |
| `--color-warning` | `#8A6B3A` | just played · act now |
| `--color-danger` | `#A23B2C` | cancelled · destructive |
| `--color-live` | `#C25A38` | live now |
| `--color-neutral` | `#8C8478` | closed · inactive |

**Type scale** — two families, no exceptions. Display = **Instrument Serif** (headlines + expressive numerals); UI = **Inter** (every UI string).
`display-xl` 96 serif (countdowns) · `display-l` 44 serif · `display-s` 26 serif (card titles) · `title` 20/600 · `body-lg` 15.5/600 (CTAs) · `body` 14/400–500 · `label` 12.5/600 · `caption` 11/500 · `overline` 10.5/600/0.2em UPPER.

**Numerals:** Western (1,2,3) in both languages — never Arabic-Indic. Functional figures (lists, times, scores, meters) use tabular figures: `font-variant-numeric: tabular-nums`. Display figures can use Instrument Serif italic for unit/denominator accents.

> ⚠️ **Font note for Arabic:** Instrument Serif + Inter don't cover Arabic. Earlier handoffs specified **IBM Plex Sans Arabic** for AR coverage. Resolve before AR build: keep Inter/Instrument Serif for Latin and fall back to IBM Plex Sans Arabic for Arabic glyphs.

**Spacing** — 4px base. `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48`. Card padding 20–24; gaps 8–14; screen rhythm 32+.

**Radius** — `sm 10` (inputs) · `md 12` (buttons, segmented) · `lg 14` (cards) · `xl 28` (bottom sheets) · `pill 999` (pills, avatars). Buttons and chips are fully pilled.

---

## 4. Architecture & navigation

- **Three tabs only, never a 4th:** **Discover · Home · Chat.**
- **Home is the default landing tab.** **My Matches lives inside Home**, not as a tab.
- **Profile + Settings** = one combined entry opened from a header button (avatar/gear) on Home — a sub-screen, not a tab.
- **Notifications live in Chat** (inline in threads), not in a Home header bell.
- **Auth routing:** returning login → straight to Home (no questionnaire). The sign-up questionnaire runs on Sign Up only.

**Build order (keep it):** foundation (tokens) → shared components → pages → flows. Do not build screens before the design system and components exist.

**The canonical match card is THE priority component.** One component reused on Discover, Home, and My Matches — sport, venue + court #, date/time, host + avatar, spots joined/needed, state badge. Building it once is what prevents "cards look different on every page."

**Home sections (fixed order):** 1) NEXT UP (imminent joined match) · 2) You're hosting (See all → hosting-only archive; per-card Edit + Record results) · 3) This week (other joined matches) · 4) Host CTA. Plus a transient JUST PLAYED card when a finished match awaits post-match input (24h window).

**Save-then-route (action-specific, not blanket):** Match Edit → Home + toast · Edit Profile → Settings + toast · Settings inline toggles → save in place (no Save button, no nav). Toasts (created/cancelled/saved) are transient (~2s), never destination screens.

---

## 5. Key business logic (the non-obvious rules)

**Matching — three join paths (`join_mode` on `matches`)**
- **`open` (default)** — instant membership; player self-selects in. Pull-based, no host gatekeeping.
- **`approval`** — CTA becomes "Request to join"; host approves/declines. Player-initiated.
- **`invite`** — host invites a specific player directly; the invited player accepts/declines. Host-initiated; the invite is a personal offer, not a public listing slot.
- **Slot hold while a request/invite is pending = NO.** A pending request or invite does not reserve a slot; first to fill it wins, remaining pending requests/invites expire when the match fills.
- Request states: `requested → approved → joined` | `requested → declined` | `requested → expired`.
- Invite states: `invited → accepted → joined` | `invited → declined` | `invited → expired` (match filled / cancelled / time passed).
- Player profiles are for **peer transparency / accountability**, never host gatekeeping. Trust signals (matches played, attendance %, no-show count, languages) are public, never a gate.

**Match status lifecycle:** `open → full → live → completed → closed` (+ `cancelled`). **Time-based transitions are computed from `start_time`/`end_time` at read time — no cron jobs.** `completed` = ended, within 24h post-match window; `closed` = 24h passed, recording shuts.

**Cancellation:** anyone (host or player) must cancel **≥2h before start**. Cancelling within 2h = a no-show (objective timestamp, lands immediately).

**No-show = reputation only. No automatic blocking anywhere.** A no-show is a visible mark on the profile; no block, no penalty. Two sources, same outcome: (1) within-2h cancellation → lands immediately; (2) "didn't turn up" → needs corroborating reports. Confirming attendance does **not** shield you; host *and* other players can report.
- **Scaled report threshold (the "didn't show" case only):** 2 players → 1 report · 3–4 → 2 · 5–8 → 3 · 9+ → 4 (cap), clamped to the number who actually showed. One report per reporter, no self-report, participants only, 24h reporting window.
- Confirmed no-shows computed at **read time via a Postgres view** (no triggers). Single `no_show_reports` table with a unique constraint; RLS so only participants can report.
- Do **not** reintroduce old auto-block rules ("2 late cancels → 1-week block", etc.) — removed.

**Post-match (2 steps only in Stage 1):** 1) Who played? (everyone defaults to "Played"; tap to flag a no-show) · 2) Result win/lose/draw (optional, "just for fun", feeds win rate). **No star-rating in Stage 1.** Auto-closes once 2 players report results, or after 24h. Result is canonical on Match Details and also posts inline in the match chat.

**Venues:** curated ~27 Doha venues + custom fallback. "Choose Location" is a sub-screen (search · recent · curated list · "add custom"). **Court # is a separate optional free-text field**, not part of venue selection. On `matches` keep both `venue_id` (FK, nullable; set for curated) and `venue_name` (string; used for custom).

**Chat & DMs:** per-match group thread (auto, all joined players) + 1:1 DMs. Four entrances, one canonical thread each (deep-link, never fork). No chat before joining — an open match shows **Join**, not chat. **Open DMs (anyone → anyone)** with guardrails: in-thread block/report, first-contact banner from strangers, **rate-limit new conversations (~10–15/day)**. Block kills the thread both ways and removes it from the inbox.

**Block & report:** stays slightly hidden. Entry: tap username/avatar → Other-Player Profile → ⋯ menu → Report / Block (no primary Block button on the profile). Unblock only via Settings → Safety → Blocked players. Block effects: can't join each other's matches, don't appear in each other's Discover, shared-match messages hidden on the receiving side.

**Settings:** hybrid — ~80% inline toggles, drill-downs for lists/forms/long text. Language (inline EN/عربي), Push (single master toggle, no per-type), Biometric login, Safety drill-down, Legal (links only). **Profiles are public by default** — no-show count and stats are public on every profile surface. This public-by-default stance is the trust mechanism that makes stranger-matching safe; do not gate stats behind a toggle.

**Discover feed is always seeded** — new users never see a blank cold-start. No empty state.

---

## 6. Data model (Supabase)

Apply **Row Level Security on all tables.**

- `users` — id, name, email, phone, avatar_url, sport, skill_level, language (ar/en), dob, attendance_rate, created_at
- `matches` — id, host_id, sport, venue_id (FK nullable), venue_name, venue_location, court_number, start_time, end_time, skill_level, total_spots, spots_available, fee_total, fee_per_player (display only), join_mode (`open`/`approval`/`invite`), status, notes, created_at
- `match_players` — id, match_id, player_id, joined_at, attended
- `match_requests` — id, match_id, player_id, kind (`request`/`invite`), status (`requested`/`invited`/`approved`/`accepted`/`declined`/`expired`), created_at. RLS so only the host and the player involved can see/act. (`request` = player→host; `invite` = host→player.)
- `no_show_reports` — id, match_id, reported_player, reporter_id, created_at, **unique(match_id, reported_player, reporter_id)**. Confirmed no-shows computed at read time via a view.
- `match_results` — id, match_id, player_id, result (win/loss/draw) — optional, feeds win rate
- `venues` — curated Doha venues (reused for Stage 3 court booking)
- `notifications` — id, user_id, type, title_en, title_ar, body_en, body_ar, is_read, created_at

---

## 7. Bilingual / RTL rules

- RTL baked in from the first component — retrofitting is painful.
- Mirror layout cleanly in Arabic; right-align text and inputs.
- **Flip only directional icons** (back arrow, chevrons, send/share arrow). **Do NOT flip:** logos, location pin, search, bell, settings, and anything numeric.
- Numbers and times stay **LTR** even in Arabic. Handle mixed bidi (English venue names inside Arabic strings).
- Use the EN→AR glossary for term consistency across screens. Register: full MSA for legal/policy text; lighter friendly MSA for buttons/microcopy.

---

## 8. Conventions for Claude Code

- Tokens over hardcoded values — always.
- Reuse the canonical match card; don't create per-page card variants.
- Prefer read-time computation (views, computed status) over cron jobs/triggers.
- Keep Stage 1 scope tight — if a request smells like a deferred feature (§1), confirm before building.
- When touching auth, no-show, RLS, or chat, re-check the rules in §5 — they have been deliberately tuned and several "obvious" alternatives were explicitly rejected.

## 9. Reference docs (in this folder)

These are spec/reference material, not a build pipeline. The Lovable handoffs describe **what** to build (product logic, component inventory, screen maps); ignore their Lovable-specific "paste this into Lovable" mechanics — the build now happens in Cursor + Claude Code.

`Connect_App_Logic_Spec.md` (behavioral rules) · `Connect_Lovable_Handoff.md` & `Lovable_Foundation_Handoff.md` (product logic, component inventory, screen maps — reference only) · `Connect_NoShow_Spec_1.7.md` (no-show detail) · `Connect_TechSetup_1.3_Checklist.md` (external services) · `Connect_RTL_QA_Checklist.md` · `Connect_AR_Glossary.md` · `Connect! — Design Tokens.pdf` / `Connect! — Component Inventory.pdf` · `Connect_Community_Standards.md`, `Connect_Privacy_Policy.md`, `Connect_Terms_of_Service.md`.

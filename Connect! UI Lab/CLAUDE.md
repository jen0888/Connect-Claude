# CLAUDE.md — Connect!

Project memory for Claude Code. Read this before making changes. It captures product scope, stack, design tokens, architecture, and the non-obvious business rules. When something here conflicts with code, flag it rather than silently picking one.

> Place this file at the **repo root**. (It currently lives in the design/spec folder "Connect! UI Lab"; copy it into the GitHub repo Lovable syncs to.)

---

## 1. Product

**Connect!** — a mobile-first PWA that helps people in **Doha** find pickup sports matches (padel, tennis, badminton, running). **Stage 1 = free player matching only.** Target: ~500 active players.

- **Matching supports three join paths** (see §5): (1) **open** — player self-selects in, instant; (2) **approval** — player requests to join, host approves/declines; (3) **invite** — host invites a specific player, who accepts/declines. Open is pull-based with no gatekeeping; approval and invite are additive and do not replace it.
- **Waitlist** (see §5): on a **full** match the CTA becomes **Join waitlist**. Orthogonal to `join_mode` — it applies to any full match. Waitlisting holds no slot; when a slot frees the earliest waitlister is auto-promoted. In Stage 1 scope (not a deferred feature).
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

**The canonical match card is THE priority component.** One component reused on Discover, Home, and My Matches — sport, venue + court #, date/time, host + avatar, spots joined/needed, state badge. Building it once is what prevents "cards look different on every page." The card takes a **`variant: 'brief' | 'full'` prop** (brief = condensed render of the same component, never a separate component) and a **save/bookmark toggle**.

**Home sections (fixed order):** 1) NEXT UP (imminent joined match) · 2) You're hosting · 3) This week (other joined matches) · 4) Matches you saved (bookmarked, not yet joined) · 5) Host CTA. Plus a transient JUST PLAYED card when a finished match awaits post-match input (24h window).
- **Per-section caps & card variant:** You're hosting, This week, and Matches you saved each show a **max of 3 matches**. You're hosting uses the **full** card (per-card Edit + Record results); This week and Matches you saved use the **brief** card. NEXT UP is unchanged.
- **"See all":** when a capped section holds **more than 3** matches, show a **"See all" button at the section header's inline-start** (top-left in LTR, mirrors in RTL) opening that section's full list — hosting → `/my-matches`; This week → `/my-matches?filter=week`; Saved → `/saved`. Sections with ≤3 matches show no button. See §5 for the saved-matches and display rules.

**Save-then-route (action-specific, not blanket):** Match Edit → Home + toast · Edit Profile → View Profile (`/profile`) + toast · Settings inline toggles → save in place (no Save button, no nav). Toasts (created/cancelled/saved) are transient (~2s), never destination screens.

**Carry-forward state (data persists across a flow — never re-ask):** Anything the user types or selects on one screen must travel to every later screen where it's relevant. Never re-prompt for a value already given, and never blank a field on navigation. Examples: sign-up questionnaire answers (DOB, gender, sport, skill) pre-fill the new profile; Create-a-Match fields persist into the review/confirm step and onto the created match card; the Choose Location sub-screen returns the picked venue + court # to the create form (and the form keeps everything else entered); Match Edit and Edit Profile open **pre-filled with current values**; going back then forward keeps prior entries intact. Implement by holding each flow's data in **shared form/route state** (context, route params, or a draft object) — not per-screen local state that resets on unmount. This is the companion to Save-then-route: save-then-route decides *where you land* after an action; carry-forward decides *what data you bring with you*.

**Route map (proposed paths — keep paths stable; screens map 1:1 to routes).** React Router over Vite. Only the three tabs keep the bottom tab bar; everything else is a **stacked sub-screen** (pushes over the active tab, back returns) or a **bottom sheet / modal** for transient pickers and confirms. Every screen is reachable by a canonical URL so PWA deep-links and Realtime notifications resolve to one place and never fork a second copy.

| Path | Screen | Type / notes |
|---|---|---|
| `/` | — | Redirect: session → `/home`, else → `/splash` |
| `/splash` | Splash | Public (unauth). **Language (EN/AR) is selected here**, before sign-up |
| `/login` | Log In | Public. On success → `/home` directly (**no questionnaire**) |
| `/signup` | Sign Up questionnaire | Public. Multi-step, in order **DOB · gender · sport · skill**; steps share one draft (carry-forward). DOB is collected first and hard-gates under-18. Gender (`male`/`female`) is required. **Language is set on `/splash`, not here. Country/city are deferred to a later stage** (not collected in Stage 1) |
| `/welcome` | "You're all set" | Post-signup confirmation → `/home` |
| `/discover` | **Discover** | Tab. Always-seeded feed, no empty state |
| `/home` | **Home** | Tab. **Default landing.** Sections (capped at 3 each, "See all" when >3): NEXT UP · You're hosting (full card) · This week (brief card) · Matches you saved (brief card; bookmarked, not joined) · Host CTA (+ transient JUST PLAYED). Pending **invites surface as a transient pop-up sheet over Home** on load (see §5 invite flow); accepted invites land in NEXT UP/This week |
| `/chat` | **Chat** | Tab. Unified inbox; notifications inline in threads. "Decide later" invites land here as an actionable notification |
| `/chat/:threadId` | Chat thread | Sub-screen. Canonical group **or** DM thread (deep-link, never fork). No chat before joining |
| `/my-matches` | My Matches | Sub-screen of Home (hosting "See all" archive; `?filter=week` = This week "See all") |
| `/saved` | Saved Matches | Sub-screen of Home ("Matches you saved" See all). Bookmarked, not-yet-joined matches |
| `/matches/new` | Create-a-Match | Sub-screen. Holds a **draft** object across the whole create flow. **Time fields order: Date → Duration → Start time → End time**; End time **auto-computes** from Start + Duration (recomputes when either changes; handles day-rollover) |
| `/matches/new/location` | Choose Location | Sub-screen. Search · recent · curated · add custom → returns venue + court # to the draft |
| `/matches/new/review` | Review / Confirm | Sub-screen. Pre-filled from the draft → on confirm `/home` + toast |
| `/matches/:id` | Match Details | Sub-screen. Result is canonical here |
| `/matches/:id/edit` | Match Edit | Sub-screen, **pre-filled** with current values → save `/home` + toast |
| `/matches/:id/results` | Post-match | Sub-screen. 2 steps: who played (no-show flag) → optional win/lose/draw. Open ≤24h after end |
| `/players/:id` | Other-Player Profile | Sub-screen. ⋯ menu → Report / Block (no primary Block button) |
| `/profile` | Profile + Settings | Sub-screen from Home header (avatar/gear) — **not a tab** |
| `/profile/edit` | Edit Profile | Sub-screen, **pre-filled** → save `/profile` + toast |
| `/settings` | Settings | Sub-screen. ~80% inline toggles (save in place, no nav) |
| `/settings/safety` | Safety | Drill-down |
| `/settings/safety/blocked` | Blocked players | Drill-down (only place to unblock) |
| `/settings/legal/*` | Legal | External links, not screens |

- **Auth guard:** every route except `/splash` `/login` `/signup` `/welcome` requires a session; unauthenticated hits redirect to `/login`. The sign-up questionnaire runs on `/signup` only.
- **Tabs never nest as routes** — there is no 4th tab. My Matches, Profile, Settings are sub-screens under Home, not tab routes.
- **Save-then-route + carry-forward are route behaviors:** the destination column above is Save-then-route; the draft/pre-fill notes are carry-forward. Don't blank a draft on a sub-screen detour (e.g. `/matches/new` → `/matches/new/location` → back).

---

## 5. Key business logic (the non-obvious rules)

**Matching — three join paths (`join_mode` on `matches`)**
- **`open` (default)** — instant membership; player self-selects in. Pull-based, no host gatekeeping.
- **`approval`** — CTA becomes "Request to join"; host approves/declines. Player-initiated.
- **`invite`** — host invites a specific player directly; the invited player accepts/declines. Host-initiated; the invite is a personal offer, not a public listing slot.
- **Slot hold while a request/invite is pending = NO.** A pending request or invite does not reserve a slot; first to fill it wins, remaining pending requests/invites expire when the match fills.
- Request states: `requested → approved → joined` | `requested → declined` | `requested → expired`.
- Invite states: `invited → accepted → joined` | `invited → declined` | `invited → expired` (match filled / cancelled / time passed).
- **Invite flow (full UX — host-initiated):**
  - **On create:** an invite match is created, lands the host on `/home` (toast), and shows immediately in the host's **"You're hosting"** section regardless of pending invites. The **group chat thread is auto-created at creation** with the **host as sole member** — invited players are NOT added yet (no chat before joining, see §4).
  - **Invited player — Home pop-up:** on `/home` load, any still-joinable `invited` rows surface as a **transient invitation sheet/modal over Home** (not a route/tab), built from the canonical match card. Three actions:
    - **Accept** → insert `match_players`, set invite `joined`, decrement `spots_available`, **add player to the chat thread and route them into `/chat/:threadId`**; the match now appears on the player's Home under **NEXT UP / This week** (joined-match sections), never "You're hosting". Post system message "[Name] joined". **The acceptance propagates live (Supabase Realtime) to every surface on both sides — no manual refresh:** the player's name + avatar fill the roster on the canonical match card and Match Details, the joined count / `spots_available` updates everywhere the card renders, the chat thread's member roster gains the player, and the **host's Match Details shows the invitee as `Accepted`/joined** (invite row no longer pending).
    - **Decide later** → dismiss the sheet (stays `invited`) and surface the invite as an **actionable notification inline in Chat** (`/chat`; notifications live in Chat per §4 — no Home bell). Re-acting (Accept/Decline) is possible from there; the sheet does **not** re-pop on later loads unless a new invite arrives.
    - **Decline** → set `declined`; match shows **nowhere** on the player's side — no Home entry, no Chat notification, no chat access.
  - **No chat access until Accept** — decide-later and declined players never see the thread.
  - **Pending holds no slot:** if the match fills / is cancelled / `start_time` passes while still `invited`, the invite `expires` (read-time, no cron); the pop-up/notification then shows a disabled "Match full / no longer available" state, and a race-losing late Accept fails gracefully ("Match just filled").
- Player profiles are for **peer transparency / accountability**, never host gatekeeping. Trust signals (matches played, attendance %, no-show count, languages) are public, never a gate.

**Waitlist (full matches only — orthogonal to `join_mode`)**
- When a match is `full`, the join CTA becomes **"Join waitlist."** Waitlisting **does NOT hold or reserve a slot** (consistent with the no-slot-hold rule above) — it records interest and a **FIFO position by `created_at`**. Any number of players can waitlist. One entry per player; you can't waitlist a match you've already joined or that you host.
- **Promotion is FIFO and auto.** The moment a slot frees (a joined player cancels before `start_time`), the earliest active waitlister is **auto-promoted** to `joined`, inserted into `match_players`, and sent a notification. **No host approval on promotion**, even for `approval` matches — winning the freed slot via the queue *is* the gate.
- Promotion only happens **before `start_time`**. Once the match goes `live`, locks permanently, or is `cancelled`, all remaining waitlist entries `expire`.
- A promoted player is a **full participant**: bound by the same **≥2h cancellation** rule, and if they can't make it they cancel like anyone (which frees the slot again → promotes the next waitlister).
- **Stage 1 simplicity (deliberate):** auto-promote with **no timed "claim-or-pass" window** — no timers to build. The only risk is a promoted player forgetting and no-showing; mitigated by the notification + the standard cancel path. **Do not add a claim/hold window in Stage 1.**
- Waitlist states: `waitlisted → promoted → joined` | `waitlisted → expired` (match started / filled permanently / cancelled) | `waitlisted → left` (player removes themselves from the queue).
- Position and promotion eligibility derived from `created_at` ordering; promotion **executes as part of the cancellation action** — **no cron jobs, no triggers.**

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

**Profile display & edits (single source of truth):** the profile header stacks identity as **name → location → bio** directly beneath the name (location is a muted line with a `MapPin` icon — not flipped in RTL; empty location/bio lines hide cleanly, no layout jump). **Edit Profile → save → `/profile` (View Profile) + toast**, and **every edited field propagates everywhere the profile renders — no manual refresh.** All profile surfaces read from one shared store / the `users` row, never per-screen copies. Editable public fields (name, avatar, location, bio, **sport, skill level**, **gender**, languages, stats) must reflect on **View Profile (`/profile`)**, **Other-Player Profile (`/players/:id`)** as seen by everyone else (public fields only; viewer fetches the current row, Realtime updates in place if already open), **Settings** (mirrored name/avatar/language), and the **canonical match card / Match Details roster / chat identity**.

**Discover feed is always seeded** — new users never see a blank cold-start. No empty state.

**Home section display (Stage 1 rule):** NEXT UP unchanged. **You're hosting**, **This week**, **Matches you saved** each render at most **3** cards; a **"See all"** at the section header inline-start appears only when the section holds **>3**. Card variant: You're hosting = **full** card; This week & Matches you saved = **brief** card. All variants come from the one canonical match card via a `variant` prop — never per-section components.

**Matches you saved (saved ≠ joined):** a user can **bookmark a match they haven't joined** via a save toggle on the canonical card. Saving is a personal bookmark only — it does **not** join, request, or hold a slot (consistent with the no-slot-hold rule). A match leaves the Saved section when the user **joins** it (moves to NEXT UP/This week), **un-saves** it, or it's **no longer joinable** (full/cancelled/started — read-time, no cron). Saved state reflects **live** on the card's bookmark icon everywhere it renders (Discover, Home, Match Details) via Realtime / shared store. Backed by `saved_matches` (see §6).

**Skill-level label display:** stored value unchanged — display-only, applied via a **single shared formatter** consumed by every surface (canonical card, View/Other-Player Profile, Match Details, etc.). **Single level → full word:** `int` → *Intermediate*, `low int` → *Low Intermediate*, `high int` → *High Intermediate*. **A range (two endpoints) → abbreviated** to fit the space: e.g. *Low Int – High Int*, *Int – High Int*. Provide both full + abbreviated AR strings in i18n; keep labels LTR-safe in mixed text.

**Match time fields (Create-a-Match / Match Edit):** field order is **Date → Duration → Start time → End time**. The user picks **Duration** before the times; entering **Start time auto-fills End time = start + duration**. Changing Start time or Duration recomputes End time; handle day-rollover (e.g. 23:30 + 90m). Values carry forward into review/confirm and onto the created card; `start_time`/`end_time` on `matches` are written from the computed values.

---

## 6. Data model (Supabase)

Apply **Row Level Security on all tables.**

- `users` — id, name, email, phone, avatar_url, sport, skill_level, language (ar/en — **set on `/splash`**), dob, **gender** (`male`/`female` — required, NOT NULL, CHECK/enum; public), **city/location** (nullable — **deferred to a later stage, not collected in Stage 1 sign-up**), **bio** (text, nullable), attendance_rate, created_at
- `matches` — id, host_id, sport, venue_id (FK nullable), venue_name, venue_location, court_number, start_time, end_time (computed from start + chosen duration), skill_level (single level **or** a min–max range; label rendered per §5 skill-level display rule), total_spots, spots_available, fee_total, fee_per_player (display only), join_mode (`open`/`approval`/`invite`), status, notes, created_at
- `match_players` — id, match_id, player_id, joined_at, attended
- `match_requests` — id, match_id, player_id, kind (`request`/`invite`/`waitlist`), status (`requested`/`invited`/`waitlisted`/`approved`/`accepted`/`promoted`/`joined`/`declined`/`left`/`expired`), created_at. RLS so only the host and the player involved can see/act. (`request` = player→host; `invite` = host→player; `waitlist` = player joins the FIFO queue on a full match.) Add **unique(match_id, player_id, kind)** so a player can't double-waitlist. Waitlist position = `created_at` order; FIFO promotion runs in the cancellation action, not a trigger.
- `no_show_reports` — id, match_id, reported_player, reporter_id, created_at, **unique(match_id, reported_player, reporter_id)**. Confirmed no-shows computed at read time via a view.
- `match_results` — id, match_id, player_id, result (win/loss/draw) — optional, feeds win rate
- `saved_matches` — id, user_id, match_id, created_at, **unique(user_id, match_id)**. Personal bookmarks of not-yet-joined matches (Home "Matches you saved"). RLS so a user sees/edits only their own saves.
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
- Carry data forward across a flow — values entered on an earlier screen pre-fill/inform every later screen where they're relevant; never re-ask, never blank on nav (see §4 *Carry-forward state*).
- Prefer read-time computation (views, computed status) over cron jobs/triggers.
- Keep Stage 1 scope tight — if a request smells like a deferred feature (§1), confirm before building.
- When touching auth, no-show, RLS, or chat, re-check the rules in §5 — they have been deliberately tuned and several "obvious" alternatives were explicitly rejected.
- **Dev reset helper (test accounts only).** Provide a one-command way to reset a test user back to the original clean state so sign-up/onboarding can be re-run from scratch every time. "Original setup" = a freshly-created account with **no** carried-forward profile, drafts, or activity. The reset must: (1) delete the user's dependent rows — `match_players`, `match_requests`, `no_show_reports`, `match_results`, `notifications`, chat messages, and any `matches` they host; (2) either **delete the auth user** (so the next login goes through `/signup` again) or blank the profile back to questionnaire defaults (clears sport/skill/DOB/country/city/language and any settings toggles); (3) clear client-side draft/carry-forward state and local storage so no stale data survives the reset. Keep it a **dev-only script/seed task (e.g. a Supabase SQL/seed script), never an in-app feature**, never run against real/production accounts, and gate it so it only targets seeded test users.

## 9. Reference docs (in this folder)

These are spec/reference material, not a build pipeline. The Lovable handoffs describe **what** to build (product logic, component inventory, screen maps); ignore their Lovable-specific "paste this into Lovable" mechanics — the build now happens in Cursor + Claude Code.

`Connect_App_Logic_Spec.md` (behavioral rules) · `Connect_Lovable_Handoff.md` & `Lovable_Foundation_Handoff.md` (product logic, component inventory, screen maps — reference only) · `Connect_NoShow_Spec_1.7.md` (no-show detail) · `Connect_TechSetup_1.3_Checklist.md` (external services) · `Connect_RTL_QA_Checklist.md` · `Connect_AR_Glossary.md` · `Connect! — Design Tokens.pdf` / `Connect! — Component Inventory.pdf` · `Connect_Community_Standards.md`, `Connect_Privacy_Policy.md`, `Connect_Terms_of_Service.md`.

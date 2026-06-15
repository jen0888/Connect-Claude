# Connect! — Lovable Build Handoff (Stage 1)

*Drafted 2026-05-30 · paste sections into Lovable as you build. Fill any `[bracketed]` values from your finished designs.*

---

## 0. Build order — read this first

Do not build screen-by-screen. Build in this order so everything stays consistent:

1. **Foundation** — design tokens + typography (Section 2).
2. **Shared components** — especially the one canonical match card (Section 3).
3. **Pages** — assemble screens from those components (Section 5).
4. **Flows** — wire pages together with their states.

Tell Lovable up front: **this is a bilingual (English + Arabic) RTL app.** Bake RTL in from the first component — retrofitting it later is painful.

---

## 1. Product context

Connect! is a mobile-first PWA that helps people in Doha find pickup sports matches (padel, tennis, badminton, running). Stage 1 is **free player-matching only** — no payments, no coach/court booking (those are later stages). Audience: young, active players in Doha. Matching is **pull-based**: hosts post open matches, players self-select in. No host approval/gatekeeping. 18+ only.

Stack: Lovable (frontend + basic logic) → Supabase (auth + DB) → GitHub. Heavy logic/refactor handled later in Claude Code.

---

## 2. Design foundation

### Design tokens (set these first, fill exact values from your designs)

- **Colors:** brand primary `[#______]`, accent `[#______]`, text primary `[#______]`, surfaces, plus semantic success / warning / danger. Define as tokens; never hardcode hex in components.
- **Type scale:** `[e.g. 12 / 14 / 16 / 20 / 24]`.
- **Border radius:** `[e.g. 8 / 12 / 16]`.
- **Spacing scale:** `[e.g. 4 / 8 / 12 / 16 / 24]`.

### Typography

- **English:** IBM Plex Sans. **Arabic:** IBM Plex Sans Arabic. (Same family = seamless bilingual.)
- **Numerals:** Western (1, 2, 3) in *both* languages — not Arabic-Indic.
- **Figures:** tabular/lining, so numbers align in lists (spots left, times, scores).

### Bilingual / RTL

- RTL from day one. Layout must mirror cleanly in Arabic.
- Use the EN→AR glossary (separate doc) so every term is translated consistently across screens.
- Register: full MSA for legal/policy text; lighter, friendlier MSA for buttons and microcopy.

---

## 3. Component inventory (build before pages)

- **Match card — THE canonical one.** Used on Discover, Home, My Matches everywhere. Build once, reuse everywhere (this prevents cards looking different per page). Shows: sport icon, date/time, venue, spots left, host name + avatar, skill level, fee (display only / "Free"), status. **One component, two variants via a `variant` prop — never a separate card:**
  - **`full`** — the tall card with an image/sport-art header (status badge on the art), serif title, time + skill + location lines, "Hosted by" row, avatar stack + spots, and the action slot (Join / Request / Edit / Attend / View / waitlist…). Used on Discover, Match Details-adjacent surfaces, Home "You're hosting", and the **Upcoming** tab of the **hosting** archive.
  - **`brief`** — a condensed horizontal row: a left **96px art panel** (weekday/date top-left, start time in big serif bottom-left) + right content (sport · venue overline, compact title, optional Ladies-only badge, bookmark toggle, avatar stack + caption, and a chevron or the same action slot). Used on Home "My Matches" + "Matches you saved", and on **both** archive lists' **My Matches** Upcoming + **every Past** list.
  - **Past-archive treatment (brief).** Read-only history. The art top-left shows **weekday + date + month** ("Thu 23 May"); the **lifecycle status** (Just played / Closed / Cancelled) renders as a small token-tinted **chip in the card's bottom-right corner** (the `statusCorner` prop, which also drops the left meta caption). A cancelled row dims/desaturates the art. **No Won/Lost/Played result chip and no "Match completed/cancelled" caption** — the corner chip is the only status indicator. (No numeric score is ever shown — only win/loss/draw is modelled.)
  - Shared extras on both variants: a **save/bookmark** toggle, an optional dark **badge** pill (e.g. "Invite", "Live"), and a host-only pending-**request count** pill.
- **Buttons** — primary / secondary / text, with disabled + loading states.
- **Inputs** — text, selector/segmented (sport, skill level), date/time picker, stepper (spots).
- **Player avatar** — initials fallback.
- **Badges** — skill level, attendance rate, no-show mark, match status.
- **Bottom tab bar** — 3 tabs (Discover · Home · Chat).
- **System/inline chat message card** — for match events inside a thread.
- **Toast** — for save confirmations.

---

## 4. Navigation

- **3-tab bar:** Discover · Home · Chat.
- **My Matches** lives inside Home (not its own tab).
- **Profile** is a sub-screen (reached from Home/menu), not a tab.
- **Save-then-route rules:** Match Edit → back to Home + toast; Edit Profile → back to Settings; inline toggles save in place.

---

## 5. Screens & flows (all designed; export each from UI Lab)

For each screen include its states: **default / empty / loading / error / disabled.**

- **Onboarding/Auth:** Splash, Sign Up (name, email, password, phone, sport, skill, language, DOB), Login, Forgot Password, Reset Password, Google + Apple sign-in, post-signup onboarding. (18+ — collect DOB, not a checkbox.)
- **Discover:** match feed + filter panel (sport / skill / date). Always seeded — never show a blank feed.
- **Home:** NEXT UP · You're hosting (See all → My Matches; tap → Edit) · This week (other joined) · Host CTA · transient **JUST PLAYED** card (appears only when a finished match awaits post-match input, within the 24h window).
- **Match:** Post a Match (create), Match Details, My Matches (created / joined tabs), Cancel Match (confirm + notify joined), Choose Location (curated venue picker + custom + Court #).
- **Post-match (2 steps):** Step 1 — *Who played?* (everyone defaults to Played; tap to flag a no-show); Step 2 — *How did it go?* (optional win / lose / draw). No rating step in Stage 1.
- **Chat:** unified inbox (group match threads + 1:1 DMs), group thread, DM thread, first-contact banner. Match notifications are inline here.
- **Profile:** own profile (attendance rate, no-show marks, win rate "for fun"), Edit Profile, Other-Player Profile (→ ⋯ → Block).
- **Settings:** hybrid inline toggles; Safety branch (Report a Problem, Report Player/Match, Blocked List, Guidelines); Legal = links; Push = single master toggle; About Connect. Profiles are public by default (no privacy drill-down).

---

## 6. Key business logic (the non-obvious rules to tell Lovable)

- **Pull-based matching:** players join open matches directly; no host approval.
- **Match status lifecycle:** open → full → live → completed → closed (plus cancelled). The time-based transitions (live / completed / closed) should be **computed from `start_time` / `end_time` at read time — no cron jobs.** "completed" = ended, within 24h post-match window. "closed" = 24h passed; recording shuts.
- **Cancellation cutoff:** anyone (host or player) must cancel ≥2h before start. Cancelling within 2h = a no-show.
- **No-show = reputation only.** It's a mark on the player's profile; **no block, no penalty.** Two sources: (1) within-2h cancellation → lands immediately (objective timestamp); (2) "didn't turn up" → needs corroborating reports to land. Confirming attendance does NOT shield you; host *and* other players can report.
- **No-show report threshold (scales with match size):** 2 players → 1 report · 3–4 → 2 · 5–8 → 3 · 9+ → 4 (clamped to number who actually showed). Reports valid 24h after start, one per reporter, participants only. (Full detail in `Connect_NoShow_Spec_1.7.md`.)
- **Block:** tap a username → Other-Player Profile → ⋯ → Block (stops them seeing you, joining your matches, messaging you).
- **Open DMs** (anyone can DM anyone) with guardrails: in-thread block/report, first-contact banner, new-conversation rate limit.

---

## 7. Data model (Supabase — plan before connecting)

- `users` — id, name, email, phone, avatar_url, sport, skill_level, language (ar/en), dob, attendance_rate, created_at.
- `matches` — id, host_id, sport, venue_name, venue_location, court_number, start_time, end_time, skill_level, total_spots, spots_available, fee_total, fee_per_player (display only), status, notes, created_at.
- `match_players` — id, match_id, player_id, joined_at, attended.
- `no_show_reports` — id, match_id, reported_player, reporter_id, created_at, unique(match_id, reported_player, reporter_id). Confirmed no-shows computed at read time via a view (threshold from Section 6).
- `match_results` — id, match_id, player_id, result (win/loss/draw) — optional, feeds win rate.
- `notifications` — id, user_id, type, title_en, title_ar, body_en, body_ar, is_read, created_at.
- Apply Row Level Security on all tables (e.g. only participants can report a no-show).

---

## 8. Content & seed data

- Logo + app name (finalized).
- **Seeded Discover feed** — new users must never see an empty feed on first open.
- **Curated 20–30 Doha venues** for the venue picker, plus a custom-entry fallback. Court # is a separate field.

---

## 9. Deferred — do NOT build in Stage 1

- **Player rating** (star rating) → Stage 2, with coach features.
- **In-app notification center** → deferred (chat-inline + Home cards + badges cover Stage 1).
- **Push notifications** → Stage 1.10 (events to push: someone-joined, no-show recorded, new DM, match reminder, post-match prompt, match cancelled).
- Payments / coach booking / court booking → later stages.
- Geolocation, multi-city, native app → deferred (Doha-only, web-first).
- Minors / parental consent → Stage 2 (Stage 1 is 18+).

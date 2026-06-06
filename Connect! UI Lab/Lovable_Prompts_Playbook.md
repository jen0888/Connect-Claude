# Connect! — Lovable Prompt Playbook (Stage 1)

*Paste these into Lovable **in order**. Each block is one prompt. Finish and eyeball the result before moving to the next — that's what keeps the build consistent (foundation → components → pages → flows).*

**Before you start:** fill every `[[ ... ]]` placeholder with your final values. They're all in Prompt 1. Once tokens are set, the rest reference them by name and need no editing.

---

## Prompt 0 — Project setup & ground rules

> I'm building **Connect!**, a mobile-first PWA that helps people in Doha find pickup sports matches (padel, tennis, badminton, football). This is **Stage 1: free player-matching only** — no payments, no coach or court booking.
>
> Critical constraints for the whole project — apply these to everything you generate from here on:
>
> 1. **Bilingual English + Arabic, RTL-ready from day one — but content is English-first for now.** I'm building the English UI first and dropping in Arabic translations later. **This does NOT mean skip RTL.** Build the *layout* to mirror correctly from the very first component so the Arabic copy is a later paste-in, not a rebuild. Specifically:
>    - **Logical CSS only — never hardcode left/right.** Use `margin-inline-start/end`, `padding-inline`, `inset-inline`, `text-align: start/end`. No `margin-left`, `padding-right`, `left:`, `text-align: left`, etc.
>    - **Direction is driven by a setting**, applied as `dir` on the root (`dir="ltr"` now; flipping to `dir="rtl"` must mirror the whole app with zero component changes). Add a quick dev toggle so I can flip `dir` and visually QA RTL even while all copy is still English.
>    - Only **directional icons** flip with `dir` (back arrow, chevrons, send/share). Logos, location pin, search, bell, settings, and anything numeric do **not** flip.
> 2. **All visible text comes from a strings dictionary — no hardcoded UI strings in components.** Create a single i18n strings file with an `en` object (filled in) and an `ar` object (stub now — duplicate the English values or leave keys empty as placeholders). Every component reads its labels from this file by key. When my translations arrive I paste them into the `ar` object only — components never change. **Numbers, times, and counts stay as Western numerals (1, 2, 3) in both languages and always render LTR.**
> 3. **Mobile-first.** Design for a phone viewport; this ships as an installable PWA.
> 4. **Build order:** we will build foundation (tokens + type) first, then shared components, then pages, then wire flows. **Do not generate any screens or pages yet.** Wait for my page prompts.
> 5. **Tokens only — never hardcode** colors, spacing, radii, or font sizes inside components. Everything inherits from the design tokens I define next.
> 6. Stack: Lovable frontend → Supabase (auth + DB) → GitHub. We'll connect Supabase later; don't add backend calls yet.
>
> Confirm you understand, then set up an empty mobile-first PWA shell with: `dir`-driven layout wired to a language setting (defaulting to English/LTR), a dev toggle to flip direction for QA, and the i18n strings file scaffold (`en` filled, `ar` stubbed). Stop there.

---

## Prompt 1 — Design tokens & typography (foundation)

> Set up the global **design system / tokens** now. Define these as theme tokens (CSS variables / Tailwind theme) so every component inherits them. Do not build components or pages yet.
>
> **Colors** (fill from my designs):
> - primary `[[#______]]`, primary-pressed `[[#______]]`
> - background `[[#______]]`, surface/card `[[#______]]`, border `[[#______]]`
> - text-primary `[[#______]]`, text-secondary `[[#______]]`
> - success `[[#______]]`, warning/error `[[#______]]`
> - **hosting accent** `[[#______]]` — used only on "you're hosting" cards
>
> **Typography:**
> - Font family: **IBM Plex Sans Arabic** for both Latin and Arabic (one family, seamless bilingual). Load it.
> - Type scale: display `[[__]]` / H1 `[[__]]` / H2 `[[__]]` / body `[[__]]` / caption `[[__]]` / button `[[__]]`.
> - **Numerals: Western (1, 2, 3) in both languages — never Arabic-Indic.** Use **tabular/lining figures** so times, counts and scores align in lists.
>
> **Radius:** card `[[__]]` / button `[[__]]` / input `[[__]]` / pill-badge `[[__]]`.
>
> **Spacing scale:** `[[4 / 8 / 12 / 16 / 24 / 32]]` — use these for all padding and gaps everywhere.
>
> **RTL rules baked into the system (even though copy is English for now):** layout mirrors when `dir="rtl"`; text and inputs align to `start` (so they right-align automatically in RTL); **numbers and times always stay LTR**; plan for mixed bidi later (English venue names inside Arabic strings). Only directional icons flip (back arrow, chevrons, send/share). Logos, location pin, search, bell, settings, and anything numeric do **not** flip. Build all token-driven styles with **logical CSS properties** — no hardcoded left/right.
>
> Generate a quick tokens preview page so I can see colors, the type scale, and a sample component rendered **both LTR and RTL** (English copy in both — I just want to confirm the layout mirrors cleanly). Then stop.

---

## Prompt 2 — Shared components (build before any page)

*Send this as one prompt, or split the match card into its own prompt first if you want to get it perfect — it's the priority.*

> Build these **reusable shared components** now, using only the tokens from the design system. No pages yet. Each component must work in both LTR and RTL.
>
> 1. **Canonical match card — THE priority.** ONE component reused by every list (Discover, Home, My Matches). It must never look different per page. Shows: sport (icon or label), venue name + court #, date/time, host name + avatar, players joined / needed (spots left), skill level, fee shown as display-only / "Free", and a **state badge**. Props drive all of it. Include a "hosting" visual variant that uses the hosting accent token.
> 2. **Buttons** — primary, secondary, destructive; states: default / pressed / disabled / loading.
> 3. **Inputs & form fields** — text, select/picker, segmented (sport, skill level), date picker (for DOB), stepper (spots). Each with a right-aligned Arabic variant.
> 4. **Avatar + username** — initials fallback; the username is tappable (→ other-player profile later).
> 5. **Badges / pills** — match state, skill level, no-show reputation mark, unread count.
> 6. **Toasts** — match created, match cancelled, changes saved.
> 7. **Bottom tab bar** — 3 tabs: **Discover · Home · Chat**.
> 8. **Rows / cards** — profile card, venue/location row, chat list row.
> 9. **System / inline chat message card** — for match events posted inside a chat thread.
>
> **Icons:** use the built-in `lucide-react` set for all standard glyphs (back arrow, chevrons, search, filter, bell, chat bubble, plus, settings, location pin, calendar/clock, user, share, more ⋯, check, x, block, flag). Keep one icon = one action everywhere. For sports, a single generic racket icon or a text label per sport is fine for Stage 1. I'll supply the brand logo/wordmark and splash/PWA icon separately.
>
> Make a component gallery page so I can review every component and its states. Then stop.

---

## Prompt 3 — Navigation shell

> Build the app navigation shell using the tab bar component. Still no full pages — just the shell and routing.
>
> - **3-tab bottom bar:** Discover · Home · Chat.
> - **My Matches** lives *inside* Home — it is **not** its own tab.
> - **Profile** is a sub-screen opened from a name/avatar — **not** a tab.
> - **Chat** holds match chat rooms, 1:1 DMs, and notifications.
> - Set up routes/placeholders for each so I can navigate between empty tabs. RTL: the tab bar and any back navigation must mirror correctly in Arabic.

---

## Prompt 4 — Onboarding & Auth flow

> Build the onboarding + auth flow. Assemble from existing components; include each screen's states (default / empty / loading / error / disabled).
>
> Flow: **Splash → Sign Up → 3 onboarding questions → review Community Guidelines → "All set" → Home.**
>
> - **Sign Up** collects: name, email, password, phone, sport, skill level, language, and **DOB**. **18+ only — collect date of birth, not a checkbox.** Validation error states required; "Next" disabled until valid.
> - Also include **Login, Forgot Password, Reset Password**, and **Google + Apple sign-in** buttons (UI only for now — no backend yet).
> - **3 onboarding questions:** "Next" stays disabled until each is answered.
> - **Community Guidelines review screen** before "All set".
> - Don't wire Supabase auth yet — just the screens, states, and navigation.

---

## Prompt 5 — Discover (find & join)

> Build the **Discover** tab. Reuse the canonical match card for every match in the feed.
>
> Flow: **Discover feed → Search panel → Filter panel → Match details → Join / Request.**
>
> - The feed is **always seeded** — a new user must **never** see a blank cold-start. No empty state here.
> - **Discover lists all matches for the same day**, and lets the user follow into next-day matches.
> - **Filter panel:** sport / skill / date.
> - **Two match types:** **open** (self-select / auto-accept — the default) and **approval-required** (request → host approves/declines).
> - **Slot hold while pending = NO.** A request does **not** reserve a slot; the host collects all incoming requests and chooses who to play with.
> - An **open** match shows a **Join** button (not chat). An approval-required match shows **Request**.
> - **Do NOT build:** "match full" / closed / paid branch — those are deferred.
> - States: default / loading / error. (No empty state by design.)

---

## Prompt 6 — Home

> Build the **Home** tab. Reuse the canonical match card everywhere.
>
> Four sections, in order:
> 1. **NEXT UP** — the user's nearest upcoming match.
> 2. **You're hosting** — host cards (use the hosting accent variant). A **See all** link → My Matches (hosting + past). Tapping a card → **Edit Match**. Each card has a **Record results** action.
> 3. **This week** — other matches the user has joined.
> 4. **Host CTA** — prompt to create a match.
> - Also a transient **JUST PLAYED** card that appears only when a finished match is awaiting post-match input, within the 24h window.
>
> Sub-screens: **My Matches** (all, hosting + joined), **My Match Details**, **Edit Match**, **Cancel Match confirmation**.
> - **Match Details is the canonical record of a match result.** A results summary also posts **inline in the match chat room** (nothing important should be discoverable only by opening a thread).
> - **Route rule:** saving an Edit Match → return to **Home** + a "changes saved" toast.
> - States for each screen: default / empty / loading / error.

---

## Prompt 7 — Create a match

> Build the **Create a Match** flow.
>
> Flow: **Create Match form → Choose Location → save → match-created toast.**
>
> - Form fields: sport, date/time, skill level, total spots (stepper), match type (open / approval-required), notes, fee (display only — default "Free").
> - **Choose Location** is a sub-screen: a curated picker of **27 Doha venues** with a **custom-entry fallback**. **Court #** is a **separate field**, not part of the venue name.
> - On save: show the **match-created toast**; also handle the changes-saved / cancelled toast states.
> - I'll provide the 27-venue list to wire into the picker.

---

## Prompt 8 — Chat

> Build the **Chat** tab.
>
> - **Unified inbox** of canonical threads → opens either a **group thread (per match)** or a **1:1 DM**.
> - **Open DMs:** anyone can DM anyone, with guardrails — in-thread **block/report**, a **first-contact banner** on a new conversation, and a **new-conversation rate limit**.
> - **Match notifications appear inline** in the relevant chat room (use the system/inline message card). Results summaries post here too.
> - There are 4 entry points into chat; remember an **open match shows Join, not chat**.
> - States: default / empty / loading / error.

---

## Prompt 9 — Post-match flow

> Build the **post-match** flow — 2 steps.
>
> - **Step 1 — Who played?** Everyone defaults to **Played**; tap a player to flag a **no-show**.
> - **Step 2 — How did it go?** Optional **win / loss / draw**. (No player rating in Stage 1 — that's deferred.)
> - **Close rule:** once **2 players report** results the match closes automatically; otherwise it **auto-closes 24h after the match**.
> - Entry: from the **Record results** action on a host card, and the **JUST PLAYED** Home card.

---

## Prompt 10 — Profile, safety & settings

> Build **Profile** and **Settings** (Profile is a sub-screen, not a tab).
>
> - **Own profile:** attendance rate, no-show marks, win rate (labelled "for fun"). **Edit Profile.**
> - **Other-Player Profile:** reached by tapping a username anywhere → opens profile → **⋯ menu → Block**. Block stops them seeing you, joining your matches, and messaging you.
> - **Settings — hybrid inline toggles** that save in place. Profiles are **public by default** (no privacy drill-down).
>   - Drill-downs: **Report a Problem**, **Report a Player/Match**, **Blocked List**, **Guidelines**.
>   - **Legal = links**, not a screen.
>   - **Push = a single master toggle** only.
>   - **About Connect** section.
> - **Route rules:** View/Edit Profile saves → returns to **Settings**; inline toggles save in place.

---

## Prompt 11 — (Later, after designs are locked) Connect Supabase

*Do this only once the Arabic RTL pass and the 3–5 real-user review are done and designs are locked. This is Stage 1.3+ work.*

> Connect this project to Supabase and create these tables (apply **Row Level Security** on all of them):
>
> - **users** — id, name, email, phone, avatar_url, sport, skill_level, language (ar/en), dob, attendance_rate, created_at
> - **matches** — id, host_id, sport, venue_name, venue_location, court_number, start_time, end_time, skill_level, total_spots, spots_available, fee_total, fee_per_player (display only), status, notes, created_at
> - **match_players** — id, match_id, player_id, joined_at, attended
> - **no_show_reports** — id, match_id, reported_player, reporter_id, created_at; unique(match_id, reported_player, reporter_id)
> - **match_results** — id, match_id, player_id, result (win/loss/draw) — optional
> - **notifications** — id, user_id, type, title_en, title_ar, body_en, body_ar, is_read, created_at
>
> **Match status lifecycle:** open → full → live → completed → closed (plus cancelled). Compute the **time-based transitions (live / completed / closed) from start_time / end_time at read time — no cron jobs.** "completed" = ended, within the 24h post-match window; "closed" = 24h passed, recording shuts.
>
> RLS example: only match participants can file a no-show report.
>
> *(The no-show threshold logic and 2h cancellation cutoff are heavy logic — handle those in Claude Code via the GitHub repo, not here. See `Connect_NoShow_Spec_1.7.md`.)*

---

## Things to keep out of Stage 1 (tell Lovable if it tries to add them)

Player star-rating, an in-app notification center, push notifications, payments / coach booking / court booking, geolocation / multi-city / native app, and any minors / parental-consent flow. All deferred.

---

## Quick reference — non-obvious rules

- **Pull-based matching** by default: players join open matches directly, no host approval. Approval-required is the additive second type.
- **Cancellation cutoff: 2 hours.** Cancelling **within 2h** of start counts as a no-show.
- **No-show = reputation only:** a profile mark, no block, no penalty. Confirming attendance does not shield you; host and other players can report.
- **Canonical everything:** one match card, one set of threads, one results record (Match Details), mirrored inline in chat.

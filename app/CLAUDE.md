# CLAUDE.md — Connect! (app/)

Implementation memory for the **runnable app** in `app/`. Read this before editing.
Product/business rules and the Supabase target schema live in the spec-level
`../Connect! UI Lab/CLAUDE.md` (referred to here as **spec §x**); this file documents
what's *actually built in code*. When code and a doc disagree, trust the code and flag it.

---

## 1. What the app is

- **Connect!** — a mobile-first pickup-sports matchmaking app for **Doha, Qatar** (currency **QAR**).
- Sports: **padel · tennis · badminton · running**.
- Core user jobs: **discover** open matches → **host** a match → **join / request / approve** players (+ FIFO **waitlist**) → **chat** (per-match group + DMs) → **record results** post-match.
- Stage 1 scope: free matching only, cash-on-arrival (no in-app payments), 18+, Doha-only. See spec §1.

---

## 2. Tech & file structure

**Stack** — React 19 + TypeScript, **Vite 8**, **Tailwind v4** (`@tailwindcss/vite`, config-less — tokens live in `src/index.css`), `react-router-dom` v7, **lucide-react** icons, `clsx`/`tailwind-merge`/`cva` (via `cn()` in `lib/utils.ts`). No shadcn; components are local. Run: `npm run dev` (Vite), `npm run build` (`tsc -b && vite build`), `npm run lint`.

**Entry / frame** — `index.html` (loads Inter + Instrument Serif + IBM Plex Sans Arabic) → `main.tsx` → `App.tsx` (`<Routes>`). Every screen renders inside `Shell` = the phone frame: `max-w-[430px]`, `h-dvh`, cream page on a dark backdrop, ambient `Blobs`, optional floating `BottomNav`.

**State** — single **in-memory reactive store** (`lib/store.ts`) via `useSyncExternalStore`, seeded from `lib/mock/*`. Repository-shaped accessors mirror future Supabase queries. A few things persist to `localStorage`: `connect.freshAccount`, profile-done flag, and **`connect:hostedMatch`** (see §5). ES modules throughout — **no `window` globals, no inline Babel** (that was the old prototype in `../Connect! UI Lab/`).

**Key files**

| Area | File(s) | Owns |
|---|---|---|
| Design tokens | `src/index.css` | CSS vars on `:root`, Tailwind `@theme` mapping, type-scale `@utility`s, `.num`/`.screen`/`.scroll`/`.hscroll` |
| Store | `lib/store.ts` | `DB`, `useDB()`, accessors (`hostedMatches`, `joinedMatches`, `discoverFeed`, `waitlistPosition`…), `actions.*` (CRUD + join/approve/invite/waitlist/chat) |
| Status logic | `lib/status.ts` | `computeStatus` (read-time lifecycle), `canCancelCleanly` (≥2h), `noShowReportThreshold` |
| Formatting | `lib/format.ts` | `hm`/`timeRange` (24h), **`to24h`** (normalise `"HH:mm"` → zero-padded 24h), `dayLabel`, `matchKind`, `skillLabel`, `initials`, `hoursUntil`, **`countdownUntil`** (Home "Next up": `"3d"`/`"5h"`/`"soon"`)… |
| Date/time (form) | `lib/datetime.ts` | shared create/edit-form helpers: `keyOf`, `labelFromKey` ("Thu · May 23"), `addMinutes`/`diffMinutes`, `normalizeTime` (parse free-typed time) |
| Hosted match (demo SoT) | `lib/hostedMatch.ts` | `HostedMatch` type, `read/write/clearHostedMatch`, reactive `useHostedMatch()` (localStorage `connect:hostedMatch`) |
| Types | `lib/types.ts` | `Match`, `User` (incl. `bio`/`area`/`city`/`languages`/`verified`), `MatchRequest`, `Venue`, `Sport`, `SkillLevel`, statuses |
| Sport glyph | `lib/sports.tsx` | **`SPORT_EMOJI`/`sportEmoji(sport)`** — single source for the per-sport emoji (padel 🏓 · tennis 🎾 · badminton 🏸 · running 🏃), shown in front of the label on create/edit forms + profile |
| Profile sports | `lib/profile.ts` + `screens/profile/SportsLevelSection.tsx` | multi-sport list: `read/write/clearProfileSports` (localStorage `connect.profileSports`), `SkillRating` ⇄ `SkillLevel` mappers; section lets a player add several sports + self-rate each |
| Locations | `lib/locations.ts` | `QATAR_CITIES`, `AREAS_BY_CITY`, `areasFor(city)` — reference data for the Edit Profile city/area selects |
| Mock data | `lib/mock/data.ts`, `lib/mock/venues.ts` | seeded users/matches/threads; `VENUES` (~27 Doha venues) + `venuesForSport` |
| Shared atoms | `components/controls.tsx` | `Segmented`, `Toggle`, `Slider`, `DualSlider`, `PlayerDots`, `CTA`, `MiniMap` |
| Shared UI | `components/` | `Shell`, `Eyebrow`, `MatchCard` (THE canonical card), `SportArt`, `Avatar`, `Blobs`, `BottomNav`, `Toast`, `lifecycle.tsx` |
| Create/Edit (store) | `screens/matches/CreateMatchScreen.tsx` | `CreateMatchScreen({mode})` — store-backed form at `/matches/create` & `/matches/:id/edit` |
| Create/Edit (demo) | `screens/matches/EditMatchScreen.tsx` | `EditMatchScreen({mode})` — **localStorage** form at `/matches/edit-demo` & `/matches/create-demo` (see §5) |
| When section (shared) | `screens/matches/WhenCard.tsx` | `WhenCard` — date strip + native calendar + typeable 24h start/end + duration; used by **both** create/edit forms so date/time never drift |
| Venue picker | `screens/matches/VenuePicker.tsx` | bottom sheet; `VenueSelection`; court vs running-route |
| Home | `screens/home/` | `HomeScreen`, `FirstTimerHome` (empty state), `HostedMatchCard`, `WeekMatchCard`, `RecordResultHomeCard` |
| Other screens | `screens/{discover,chat,profile,postmatch,safety,auth}/` | Discover, chat list/threads/DM, profile/edit/settings, post-match recording, safety, auth+onboarding |

Routes are in `App.tsx`; 3 tabs (Discover · Home · Chat), Home is default; My Matches lives under Home (spec §4).

---

## 3. Design system / tokens — "Editorial Calm"

Source of truth = `src/index.css` (`:root` → Tailwind `@theme`). **Never hardcode a hex/size — consume the token.**

| Token | Value | Use |
|---|---|---|
| `--surface-page` | `#F4F0E8` | cream app background |
| `--surface-card` | `#ffffff` | cards |
| `--color-text` (`ink`) | `#1a1a1a` | primary ink |
| `--color-text-muted` | `rgba(26,26,26,.55)` | labels / secondary |
| `--color-text-faint` | `rgba(26,26,26,.42)` | disabled |
| hairline border | `rgba(26,26,26,.10)` | card / divider lines |
| `--color-brand` | `#C76A48` | terracotta accent — CTAs, selected, italic emphasis, slider fill |
| `--color-brandstrong` | `#A04A2C` | pressed brand |
| `--color-accent` | `#8A6B3A` | eyebrows / identity / links |
| `--color-text-onbrand` | `#F4F0E8` | cream text on brand/dark |
| lifecycle | success `#3E7A5A` · info `#3C6079` · warning `#8A6B3A` · danger `#A23B2C` · live `#C25A38` · neutral `#8C8478` | match states |

- **Type — two families only.** `--font-ui` = **Inter** (400/500/600, body + labels); `--font-display` = **Instrument Serif** (H1, time numerals, big numeric values, input headlines). Italic display tinted `text-brand` = emphasis. Arabic falls back to IBM Plex Sans Arabic. Scale utilities: `type-display-xl/l/s`, `type-title`, `type-body(-lg)`, `type-label`, `type-caption`, `type-overline`.
- **Card spec:** radius **22px**, **1px hairline** border, padding **~18px**, optional `shadow-card`.
- **Eyebrow:** accent dot + 10.5px uppercase 0.2em muted label (`<Eyebrow accent=… />`).
- **Controls** (`controls.tsx`): `Segmented` (selected = brand fill / cream text), `Slider`/`DualSlider` (brand fill + ticks), `Toggle` (iOS switch), `PlayerDots` (first = brand w/ initials, rest dashed `+`), `CTA` (brand pill, `disabled`/`loading`/`big`).
- **`accent` is a single threaded prop** (defaults to a token) on `Eyebrow`, `SportArt`, `Avatar`, etc. — pass it, don't restyle.
- **Sport glyph = emoji, not icon.** Each sport renders a shared emoji in front of its label via `sportEmoji()` (`lib/sports.tsx`) — 🏓 padel · 🎾 tennis · 🏸 badminton · 🏃 running. Used on the create/edit sport pills and the profile Sports & level rows. Don't reintroduce per-sport lucide icons; add new sports to the one `SPORT_EMOJI` map.
- **Numerals:** Western digits always; functional figures use `.nums-tabular`; times/numbers stay LTR via `.ltr-nums` (RTL-safe).

---

## 4. Data model

There are **two shapes**: the canonical store `Match` (Supabase-shaped, snake_case) and the **edit-form / `HostedMatch`** shape (camelCase, what the create/edit form + Home card use). Keep them in sync via the mapper in `EditMatchScreen.save()`.

**Store `Match`** (`lib/types.ts`) — `id, host_id, sport, venue_id?, venue_name, venue_location?, court_number?, route_start?, route_end?, round_trip, start_time(ISO), end_time(ISO), skill_level, total_spots, spots_available, fee_total?, fee_per_player?, join_mode('open'|'approval'|'invite'), status('active'|'cancelled'), notes?, created_at`. Read-time `MatchStatus` is computed, not stored (§5).

**`HostedMatch`** (`lib/hostedMatch.ts`) — the host's own match, the form's working shape:

| Field | Meaning |
|---|---|
| `sport` | padel / tennis / badminton / running |
| `name` | match title (serif headline) |
| `dateKey` / `dateLabel` | ISO `yyyy-mm-dd` / display `"Thu · May 23"` (derived from `dateKey` via `labelFromKey`, any month) |
| `startTime` / `endTime` | **24h `"HH:mm"`**, displayed as-is (no AM/PM anywhere — see §5) |
| `matchType` | `casual` \| `competition` |
| `gender` | `mixed` \| `ladies` |
| `requireApproval` | join instantly vs approve (maps to `join_mode`) |
| `isFree` / `pricePerPlayer` | Free vs split; QAR per player (digits string) |
| `players` / `filled` | total spots / taken (host = 1) |
| `minLevel` / `maxLevel` | 1–5 skill range (see `LEVEL_NAMES`) |
| `waitlistOpen` / `waitlistSize` | queue toggle + 1–8 cap |
| `description` | free text (≤240) |
| `venueName, area, setting, court` | court-sport location |
| `isRoute, routeEnd, loop, km` | running route instead of a court |

- **`LEVEL_NAMES`** (edit form, 5-step): `Baby · Beginner · Low int. · High int. · Advanced`. (Distinct from the store's 7-step `SkillLevel`; the form maps the 1–5 range onto `skill_level` in `CreateMatchScreen` via `levelRange`.)
- **Venues:** `VENUES` seed (~27 curated Doha venues, `venuesForSport(sport)`). `VenueSelection` (`VenuePicker`) carries `id|'custom'|'route'`, name/area/setting, optional **court # (separate free-text)**, or route `endName/loop/km`. Running has no fixed venues → start/finish route. (Note: the brief's `locDist` is **not** modelled.)

---

## 5. Core logic & conventions

- **Create vs Edit (`mode` prop).** Both `CreateMatchScreen` and `EditMatchScreen` take `mode: 'create'|'edit'`.
  - Edit pre-fills from the existing match; footer = **Save changes** + **Cancel match** (destructive confirm). Create opens blank; footer primary = **Create match**.
  - `CreateMatchScreen` (store flow) enforces a **required-choice guard**: Cost *and* Joining must be explicitly chosen before create (reminder sheet otherwise). In edit they're already set.
  - `EditMatchScreen` (demo flow) branches on `isCreate`: create shows the "New match · {date}" eyebrow + "Host a match." hero and hides the destructive Cancel link; edit shows "You're hosting" + "Edit your match." + Cancel.
- **Persistence / source of truth.** The **demo** create/edit flow (`EditMatchScreen`) is the single source of truth for *the host's own match*: it writes **`localStorage` `connect:hostedMatch`** via `writeHostedMatch`, and `HomeScreen` reads it with the reactive `useHostedMatch()` — so Home's "You're hosting" card reflects creates/edits instantly and **survives reload**. Save → `/home`; Cancel → `clearHostedMatch()` (card disappears). When present it is **preferred over** the seeded store hosted matches. The **store** flow (`CreateMatchScreen` + `actions.createMatch/updateMatch`) is the older, separate path — see §7.
- **Fresh account = clean slate.** `actions.startFreshAccount()` (the onboarding "Create account" step) resets the seeded data via `freshDB()` **and** calls `clearHostedMatch()` — otherwise a `connect:hostedMatch` left in localStorage from a prior session would make `HomeScreen` render the "You're hosting" variant instead of `FirstTimerHome`. So a brand-new account always lands on the first-timer Home (seeded Discover feed + Find a match / Host one).
- **Onboarding identity → every screen.** Sign-up answers live in the `onboarding` proxy (`lib/onboarding.ts`, localStorage `connect.onboarding`): **`name`** is written on the Sign Up screen's *Create account* (after `resetOnboarding()`; empty falls back gracefully), **`sport`** and **`skill`** by the questionnaire steps. The single source for the *current user's display identity* is the store user `getUser(db, currentUserId)` — **no screen reads `useAuth().user` directly**. For a **fresh account** (`isFreshAccount()`), `withSignedIn` overlays the onboarding `name`/`sport`/`skill_level` onto that user, so the sign-up answers win over the dev/mock signed-in profile. This matters because `AuthProvider` re-applies the dev `mockUser` ("Jen") via `setSignedInUser` on every mount/reload; without the overlay it would clobber the typed name. Result: the typed name **and the avatar initials derived from it** are consistent on every page (Home greeting/avatar, Profile, Edit Profile, Chat, "Hosted by", `MatchCard`/`AvatarStack`, post-match) and survive reload. `freshDB()` applies the same overlay for the module-init case (before `AuthProvider` mounts). The `mockUser` "Jen / padel / intermediate" only shows in the seeded/demo (non-fresh) account.
- **First-timer Home feed = Discover, filtered.** `FirstTimerHome` renders the first 3 of the same `discoverFeed(db)` Discover uses (no separate array), filtered by the user's picks: `m.sport === sport && (m.skill_level === skill || m.skill_level === 'any')`. If that's empty it falls back to the full nearby feed with an honest label (`No {Sport} at your level — nearby`) — never blank (§5). Ids stay stable across Home/Discover. Host one (and the header **+**/footer) → `/matches/create-demo` → on **Create match** writes `connect:hostedMatch` and routes to `/home`, where it surfaces under "You're hosting".
- **Time handling — 24h everywhere, no AM/PM.** Times are stored and displayed as **24h `"HH:mm"`**; there is **no 12h/AM-PM anywhere** in the UI. `format.to24h()` normalises an `"HH:mm"` string to zero-padded 24h for display; `MatchCard`/details use the existing 24h `hm`/`timeRange`. Start/End on **both** create/edit forms are **typeable** — the shared `WhenCard` renders them as plain text fields (no clock glyph) that accept free input (`1830`, `18:30`, `7:5`, `9`) and commit a value normalised by `datetime.normalizeTime` on blur/Enter (clamped to 0–23 : 0–59, falling back to the prior value on garbage).
- **Date selection.** `WhenCard` shows a 10-day quick-pick strip **anchored to today** plus a native `<input type="date">` calendar pill for any date; picking a date outside the window re-anchors the strip so the selection stays visible. `dateLabel` is derived from `dateKey` via `datetime.labelFromKey` (correct for any month). Create flows pass `restrictPast` so the calendar's `min` is today.
- **Numbers-only inputs.** Price uses `type="number" inputMode="numeric"`, `onChange` sanitises to `/[^0-9]/g`, keydown blocks `e/E/+/-/.`, and the **`.num`** class hides native spinners.
- **Scroll model.** One scroll owner per screen: `Shell`/`.screen` clips with `overflow:hidden`; an inner `.scroll` owns vertical scroll (`56px 22px 130px` padding for back-button + sticky footer). Horizontal rails (date strip, sport pills) use **`.hscroll`** (hidden scrollbar). Never `scrollIntoView`.
- **Duration logic** (in `WhenCard`, shared by both forms). Picking a duration preset (`30/60/90/120` or custom popover) rolls **End = Start + duration**; changing Start re-rolls End by the current duration (`datetime.addMinutes`/`diffMinutes`).
- **Lifecycle / status** (`computeStatus`, read-time, no cron): `open` (spots left) → `full` → `live` (start≤now<end) → `completed` (≤24h after end) → `closed`; `cancelled` is stored. Cancel cleanly only **≥2h** before start (`canCancelCleanly`), else no-show.
- **Waitlist** (`actions.joinWaitlist/leaveWaitlist`, `waitlistPosition`): full matches only, FIFO by `created_at`, **auto-promote** the earliest waitlister when a slot frees — **no host approval on promotion** even for `approval` matches. See spec §5 for the full rules (threshold table in `noShowReportThreshold`).

---

## 6. Conventions for future edits

- **Tokens over hardcoded values**, always (`var(--color-…)` / Tailwind token classes).
- **Reuse the canonical `MatchCard`** — don't make per-page card variants. Reuse `controls.tsx` atoms instead of restyling.
- **Thread `accent` as a prop**; don't hardcode the terracotta.
- **Keep field names consistent across screens** (store `Match` ↔ `HostedMatch`); if you add a field, update the mapper in `EditMatchScreen.save()` and the `HostedMatchCard` render together so they can't drift.
- **Date/time UI goes through `WhenCard` + `lib/datetime`** — both create/edit forms render the same `WhenCard`; don't reintroduce a per-form date strip or time input, and never re-add a 12h/AM-PM formatter.
- **Match the cream / serif "Editorial Calm" look**; display moments in Instrument Serif, body in Inter, italic-brand for emphasis words.
- **Keep every screen inside `Shell`** (the phone frame) with the one-scroll model.
- **Prefer read-time computation** (`computeStatus`) over stored/derived flags; keep Stage-1 scope tight (spec §1) — confirm before building deferred features.
- **Profile/own-user page headers show only the Edit (pencil) action — no Settings gear** (Settings has its own `/settings` route). This is a standing rule for future pages too; if a page genuinely needs Settings in its header, confirm first.
- **Profile identity reads the one source.** No screen reads `useAuth().user` directly — the current user's display identity is `getUser(db, currentUserId)`; persist edits through `actions.updateProfile` (never a per-screen copy). Profile name highlights the **first** name in italic accent (not the surname).
- RTL-aware: directional icons use `rtl:rotate-180`; numbers/times stay LTR (`.ltr-nums`).

---

## 7. Known gaps / TODOs

- **Two parallel create/edit flows.** `CreateMatchScreen` (store-backed, `/matches/create`, `/matches/:id/edit`) vs `EditMatchScreen` (localStorage demo, `/matches/edit-demo`, `/matches/create-demo`). They now **share the `WhenCard` date/time UI** (and `lib/datetime` helpers) so date + time can't drift, but still differ in persistence (store vs localStorage) and field set (the demo adds match name, gender, waitlist). The Home "Host one" / first-timer route to the **demo** (`/matches/create-demo`); the Home header **+** routes to the **store** flow (`/matches/create`). These should eventually converge on one implementation/schema.
- **Live Supabase path is now wired (dual-mode store).** `lib/store.ts` runs in one of two modes. **Live mode** activates when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set (`.env.local`, gitignored — **currently present**, so the running app is live): on a real session `AuthContext` calls `connectLive(userId)`, which hydrates the whole `db` via `fetchSnapshot` (`lib/repo.ts`), subscribes a `connect-db` Realtime channel to **all** `public` postgres_changes → debounced `scheduleRehydrate`, and flips `liveReady = true`. With `liveReady`, each `actions.*` mutates the store optimistically **and** writes to Supabase — simple field writes via `afterWrite(supabase.from(...).update/insert(...))` (e.g. `updateProfile` → `users`), multi-row/atomic ops via `rpc('join_match' | 'approve_request' | 'accept_invite' | …)`. `disconnectLive()` tears the channel down on sign-out. **Mock mode** (no env / no session) is the fallback: in-memory `lib/mock/*`, reset on reload except the localStorage keys, with the dev-`mockUser` overlay. **Auth:** `lib/supabase.ts` shared client + `context/AuthContext.tsx` (`getSession` + `onAuthStateChange`, `signInWithPassword`/`signOut`), `useAuth()` → `{ user, session, loading, signIn, signInWithMock, signOut }` (`signOut` returns `{ error }` and clears local state **only on success** — no half-sign-out). `AuthContext.toAppUser` maps the auth user → app `User`, seeding trust signals from `mockUser` until a `profiles`/`users` fetch covers them (the snapshot's `users` row now carries `bio`/`area`/`city`/`languages`/`verified`).
- **No payments** — every QAR figure (`fee_*`, `pricePerPlayer`) is informational; players pay the host directly.
- **No i18n/RTL content pass** beyond `i18n/en.ts` + utilities; Arabic strings/QA pending.
- **`/lab` route + `screens/Lab.tsx`** are a dev-only component lab; remove before launch.
- `HostedMatch` omits `locDist`/distance; `PlayerDots` initials and several card avatars are placeholder data.
- **Multi-sport list is localStorage-only (not in Supabase yet).** Edit Profile's Sports & level section (`SportsLevelSection`) lets a player add several sports + self-rate each; the full list persists via `writeProfileSports` → localStorage `connect.profileSports` (`lib/profile.ts`), and the editor + own ProfileScreen rehydrate from `readProfileSports`. Only the **primary** (first) sport + level is written onto the `users` row (`updateProfile`) and is therefore what propagates to other players / cards / Realtime. Promote the list to a `player_sports` table when multi-sport needs to be public (TODO in `lib/profile.ts`). `EditProfileScreen.save()` is **no longer a no-op** — it persists name/bio/area/city + primary sport/skill via `actions.updateProfile`, saves the full list, flags `completeProfile()`, then save-then-routes to **`/profile`** (§4).

---

_Last updated: 2026-06-13 — **sport emoji + profile edit/carry-forward + live store + sign-out.** (1) **Sport glyph = emoji** (`lib/sports.tsx` `SPORT_EMOJI`/`sportEmoji`): 🏓 padel · 🎾 tennis · 🏸 badminton · 🏃 running, shown in front of the label on the create/edit sport pills, the profile Sports & level rows, and `SportsLevelSection` — replaced the old lucide marks; add new sports to the one map (§3). (2) **Home "Next up" countdown** (`format.countdownUntil`): days when ≥24h out (`"3d"`), hours under a day (`"5h"`), `"soon"` in the final hour. (3) **Edit Profile**: save-then-routes to **`/profile`** (View Profile, not Settings) + 2s "Profile updated" toast; **carry-forward** seeds the sports list from `readProfileSports()` so every saved sport+level rehydrates (never blank/default); name split into First/Last fields; **city + area are now `<select>`s** sourced from `lib/locations.ts` (`QATAR_CITIES`/`areasFor`), and `updateProfile` persists `city` too. (4) **ProfileScreen**: Settings gear removed (own header is **Edit-only** — standing rule, §6); **first** name highlighted in italic accent (was surname); court `SportArt` thumbnail removed from the Sports & level card; that card is now **multi-row** — canonical primary sport+level from the store `users` row (so it can't drift from `/players/:id`, cards, roster, chat — §5) plus, on the **own** profile only, the extra sports from `readProfileSports` (others see only the primary). (5) **Store/live**: `updateProfile` writes `name/bio/area/city/sport/skill_level` to the `users` row + optimistic mutate; new **`clearClientState()`** used by **SettingsScreen**'s real sign-out (`useAuth().signOut()` → on success `clearClientState()` + `restoreDemoAccount()` → `/login`, `signingOut` guard, no half-sign-out). The dual-mode store's **live Supabase path is wired** (`connectLive`/Realtime `connect-db` channel/`rpc`/`afterWrite`) and `.env.local` is present, so the running app is live (§7). (6) **Types/seed**: `User` gains `city`/`verified`; `repo.mapUser` reads `languages/bio/area/city/verified`; mock users seeded `city:'Doha'`/`verified:true` + a new invite-only tennis thread. (7) **Invite flow**: Chat invitation card now has **inline Accept/Decline**, and `acceptInvite`'s `'joined'|'expired'` return drives race-safe routing into `/chat/match/:id` (Chat, Match Details, Home). Earlier: profile layout + full field-sync: the **ProfileScreen** hero now stacks identity as **name → location → bio** directly under the name (location = muted line with a non-flipped `MapPin`, §7; empty location hides; empty bio shows a subtle "Add a bio" deep-link on the **own** profile only, hidden on `/players/:id`); the separate lower Location card was removed. `actions.updateProfile` persists `name/bio/area/sport/skill_level` — the live `users` table gained **`bio` / `area`** columns (plus a `languages text[]` column, read-only for now — display only, no editor; migration `add_profile_bio_area_languages`; RLS already public-SELECT + self-UPDATE so other players read them and Realtime propagates), and `repo.mapUser` reads them back. Single source of truth unchanged: every surface (View Profile, `/players/:id`, Settings header, `MatchCard`/Match Details roster/chat identity) reads the one `users` row from the store, so sport/skill/name/avatar-initials/location/bio reflect everywhere with no manual refresh. Earlier: invite-only join path wired end-to-end: `createMatch` now auto-creates the per-match group chat thread with the **host as sole member** (§5 — no chat before joining), and `actions.acceptInvite` adds the accepting player to that thread + posts a "[Name] joined" system line + returns `'joined' | 'expired'` so callers route into `/chat/match/:id` on success or toast "Match just filled" on a race loss (Home invite sheet, Chat invitation card, Match Details all use this). Pending invites still hold no slot (`myInvites` filters to joinable matches at read time → auto-expire); "Decide later" leaves the invite `invited` and it surfaces as an **inline Accept/Decline card in Chat** (no Home bell, §4), with the Home pop-up gated once-per-invite via `connect:invitesSeen`. Note: strings are hardcoded EN with RTL-safe markup (logical props, `.ltr-nums`, `rtl:rotate-180`) — the app has no active i18n runtime, so no new i18n keys were added (consistent with the codebase). Earlier: Supabase Auth wired (`lib/supabase.ts` shared client + `context/AuthContext.tsx` `getSession`/`onAuthStateChange`, `useAuth()` exposing `signIn`/`signInWithMock`/`signOut`; dormant until `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are set, dev-`mockUser` fallback otherwise — §7); onboarding identity on every screen (`connect.onboarding` name/sport/skill overlaid via `withSignedIn`/`freshDB` so sign-up name + avatar initials win over the dev `mockUser` and survive reload), fresh-account clean slate (`startFreshAccount` clears `connect:hostedMatch`), the shared+filtered first-timer Home feed, the localStorage hosted-match flow, shared `mode` create/edit form, the shared `WhenCard` + `lib/datetime` date/time UI (typeable 24h times, no AM/PM, native calendar date picker), numbers-only + scroll conventions._

# Connect! — Lovable Foundation Handoff

*Doha Sports App · Stage 1 (Player Matching) · web-first PWA on Lovable + Supabase + GitHub*
*Prepared 2026-06-02. Build order: **foundation → components → pages → flows**. Do not generate screens until the design system and component inventory exist.*

---

## 0. How to use this doc

Feed this to Lovable in order. Stand up tokens and shared components first (Sections 1–2), then build pages flow by flow using the maps in Section 3. Small visual tweaks happen inside Lovable; heavy logic and refactors go to Claude Code via the GitHub repo.

**Gate before building:** finish the Arabic RTL pass and the 3–5 real-user design review, then lock designs.

---

## 1. Design tokens (build first)

Define these as global tokens before anything else so every component inherits them.

- **Color:** primary, primary-pressed, background, surface/card, border, text-primary, text-secondary, success, warning/error, plus a "hosting" accent used on host cards.
- **Typography:** one type scale (display / H1 / H2 / body / caption / button). Font: **IBM Plex Sans Arabic** (covers Latin + Arabic). Use **Western numerals, tabular figures** so times and counts align.
- **Radius:** card, button, input, pill/badge.
- **Spacing:** single spacing scale (e.g. 4/8/12/16/24/32) used for all padding and gaps.
- **Bilingual / RTL:** layout must mirror cleanly. Flip only directional icons (back arrows, chevrons). Keep numbers and times LTR. Right-align text and inputs in Arabic. Handle mixed bidi (English venue names inside Arabic strings).

---

## 2. Shared component inventory

Build these as reusable components **before** any page. Start with the match card — it is the source of the earlier "looks different on every page" problem.

1. **Canonical match card** (THE priority) — one component, every list reuses it: sport, venue + court #, date/time, host, players joined/needed, state badge. **Two variants via a `variant` prop (never a separate card):** `full` (tall image-header card) and `brief` (condensed horizontal row — 96px art panel with weekday/date + start time on the left, compact content on the right). Brief is used on Home "My Matches"/"Saved" and the archive lists. **Past-archive brief cards** are read-only: art top-left shows **weekday + date + month** ("Thu 23 May"), the **lifecycle status** (Just played / Closed / Cancelled) sits as a chip in the **bottom-right corner**, no result chip / no caption, cancelled rows dim the art.
2. **Buttons** — primary, secondary, destructive; default / pressed / disabled / loading.
3. **Inputs & form fields** — text, select/picker, date (DOB), with right-aligned Arabic variant.
4. **Toasts** — match created, match cancelled, changes saved.
5. **Tab bar** — 3 tabs: Discover · Home · Chat.
6. **Cards** — profile card, venue/location row, chat list row.
7. **Badges / pills** — match state, no-show reputation mark, unread count.
8. **Avatar + username** (tappable → other-player profile).

### 2.1 Icons

**Don't source the common ones — Lovable ships with `lucide-react` built in.** Standard UI glyphs are already available; just reference them by name. Keep the mapping consistent (same icon = same action everywhere), pairing with the canonical-component rule.

Already covered by lucide (use as-is): back arrow, chevrons, search, filter/sliders, bell (notifications), chat bubble, plus (create), settings/gear, location pin, calendar/clock, user/avatar, share/send, more (⋯), check, x/close, block, flag/report.

**Bring your own (Lovable won't have these):**
- **Brand assets** — app logo / wordmark, and the splash + PWA install icon.
- **Sport icons** — padel, tennis, badminton. lucide has only a generic racket. For Stage 1 a single generic racket or a text label per sport is fine; distinct per-sport icons are a polish item, not a blocker.

**Directional icons — must flip in Arabic (RTL):** back arrow, chevrons (next/prev, disclosure), send/share arrow. **Do NOT flip:** logos, location pin, search, bell, settings, and anything numeric (times/counts stay LTR).

---

## 3. Per-flow screen maps (logic, not pixels)

For each flow: screens, navigation, and key states (empty / loading / error / disabled).

### Onboarding (new user)
Splash → Signup (collect **DOB; 18+ only**) → **3 onboarding questions** → **review the Community Guidelines** → All set → Home.
States: validation error on signup, disabled "next" until answered.

### Navigation shell
3-tab bar: **Discover · Home · Chat**.
- **Discover** lists all matches for the same day and lets you follow into next-day matches, etc.
- **My Matches** lives inside Home.
- **Profile** is a sub-screen (not a tab), opened from the name/avatar icon.
- **Chat** holds match chat rooms, 1:1 DMs, and notifications.

### Discover (find & join)
Discover feed → **Search panel** → **Filter panel** → Match details → **Join / Request**.
- Feed is **always seeded** — new users never see a blank cold-start (no empty state).
- Two match types: **open** (self-select / auto-accept, default) and **approval-required** (request → host approve/decline).
- **Slot hold while pending = NO.** A request does not reserve a slot — the host collects all incoming requests and chooses who to play with.
- Deferred / not built yet (do not build now): "match full" / request-to-join / closed / paid branch.

### Home
Four sections: **NEXT UP** · **You're hosting** (See all → My Matches: hosting + past; tap a card → Edit Match; **Record results** action on a card) · **This week** (other matches joined) · **Host CTA**.
Sub-screens: My Matches (all), My Match Details, Edit Match, Save changes, Cancel Match confirmation.
Route rule: saving Match Edit → returns to Home + toast.
**Results display:** Match Details is the **canonical record** of the result; a results summary also posts **inline in the match chat room** (consistent with notifications living in chat, and the rule that nothing important is discoverable *only* by opening a thread).

### Create a match
Create Match form → **Choose Location** (curated 27 Doha venues + custom fallback; **Court #** is a separate field) → save → match-created toast.
States: changes-saved / cancelled toasts.

### Chat
Unified inbox (canonical threads) → group thread (per match) + 1:1 DMs + notifications.
- **Open DMs** (anyone → anyone) with guardrails: in-thread block/report, first-contact banner, new-conversation rate limit.
- 4 entrances into chat; an open match shows **Join**, not chat.
- Match notifications appear inline in the chat room.

### Post-match
2 steps: (1) who played / no-show, (2) optional win–loss.
**Close rule:** once **2 players report** results the match closes automatically; otherwise it **auto-closes after 24 hours**. (Player rating deferred to Stage 2.)

### No-show (reputation only)
A no-show is a profile mark — **no block**. Incurred by cancelling within **2h** or not showing. Any player can report; confirming attendance doesn't protect. Feeds Stage 1.7. *(Threshold + 2h cutoff logic = Claude Code, not Lovable.)*

### Profile & safety + Settings
Tap username → Other-Player Profile → ⋯ menu → Block. Hybrid inline toggles (save in place). Profiles public by default.
Drill-downs: **Report a Problem, Report a Player/Match, Blocked List, Guidelines**, plus **Legal** (links, not a screen). Push = master toggle only. View/Edit Profile saves → returns to Settings.

---

## 4. Content & data to have ready

- **27-venue list** (padel / tennis / badminton) wired into the location picker.
- **Onboarding 3 questions** finalized, plus the **Community Guidelines** review screen copy.
- **Seed content** for the Discover feed (cold-start always-populated).
- **EN→AR glossary** for vocabulary consistency — *still to draft.*

---

## 5. Accounts to stand up (this is Stage 1.3)

- Create the **Supabase** project.
- Create the **GitHub** repo.
- Connect **Lovable** to both (Lovable → GitHub sync; Claude Code pulls from the repo for heavy logic, pushes back).

---

## 6. Dependencies

- 1.4 Database can't start until the Supabase project (1.3) exists.
- 1.5 Auth waits on 1.4 tables. (Forgot/Reset Password screens are designed; Supabase config — redirect-URL allowlist, email template, prod SMTP — is 1.3/1.5 dashboard work.)

---

*Tip: if sketches live in Figma rather than as PNGs, feed Figma context to Lovable directly — far more precise than dropping images.*

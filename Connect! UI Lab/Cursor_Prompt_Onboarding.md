# Cursor Prompt — Connect! Onboarding Flow

Aligned to `Lovable_Prompts_Playbook.md` **Prompt 4**. Doha-only (no country/city). **EN-first, RTL-ready.** Assumes design **tokens + shared components already exist**. Per the playbook, this pass is **screens + states + navigation only — no Supabase/backend wiring yet.**

---

## ▶️ PROMPT (copy from here)

You are building the **onboarding + auth flow** for Connect!, a mobile-first PWA (React + TypeScript + Vite, Tailwind + shadcn/ui, lucide-react). Read `CLAUDE.md` first and follow it exactly. **Assemble from the existing shared components and consume design tokens — never hardcode a color/size and never create a new card/button/input variant.** If a primitive you need is missing, stop and tell me instead of inventing one. **Do not wire Supabase auth or any backend yet — build the screens, every state, and the navigation only.**

### Flow
`Splash → Sign Up → Q1 Age check → Q2 Sport → Q3 Skill level → Community Guidelines → "You're all set" → Home`
Returning users via **Log In route straight to Home — never through the questionnaire.**

### Screens
1. **Splash / Welcome** — logo/wordmark, tagline "Your match, your people, your community", primary **Get Started** (→ Sign Up), secondary **Log In** (→ Login), and the language toggle (see below).
2. **Sign Up** — collects **name, email, password, phone**. "Next" disabled until valid (invalid-email / weak-password / email-in-use error states). Include **Google + Apple sign-in** buttons (UI only).
3. **Login** — email + password, plus **Google + Apple** buttons (UI only). Link to **Forgot Password**.

> **Language toggle — place an inline `EN / عربي` switch in the top-right of Splash, Sign Up, and Login.** It sets `dir` + locale globally and persists the choice. Because it's positioned with logical CSS (top-`end`), it correctly mirrors to the top-left when the app is in Arabic/RTL. The toggle itself is not a directional icon — don't flip the control, only the layout side follows reading direction.
4. **Forgot Password** + **Reset Password** — request-link screen and new-password screen, with their states (UI only).
5. **3 onboarding questions — one per screen**, with a back-able progress indicator (Step X of 3). "Next" stays **disabled until the current question is answered**; every step is reversible:
   - **Q1 — Age check (Date of Birth):** **DOB via a date picker, NOT a checkbox. 18+ only** — if computed age < 18, hard-block progression with a clear, kind message and do not continue.
   - **Q2 — Sport:** Padel / Tennis / Badminton / Running.
   - **Q3 — Skill level:** Beginner → Pro.
6. **Community Guidelines review** — summarize the key standards, link to the full text, explicit **"I agree / Continue"**. Reaching "All set" requires agreeing; no agree, no finish.
7. **"You're all set"** — success moment, then route into **first-timer Home (Discover feed)**. Optional single notifications opt-in here (**master toggle only** — no per-type push in Stage 1); opt-in, never blocking.

### States (required on every screen)
default / empty / loading / error / disabled. Sign Up, Login, Forgot/Reset need validation + error states (invalid email, weak password, wrong credentials). The **under-18 block lives on Q1 (Age check)**. Buttons show pressed/disabled/loading per tokens.

### EN-first, RTL-ready (build the structure now even though copy is English)
- All user-facing strings go through **i18n keys** — no hardcoded literals in JSX.
- Use **logical CSS** (`ms-*/me-*`, `ps-*/pe-*`, `start/end`, `text-start`) so layout mirrors under `dir="rtl"`; wire a working dir-toggle to the language switch.
- **Flip only directional icons** (back arrow, chevrons, send). **Do NOT flip** logo, location pin, search, bell, settings, or numerals.
- **Numbers, times, and DOB stay LTR + Western (1,2,3)** even in Arabic; use `tabular-nums`.
- Leave the Arabic font-fallback hook (IBM Plex Sans Arabic) in place per CLAUDE.md.

### Typography & visual (from tokens only)
Instrument Serif for display/headlines, Inter for all UI strings. Fully-pilled buttons and chips. Radii/spacing/colors strictly from tokens. Accessible: labelled inputs, 44px+ tap targets, visible focus, sufficient contrast.

### Mobile / device fit (build web now, but keep it portable to native iOS + Android later)
This ships as a PWA but will be wrapped as a real iOS + Android app later, so every onboarding screen must already behave like a native mobile screen:
- **Mobile-first, single-column, full-height (`100dvh`/`100svh`)** layouts sized for a phone viewport (~360–430px wide). No desktop-width assumptions.
- **Respect safe areas** — pad with `env(safe-area-inset-*)` so content clears the iOS notch / Dynamic Island and the Android status bar, and the bottom CTA clears the iOS home indicator / Android gesture bar. Pin the primary button above the bottom inset, not flush to the edge.
- **Keyboard-safe forms** — when the on-screen keyboard opens (Sign Up / Login / DOB), inputs and the active CTA must stay visible (scrollable container, avoid fixed footers that the keyboard covers).
- **Touch, not hover** — no hover-only affordances; 44px+ (iOS) / 48dp (Android) tap targets; clear pressed states.
- **Native-friendly inputs** — correct input types/`inputmode`/`autocomplete` (email, tel, new-password) so the right keyboard shows; use a real date picker for DOB.
- Avoid browser-chrome-dependent layout; assume standalone/fullscreen display.

### Constraints (do not violate)
- Onboarding hands off to **Home** (the default landing tab; tabs later are Discover · Home · Chat).
- **No deferred features:** no coach/role selection, **no country or city pickers**, no geolocation, no payments, no star-ratings. Doha-only is implicit — don't ask for location.
- No cron/triggers.

### Deliverables
Routed screen components assembled from existing shared components, all states, and the i18n string keys you added. Then list any tokens/components you expected but couldn't find, and **stop for review** before any backend wiring.

## ◀️ END PROMPT

---

## Before you paste
- Have in Cursor's context: `CLAUDE.md`, `Lovable_Prompts_Playbook.md`, your tokens file, the shared component library (Button, Input, Segmented, DatePicker, Toast), and the i18n strings file.
- Reference visuals in this folder you can attach: `splash screen + sign up screen.png`, `question 1-3 .png`, `you are all set screen.png`, `log in screen.png`, `Onboarding Flow .pdf`, `connect_splash_screen.svg`, `connect_login_screen.svg`.

## Notes
- **The 3 questions are Age check (DOB) → Sport → Skill level.** DOB moved out of the Sign Up form and is now the first question (it doubles as the 18+ gate). Sign Up holds account fields only.
- **Roles dropped** for now (coach is a deferred Stage-2 feature; no play-position role needed yet).
- **Country/city removed** — Doha-only, so location is never asked.
- **Language** isn't a question; it's the inline EN/عربي toggle in the **top-right of Splash, Sign Up, and Login** (and later in Settings).

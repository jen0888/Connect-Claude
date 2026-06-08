# Connect!

Mobile-first PWA that helps people in **Doha** find pickup sports matches (padel, tennis, badminton, running). **Stage 1 = free player matching only**, target ~500 active players. 18+ only, free + cash-on-arrival (no in-app payments), bilingual EN/AR with RTL from day one.

> **Single source of truth for product scope, stack, design tokens, architecture, and business rules is [`CLAUDE.md`](./CLAUDE.md).** Read it before making changes. This README is the short orientation; CLAUDE.md is the spec.

## Stack

- **Frontend:** React + TypeScript (Vite), Tailwind + shadcn/ui, lucide-react icons.
- **Backend:** Supabase (Postgres, Auth, RLS, Realtime).
- **Hosting:** Vercel · **Repo:** GitHub · **Build env:** Cursor + Claude Code.

## Core UX principles

These cut across every screen — break them and the app feels inconsistent.

- **One canonical match card.** A single component reused on Discover, Home, and My Matches. Don't fork per-page variants.
- **Three tabs only:** Discover · Home · Chat. Home is the default landing tab; My Matches lives inside Home; Profile + Settings is a sub-screen, not a tab.
- **Tokens over hardcoded values.** Consume the design tokens (CLAUDE.md §3) — never hardcode a hex or size.
- **Save-then-route.** After an action you land on a specific destination with a transient toast (Match Edit → Home, Edit Profile → Settings, inline toggles save in place). See CLAUDE.md §4.
- **Carry-forward state — data persists across a flow; never re-ask.** Anything the user types or selects on one screen travels to every later screen where it's relevant. Never re-prompt for a value already given, and never blank a field on navigation.
  - Sign-up questionnaire answers (sport, skill, DOB, country/city, language) pre-fill the new profile.
  - Create-a-Match fields persist into the review/confirm step and onto the created match card.
  - The Choose Location sub-screen returns the picked venue + court # to the create form, keeping everything else entered.
  - Match Edit and Edit Profile open **pre-filled with current values**; going back then forward keeps prior entries intact.
  - Implement with **shared form/route state** (context, route params, or a draft object) — not per-screen local state that resets on unmount.
  - This is the companion to Save-then-route: *save-then-route* decides where you land after an action; *carry-forward* decides what data you bring with you.

## Reference docs

See CLAUDE.md §9 for the full list (logic spec, no-show spec, RTL QA, AR glossary, design tokens / component inventory PDFs, legal docs). These describe **what** to build; the build happens in Cursor + Claude Code.

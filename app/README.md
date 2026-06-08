# Connect! — app

Mobile-first PWA for pickup sports matching in Doha (padel · tennis · badminton · running). Stage 1: free player matching only. See `../Connect! UI Lab/CLAUDE.md` for the product spec, design tokens and business rules.

## Stack

- **Vite + React + TypeScript**, Tailwind CSS v4, lucide-react, React Router
- Design implemented from the Claude Design handoff bundle (Editorial Calm system: Instrument Serif + Inter, cream `#F4F0E8`, terracotta `#C76A48`)
- **Mock data layer** — `src/lib/store.ts` is an in-memory, Supabase-shaped repository (types in `src/lib/types.ts` mirror the schema in CLAUDE.md §6). Swap its internals for `supabase-js` without touching screens.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Map

- `src/index.css` — design tokens (single source of truth) + type scale
- `src/components/` — shared primitives: canonical `MatchCard`, `BottomNav`, lifecycle badges, controls, toasts, blobs
- `src/lib/` — types, read-time status computation (`status.ts`), mock store, formatters (`format.ts`), and form date/time helpers (`datetime.ts`)
- `src/screens/` — auth/onboarding, home, discover, matches (details/create/all), chat, post-match, profile/settings, safety. Both match create/edit forms share `screens/matches/WhenCard.tsx` for date + time
- `/lab` route — dev-only component playground

## Key invariants (CLAUDE.md)

- One canonical match card — never per-page variants
- All times are 24-hour `HH:MM` — no AM/PM anywhere; date + time editing lives in the shared `WhenCard` (typeable times + native calendar)
- Match status computed at read time from `start_time`/`end_time` — no cron
- Cancel ≥2h before start, else it counts as a no-show (reputation only, no blocking)
- 3 tabs only (Discover · Home · Chat); Home is default; My Matches lives in Home
- Profiles public by default; trust signals are never a gate; no star ratings in Stage 1
- RTL-ready: logical CSS properties throughout, `ltr-nums` for numerals, i18n scaffold in `src/i18n/` (AR strings pending)

# Claude Code prompt — Edit Profile sync + working Sign Out

> Paste into Claude Code from the repo root. Read `CLAUDE.md` first; obey §4 (save-then-route, carry-forward), §5/§8 conventions, design tokens (§3), EN/AR + RTL (§7). Use the existing Supabase `users` table (§6). lucide-react icons by name.

## Goal
Two fixes:
1. **Edit Profile → Save** must persist and immediately reflect the updated info on **View Profile (`/profile`)** and on the **Settings (`/settings`)** screen — no stale values, no manual refresh.
2. **Sign Out** button must actually sign the user out and return them to the unauthenticated entry point.

---

## Part 1 — Edit Profile saves and reflects everywhere

### Behavior
- `/profile/edit` opens **pre-filled** with the current profile values (carry-forward — never blank a field, §4).
- On **Save**: write changes to the `users` row in Supabase, then **save-then-route → `/settings` + transient toast** ("Profile updated", ~2s).
- The updated values must render immediately on:
  - **View Profile (`/profile`)** — name, avatar, sport, skill level, language, and any trust/stat fields that are editable.
  - **Settings (`/settings`)** — anything settings mirrors from the profile (e.g. display name/avatar in the header, language selection).
  - **Other-Player Profile (`/players/:id`)** — the public profile other users see. Profiles are public by default (§5), so an edit must also update how **everyone else** views that user: a viewer opening `/players/:id` fetches the current `users` row (no stale cache), and if they're already on the screen when the edit lands, Realtime updates it in place. Show **public fields only** (name, avatar, sport, skill, languages, matches played, attendance %, no-show count) — never private/settings fields.
  - Anywhere else the profile renders (e.g. the host name/avatar on the canonical match card, chat identity, match roster).

### Implementation
- **Single source of truth:** hold the current user's profile in a shared store (auth/profile context or a query cache like React Query), not per-screen local state. View Profile and Settings **read from that store** so an update re-renders both.
- On Save: update Supabase → update the store (optimistic update or refetch). Do not rely on a full page reload.
- Keep `/profile/edit` and `/settings` language selectors consistent: changing language in either path writes the same `users.language` field and both reflect it.
- Validate before save (e.g. required name, DOB still 18+ if editable); show inline errors, keep the draft on failure.

### Acceptance criteria
1. Edit a field (e.g. name or skill level) → Save → land on `/settings` with the new value reflected, plus toast.
2. Navigate to `/profile` (View Profile) immediately after — the fields show the new value, not the old one.
3. Re-open `/profile/edit` — it is pre-filled with the just-saved values.
4. No manual refresh needed anywhere; closing and reopening the app shows the persisted values (confirms it wrote to Supabase, not just memory).
5. **A different user** opening that person's `/players/:id` profile sees the updated public fields (name, avatar, sport, skill, languages, stats) — and the host name/avatar on their match cards and chat reflect the change too.

---

## Part 2 — Working Sign Out

### Behavior
- The Sign Out button (in `/settings`) signs the user out and routes to the unauthenticated entry (`/splash`, or `/login`).
- **No confirmation dialog** — sign-out confirm was deliberately cut from Stage 1 scope. Single tap signs out.

### Implementation
- Call Supabase `auth.signOut()`.
- **Clear all client state on sign out:** the profile/auth store, any Create-a-Match draft or carry-forward state, and local storage — so no stale data survives into the next session (mirrors the dev-reset intent, §8).
- After sign-out, the auth guard takes over: any protected route redirects to `/login`; `/` redirects to `/splash`. Route the user to `/splash` explicitly on success.
- Handle the error path: if `signOut()` fails, show a toast and stay put (don't half-clear state).

### Acceptance criteria
1. Tapping Sign Out ends the session and lands on `/splash` (or `/login`).
2. After sign-out, hitting a protected route (e.g. `/home`) redirects to `/login` — the old session is gone.
3. Signing back in starts clean: no leftover draft, no previous user's cached profile.

---

## Routing (resolved)
- **Edit Profile → save → `/settings` + toast.** CLAUDE.md §4 (prose and route map) now agree on this. The updated values still reflect on View Profile (`/profile`), the Other-Player Profile (`/players/:id`), and everywhere the profile renders — destination and propagation are separate concerns.

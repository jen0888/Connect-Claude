# Claude Code prompt — Invite-only match flow

> Paste into Claude Code from the repo root. Read `CLAUDE.md` first; this feature must obey §4 (navigation, save-then-route, carry-forward), §5 (join paths, no slot-hold, no-chat-before-joining), §6 (data model), and §7 (EN/AR + RTL). Consume design tokens (§3) — no hardcoded hex/size. Reuse the canonical match card. Icons: lucide-react by name.

## Goal
Implement the **invite-only** join path end to end: a host creates a match with `join_mode = 'invite'`, picks specific players, and sends personal invitations. Invited players act on the invite from a Home pop-up (Accept / Decide later / Decline). The invite is a private offer, **not** a public Discover listing.

## Scope
**In:** invite send from Create-a-Match, host Home state, auto-created chat thread, invited-player Home pop-up, accept / decide-later / decline handling, Chat notification for deferred invites, state transitions, RLS.
**Out (do not build):** approval mode changes, waitlist changes, payments, push notifications (in-app only for now). Don't touch open/approval logic except where shared.

## Data model (use existing tables — see §6)
- `matches.join_mode = 'invite'` for these matches.
- `match_requests` rows with `kind = 'invite'`, `status` cycling `invited → accepted → joined` | `invited → declined` | `invited → expired`. Respect `unique(match_id, player_id, kind)`.
- On **accept**: insert into `match_players`, set the invite row to `joined`, decrement `spots_available`.
- Chat thread: one canonical per-match group thread, auto-created when the match is created (host is the only member until others accept). Never fork a second thread.
- `notifications`: bilingual rows (`title_en/ar`, `body_en/ar`) — used only for the "decide later" case landing in Chat.

## Core rules to respect (non-negotiable — from §5)
1. **No slot hold while pending.** A pending invite reserves nothing. First to fill the slot wins; if the match fills (or is cancelled, or `start_time` passes) while an invite is still `invited`, that invite auto-transitions to `expired` — computed at read time, **no cron/triggers**.
2. **No chat before joining.** An invited player has **no access** to the match chat thread until they Accept. Decide-later and Declined players never see the thread.
3. **RLS:** only the host and the specific invited player can see/act on an invite row.
4. Western numerals + tabular figures; flip only directional icons in RTL.

## Flow

### A. Host — Create-a-Match → invite
1. In `/matches/new`, when the host selects **Invite only**, reveal a player-picker step (search players by name; carry-forward keeps all other draft fields intact, §4).
2. On confirm (`/matches/new/review` → submit): create the match (`join_mode='invite'`), **auto-create the group chat thread** (host as sole member), and insert one `match_requests` row per invited player (`kind='invite'`, `status='invited'`).
3. Route: **save → `/home` + toast** ("Match created · invites sent").
4. Host Home: the match appears immediately in the **"You're hosting"** section (per-card Edit + Record results), regardless of how many invites are still pending.

### B. Invited player — Home pop-up
- On **Home load**, if the player has any `status='invited'` rows for matches that are still joinable, show an **invitation modal/bottom sheet** over `/home` (transient overlay, not a route/tab). If multiple, stack/queue them.
- The sheet shows the canonical match card (sport, venue + court #, date/time, host + avatar, spots) plus three actions:

  **Accept** → insert `match_players`, set invite `joined`, decrement `spots_available`, **add the player to the match chat thread** and **navigate them into that thread** (`/chat/:threadId`). The match now shows in **the player's Home** under **NEXT UP** (if imminent) or **This week** (other joined) — *not* "You're hosting". Post system message "[Name] joined the match".

  **State propagation on Accept (live, both sides — use Supabase Realtime, no manual refresh):**
  - **Player name + avatar fill the roster** on the canonical match card and on Match Details (`/matches/:id`).
  - **Joined count / spots update everywhere the card renders** (e.g. "3/4 joined", `spots_available` decremented) — host Home, player Home, My Matches, Match Details.
  - **Chat thread roster** gains the player; the "[Name] joined" system message posts to the thread.
  - **Host's Match Details** shows the invitee as **Accepted/joined** in the player list (the invite row flips out of pending). If the host is viewing the screen when the player accepts, it updates in place.
  - **Player's own card + details** now render them as a participant alongside the host and any other accepted players (full roster, correct spots).

  **Decide later** → dismiss the sheet, set/keep `status='invited'`, and surface the invite as an **actionable notification inside Chat** (`/chat`, inline per §4 — notifications live in Chat, no Home bell). The player can Accept/Decline from there later. The sheet should **not** re-pop on every Home load once deferred — only reappear if a new invite arrives.

  **Decline** → set `status='declined'`. The match does **not** appear in the player's Home and **no** Chat notification is created. No chat access. Host is not hard-blocked from re-inviting later, but a declined row stays declined.

### C. Edge transitions
- If the match fills, is cancelled, or `start_time` passes while still `invited`: transition to `expired` at read time. A pop-up/notification for an expired invite shows a disabled state ("This match is full / no longer available") instead of an Accept button.
- Accepting must be race-safe: if the last slot was taken between render and tap, fail gracefully → expire the invite and toast "Match just filled."

## UI / a11y
- Invitation sheet uses `--surface-card`, radius `xl` (28) for the sheet, pill buttons; primary **Accept** = `--color-brand`, **Decline** = subtle/destructive-adjacent, **Decide later** = tertiary. Build EN + AR strings (i18n keys), RTL-correct, directional icons flipped.
- Reuse the canonical match card inside the sheet — do not build a variant.

## Acceptance criteria (write/keep tests where practical)
1. Creating an invite match lands host on Home, match in "You're hosting", chat thread exists with host only, one `invited` row per invitee.
2. Invitee sees the pop-up on Home load; Accept adds them to `match_players` + chat, routes into `/chat/:threadId`, and the match shows under NEXT UP/This week.
2a. On Accept, both sides update live (Realtime): roster shows the player's name+avatar on card + Match Details, joined count/spots decrement everywhere, chat roster + "[Name] joined" message appear, and the host's Match Details marks the invitee Accepted — all without a manual refresh.
3. Decide later removes the pop-up and creates exactly one inline Chat notification that can still Accept/Decline; pop-up doesn't nag on subsequent loads.
4. Decline leaves no Home entry and no Chat notification; no chat access.
5. A pending invite holds no slot; filling the match expires outstanding invites and blocks late accepts gracefully.
6. RLS verified: a third player cannot read or act on someone else's invite.
7. EN + AR/RTL render correctly for the sheet, card, and notification.

## Decisions I made (confirm or change)
- Accepted-invite matches go to **NEXT UP / This week** on the player's Home (joined-match sections), since "You're hosting" is host-only.
- "Decide later" stops the pop-up from re-appearing and lives on as an actionable Chat notification.
- Pending invites never reserve a slot (consistent with §5); they expire when the match fills.
- Invited players get chat access **only** after Accept.

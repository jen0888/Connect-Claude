# Cursor + Claude Code Prompt — Join-request notifications (spec + build)

Do two things in one pass: (A) update the spec in `CLAUDE.md`, then (B) implement it. The spec edit comes first so the build follows the corrected rule.

Context: `approval`-mode matches let a player tap "Request to join"; the host approves/declines. We are defining exactly where the host sees pending requests, and fixing what happens when several arrive at once.

---

## A. Update CLAUDE.md (do this first)

Edit `CLAUDE.md` so the spec matches the rule below. Keep the house style (terse, rule-first). Touch **§4** and **§5**.

**The rule to encode — request notifications appear in exactly three surfaces, never inside a chat thread:**
1. **Match Details — request bars** = the single action surface (Approve / Decline).
2. **Match card "N requests" pill** (Home → "You're hosting") = passive count, taps to Match Details.
3. **Chat inbox notification row + Chat tab unread badge** = passive awareness, taps to Match Details. No Accept/Decline in the inbox.

- In **§4**, refine the line "Notifications live in Chat (inline in threads)": clarify that *join-request* notifications live in the Chat **inbox as actionable rows that deep-link to Match Details**, NOT inline in a thread — because a requester (`requested`, not `joined`) is not a thread member ("no chat before joining"). Other in-thread notices (e.g. system "[Name] joined" messages) are unchanged.
- In **§5** (Matching → `approval`), add: pending requests surface on Match Details (action) + a count pill on the hosting card + a Chat inbox row/badge; they must **not** render inside any match group thread or `/chat/:threadId`. Reaffirm the **no-slot-hold** rule and add the multi-request expiry behavior (see §B.3).
- Do not change the invite-flow Home pop-up (that's the invited *player's* surface and stays).

---

## B. Implement

Follow the canonical-card, tokens-only, read-time-computation conventions. No new card variants.

### B.1 "Requests" count pill — hosting card (Home → "You're hosting")
- On the canonical match card, for an `approval` match with ≥1 pending (`requested`) request, show a pill: **"2 requests"** ("1 request" singular). Hide at 0.
- Taps to **Match Details (`/matches/:id`)**. Passive — no buttons. Don't fork a card variant.
- Count = `match_requests` rows where `kind = 'request'` and `status = 'requested'` for that match.

### B.2 Chat inbox row + tab badge
- In the `/chat` inbox list, render a notification row per pending request (or grouped per match) that deep-links to Match Details. Pointer only — no inline Approve/Decline.
- Unread count badge on the **Chat tab** (reuse existing notifications/unread mechanism); clear per existing read rules.
- Inbox level only — **never inside an opened thread**.

### B.3 Read-time expiry for simultaneous requests
- Pending requests hold **no slot**. When the host approves one and the match goes `full` (`spots_available` = 0), all other still-`requested` rows resolve to **`expired`**, computed at **read time** — no cron, no triggers.
- All three surfaces update live (Supabase Realtime): pill recounts/clears, inbox row flips to a disabled **"Match full / no longer available"** state, Match Details bar shows expired and is non-actionable.
- A race-losing late Approve fails gracefully: **"Match just filled."**
- State machine: `requested → approved → joined` | `requested → declined` | `requested → expired`. No slot hold.

### Tokens (CLAUDE.md §3 — consume, never hardcode)
- Pill: `--radius-pill` (999); `caption` 11/500 or `label` 12.5/600; `tabular-nums` for the count.
- Pending = `--color-warning` (#8A6B3A) or `--color-accent` bg + `--color-text-onbrand`; expired/disabled = `--color-neutral` (#8C8478). Not `--color-danger`.
- Spacing: inner gaps 8–14 (tokens 2–3); card padding 20–24 unchanged.

---

## Verify before done
- `CLAUDE.md` §4 and §5 read consistently with the 3-surface rule; invite-flow pop-up untouched.
- As host on an `approval` match, fire **2 requests for 1 spot**: card shows "2 requests", Chat tab badge appears, an inbox row per request shows, Match Details shows both bars. **No pop-up; nothing inside any chat thread.**
- Approve one → spot fills → pill clears, the other flips to "Match full / no longer available" on inbox + Match Details **live, no refresh**; late Approve says "Match just filled."
- Open the match group thread → confirm **no request UI inside it**.
- Single canonical match card across Discover/Home/My Matches; no variant.
- RTL: numerals LTR + `tabular-nums`; pill/badge mirror cleanly (§7).

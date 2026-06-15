# Cursor + Claude Code Prompt — Join-request signals for the host (clean, 3 surfaces)

Implement how a **host** is notified of incoming **`approval`-mode join requests**, and handle multiple simultaneous requests correctly. Follow CLAUDE.md §4 and §5.

## The model: one action surface + two passive pointers
A join request appears in **exactly three places**, and nowhere else:

1. **Match Details — the request bars** = the ONE place to act (Approve / Decline). Canonical action surface.
2. **Match card "N requests" pill** (Home → "You're hosting") = passive count, taps through to Match Details. No buttons.
3. **Chat inbox notification row** (the `/chat` tab list) = passive awareness row, e.g. "Alice requested to join Wed afternoon tennis double", taps through to Match Details. No Accept/Decline buttons here. Plus an unread count badge on the Chat tab.

### Do NOT show requests inside a chat thread
Requests must **never** render inside a match group thread or any `/chat/:threadId` conversation. Reason: a requester has status `requested`, not `joined`, so per CLAUDE.md "no chat before joining" they are not a member of the thread — and mixing requests into threads makes it unclear who is requesting which match. Keep requests out of thread bodies entirely. The Chat *inbox* (surface 3) is allowed; the chat *thread* is not.

### Do NOT add a pop-up
No modal/sheet over Home for incoming requests. The Home pop-up in CLAUDE.md is for the *invited player* in the `invite` flow only. Requests are host-side and can arrive many at once — passive signals only (§4: no Home header bell).

> Note for the spec: CLAUDE.md §4 says "notifications live in Chat (inline in threads)." This refines it — request notifications live in the Chat **inbox** as their own actionable rows pointing to Match Details, NOT inline in threads, because the requester isn't a thread member yet. Worth reflecting in §4/§5 so spec and build don't drift.

## Scope of changes

### 1. "Requests" count pill on the hosting match card (Home → "You're hosting")
- On the canonical match card, for an `approval` match with ≥1 pending (`requested`) request, show a count pill: **"2 requests"** ("1 request" singular). Hide at 0.
- Taps through to **Match Details (`/matches/:id`)** — a shortcut, not a new screen.
- Passive indicator on the existing canonical card — do **not** fork a card variant.
- Count = `match_requests` rows where `kind = 'request'` and `status = 'requested'` for that match. Scales to any N.

### 2. Chat inbox notification row + tab badge
- In the `/chat` inbox list, render an actionable-looking **notification row** per pending request (or grouped per match), pointing to Match Details. It is a pointer — no inline Approve/Decline; tapping deep-links to the request bars.
- Show an unread count badge on the **Chat tab** for unread request notifications (reuse the existing notifications/unread mechanism). Clear per existing read rules.
- These rows live at the inbox level only — never inside an opened thread.

### 3. Read-time expiry of losing requests (the "2+ at once" case)
- Pending requests hold **no slot** (§5 no-slot-hold). When the host approves one and the match becomes `full` (`spots_available` = 0), every other still-`requested` row resolves to **`expired`**, computed at **read time** — no cron, no triggers.
- All three surfaces update without manual refresh (Supabase Realtime, §5): the card pill recounts/clears, the inbox row flips to a disabled **"Match full / no longer available"** state, and the Match Details bar shows expired and is no longer actionable.
- A race-losing late Approve fails gracefully with **"Match just filled."**
- State machine stays: `requested → approved → joined` | `requested → declined` | `requested → expired`. No slot hold.

## Tokens (CLAUDE.md §3 — consume, never hardcode)
- Count pill: `--radius-pill` (999); `caption` 11/500 or `label` 12.5/600; `tabular-nums` for the number.
- Pending color = `--color-warning` (#8A6B3A) or `--color-accent` bg with `--color-text-onbrand`; expired/disabled = `--color-neutral` (#8C8478). Don't use `--color-danger` (that's cancelled/destructive).
- Spacing: inner gaps 8–14 (tokens 2–3); card padding 20–24 unchanged.

## Verify before done
- As host with an `approval` match, fire **2 requests for 1 open spot**: Home card shows "2 requests"; Chat tab shows unread badge; Chat inbox shows a row per request; Match Details shows both bars. **No pop-up, and nothing appears inside any chat thread.**
- Approve one → spot fills → card pill clears, the other request flips to "Match full / no longer available" in the inbox and on Match Details **live, no refresh**.
- A late Approve on the filled match fails with "Match just filled."
- Open the match group thread: confirm **no request UI appears inside it**.
- Hosting card is still the single canonical match card (no variant); Discover/Home/My Matches all use it.
- RTL: pill numerals stay LTR + `tabular-nums`; badge/pill mirror cleanly (§7).

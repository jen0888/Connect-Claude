# Connect! — App Logic Spec (Stage 1)

*Behavioral logic and business rules for the Doha Sports App, Stage 1 (free player matching). Compiled from project decisions through 2026-06-01. This is a logic/rules reference, not a screen spec — it describes how the app should behave, not how it looks.*

---

## 0. Scope & guiding constraints

- **Product:** Connect! — mobile-first social sports platform connecting players in Doha. Stage 1 = free player matching, target 500 active players. Later stages: coach booking (10% commission), court booking, then Dubai → Saudi expansion.
- **Geography:** Doha-only. City-level filtering is implicit (the City field at onboarding covers it). No geolocation, distance filtering, or "nearby" logic in Stage 1.
- **Money:** Free + cash-on-arrival. No in-app payment logic. Any "QAR 25" style figure on a match is informational (host's stated cost), not a transaction.
- **Age:** 18+ only. Collect date of birth (not a checkbox) at sign-up and hard-gate under-18. Minors are a separate Stage 2 safety track, never a toggle.
- **Simplicity bias:** Solo builder under a ~Month 4 launch deadline. Default to the simplest rule that solves the current problem; defer scale features explicitly.

---

## 1. Matching model

**Core model = pull-based, no gatekeeping.** A player browses Discover, opens **Match Details**, taps Join, and is in. The host does **not** review, approve, or reject joiners on open matches.

```
Discover feed → tap card → Match Details (host, venue, level, slots, cost) → Join → joined
```

Rules:
- The player profile exists for **peer transparency**, not host gatekeeping — a joiner sizes up the host before joining; players check each other after joining; profiles support post-match accountability.
- Trust signals (matches played, attendance %, no-show count, languages) are a **public accountability layer**, never a gate.
- No availability calendars on player profiles, no recommended-players lists for hosts, no invite-by-search. Those belong to coach profiles in Stage 2.

### 1a. Invitation / approval flow (second match type — additive)

A **private / approval-required** match type sits **alongside** open matches. Open matches stay auto-accept and pull-based; this does not replace the default.

- **Match has a join mode:** `open` (instant join, default) or `approval` (host approves each request).
- On an `approval` match the join CTA becomes **Request to join**; tapping creates a pending request rather than a membership.
- **Host gets a pending-requests view** with approve / decline per request, plus notifications to both sides on request, approval, and decline.
- **Slot-hold rule (decide before build):** while a request is pending, the spot either (a) stays open to others until the host approves, or (b) is soft-held for the requester. Recommended default for simplicity: **stays open** — first approved fills the slot; remaining pending requests auto-expire when the match fills.
- **Request/match states:** `requested → approved → joined`, or `requested → declined`, or `requested → expired` (match filled / match cancelled / time passed).
- Open and approval matches share every other rule below (no-show, chat, block, post-match).

---

## 2. Navigation & routing logic

- **Three tabs only:** Discover · Home · Chat. Never a 4th main tab.
- **Discover** → feed of open matches → Match Details → Join. No direct card-to-join.
- **Home** = default landing tab. Contains the player's own match life (see §3). **My Matches lives inside Home**, not as a tab.
- **Chat** = group threads + 1:1 DMs + Notifications (notifications live here, not in a Home header bell).
- **Profile + Settings** = one combined entry, opened from a header button (avatar/gear) on Home. It opens a Settings landing screen that branches to View/Edit Profile and Detail Settings.
- **Auth routing:** returning login → straight to Home, no questionnaire. The 5-step questionnaire (Role → Sport → Level → Country → City) runs on Sign Up only.

---

## 3. Home tab logic

Four stacked sections, fixed order:

1. **NEXT UP** — the imminent *joined* match. Tap → joined-match detail view.
2. **You're hosting** — matches you created. Two affordances: **See all my matches** → upcoming + past **hosting-only** archive (excludes joined matches); **Edit** (per card) → Edit Match form.
3. **This week** — other joined matches (not NEXT UP). Tap → joined-match detail view.
4. **Host a match CTA / +** — standalone section. Tap → Create Match → Match Created → new card appears under "You're hosting."

Rule: the "upcoming and past" archive is hosting-only and reachable **only** via "See all my matches." Don't conflate "matches I run" with "matches I play in."

---

## 4. Match lifecycle logic

**Create:** host sets sport, level, time/duration, venue (§5), Court # (optional), cost note, slots, and join mode (§1a). On create → Match Created → appears under "You're hosting."

**Join:** open match = instant membership; approval match = pending request (§1a). On join, the player is added to the match group chat (§7).

**Edit:** host edits via the Edit button under "You're hosting." **Save → Home + "Changes Saved" toast.** Saved/Cancelled are transient toasts (~2s auto-dismiss), not destination screens.

**Cancel:** host cancels the match. If cancelled **within 2 hours** of start, the host incurs a no-show mark (§6).

**Join edge-states to handle:** Match Full (+ similar matches), Cancelled-by-host while viewing, Already joined, Blocked (can't join), race-condition "just filled up," optional too-late-to-join cutoff.

---

## 5. Venue / location logic

- **Curated list + custom fallback.** 20–30 curated Doha venues keep Discover clean; custom entry prevents blocking hosts whose court isn't listed.
- **Choose Location** is a sub-screen (from Create/Edit Match), never inline: search bar, Recent venues (if host has hosted before), curated list (name · area · sport chips), and "Can't find it? Add custom location" (venue name + address text, no map pin).
- **Court # / details** is a **separate optional free-text field** on Create Match, not part of venue selection.
- **Data model (lands in 1.4):** a `venues` table (reused for Stage 3 court booking). On `matches`, keep both `venue_id` (FK, nullable) and `venue_name` (string). Curated picks set `venue_id`; custom entries leave it null and store the string. Both coexist with no Stage 3 rework.
- Deferred: interactive maps/pin-drop, geolocation/"venues near me," per-venue court inventory.

---

## 6. No-show & cancellation logic (reputation-only)

**Model = reputation-only. No automatic blocking anywhere.**

- A no-show is a **visible mark on the player's profile**. No block, no other penalty. The public attendance record speaks for itself.
- **Two ways to incur a no-show, same outcome either way:** (1) cancelling within **2 hours** of start, or (2) not turning up. Applies to hosts and players alike.
- **Confirming attendance does not protect you** — a player who confirmed but didn't show can still be reported.
- **Reporting is not host-only** — host *and* other participants can report.

**Reporting guardrail — scaled threshold (the human "didn't show" case only):**
- A within-2h **cancellation lands immediately** (objective timestamp, no corroboration needed).
- A **"didn't turn up"** report needs *N* independent participant reports, scaled to match size: 2 players → 1 report · 3–4 → 2 · 5–8 → 3 · 9+ → 4 (cap), clamped to the number who actually showed.

**Data model (1.7):** single `no_show_reports` table with a unique constraint; read-time confirmation via a Postgres view (no triggers); RLS so only participants can report; one report per reporter; no self-report; 24h reporting window.

Do **not** reintroduce the old auto-block rules ("2 late cancels → 1-week block," "1 no-show → 2-week block") — both removed.

---

## 7. Post-match flow logic

Triggered after match time passes; prompt sent to every participant. **Two steps only in Stage 1:**

1. **Who played?** — player list, everyone defaults to "Played"; one tap flags a no-show. Host and other players can flag. Within-2h cancels are auto-recorded before this step runs.
2. **Result (win/lose)** — optional, "just for fun": We won / We lost / Draw or didn't keep score. Feeds the win-rate stat on the profile.

Player star-rating is **deferred to Stage 2** (bundled with coach features). No rating step in Stage 1.

---

## 8. Chat & DM logic

**Two chat types:** per-match group chat (auto thread, all joined players are members) + 1:1 DMs.

**Four entrances, one canonical thread each (deep-link, never fork):**
1. Open/other match page → CTA stays **Join**, not chat (no chat before joining — preserves pull-based model). Group thread opens only after joining.
2. User profile → 1:1 DM.
3. My match page → that match's group thread.
4. Chat tab "create a chat" → recipient picker for a new 1:1.

**DM gating = OPEN** — anyone can DM anyone. Highest spam/harassment risk, mitigated by guardrails rather than restricting who can message:
- One-tap Block & Report in every thread header.
- First-contact banner when the DM is from someone you've never shared a match with (Block/Report inline).
- **Rate-limit new conversations** per account per day (~10–15) — main defense against mass spam.
- Mute / leave thread + clear unread; never force a reply.

**Inbox:** single unified list (group + 1:1), newest first, badge to distinguish type. **Block kills the thread both ways** and removes it from the inbox. Cheap upgrade path if complaints rise: flip first-message-from-stranger into a "message request" gate (same screens + an accept step).

---

## 9. Block & report logic

**Philosophy:** Block must exist as a safety safeguard but stays slightly hidden — not a primary action for the 99% who never use it.

- **Entry:** tap a username/avatar in Match Details or Group Chat → Other-Player Profile → three-dot menu (⋯) → Report player / Block player. No primary Block button on the profile itself.
- **Confirm dialog:** "Block [Name]? You won't see their matches and they won't see yours. You can unblock anytime from Settings → Safety." → Confirm → "Player blocked" toast → return to origin.
- **Unblock:** Settings → Safety → Blocked players → Unblock per row. Settings is the single source of truth for undo.
- **Block effects (Stage 1):** blocked users can't join each other's matches; don't appear in each other's Discover; shared-match chat messages hidden on the receiving side.
- **Edge cases:** private profile → minimal "This player's profile is private," no stats; departed players → profile still loads with public stats (don't 404).

---

## 10. Settings logic + save-then-route rules

**Hybrid architecture** — ~80% inline toggles, drill-downs only for content needing a full screen (lists, forms, long text).

- **ACCOUNT:** Language (inline EN/عربي). *(Privacy drill-down removed for cold start — all profiles public by default.)*
- **SECURITY & ALERTS:** Push notifications (inline master on/off, no per-type granularity), Biometric login (inline).
- **SUPPORT & INFO:** Safety (drill-down: report flow, blocked list, guidelines), Legal (drill-down: Terms, Privacy, Licenses — links, not a built screen), About Connect.
- Sign-out at the bottom. **Removed from Stage 1:** Payment, multi-facet Privacy, per-type notification controls.

**Public-by-default is deliberate:** no-show count and stats are public on every profile surface — this is the trust mechanism that makes stranger-matching safe. Don't gate stats behind a toggle.

**Save-then-route (action-specific, not blanket):**
- **Match Edit → Home + toast** (snap back into the playing loop).
- **Edit Profile → Settings + toast** (returns to where the user came from).
- **Settings inline toggles → save in-place** (commit on tap; no Save button, no navigation).
- Principle: the post-save destination matches the originating surface's role. The toast carries the full confirmation load.

---

## 11. Auth & onboarding logic

- **Sign Up:** email/social + the 5-step questionnaire (Role → Sport → Level → Country → City) → "You're all set."
- **Collect DOB** at sign-up; hard-gate under-18.
- **Login (returning):** straight to Home, no questionnaire.
- **Forgot/Reset password:** designed; Supabase config (redirect-URL allowlist, reset email template, prod SMTP) is 1.3/1.5 dashboard work, not design.

---

## Open decisions to resolve

- **Invitation/approval (§1a):** confirm it's *additive* (a second match type), not a replacement of pull-based; decide the slot-hold rule while a request is pending.
- **No-show (§6):** whether marks age out after a clean streak; profile display treatment; notify-on-confirm timing.
- **Venues (§5):** keep custom venues post-launch vs migrate to curated-only as the list matures.
- **Chat (§8):** hold the "message request" gate in reserve in case DM spam rises.

---

## Deferred to later stages (don't build in Stage 1)

Geolocation / "nearby," map pin-drop, per-venue court inventory, in-app payment, player star-ratings, per-type notification toggles, granular privacy controls, minor/teen support, multi-city.

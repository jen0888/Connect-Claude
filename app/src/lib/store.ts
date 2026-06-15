import { useSyncExternalStore } from 'react'
import type { ChatMessage, ChatThread, Gender, Match, MatchPlayer, MatchRequest, MatchResult, NoShowReport, SkillLevel, Sport, TimelineItem, User } from './types'
import { CHAT_MESSAGES, CHAT_THREADS, CURRENT_USER_ID, MATCHES, MATCH_PLAYERS, MATCH_REQUESTS, MATCH_RESULTS, USERS } from './mock/data'
import { onboarding, resetOnboarding } from './onboarding'
import { computeStatus, noShowReportThreshold, resultsCorroborated } from './status'
import { clearHostedMatch } from './hostedMatch'
import { clearProfileSports } from './profile'
import { clearPersistedState } from './usePersistedState'
import { supabase, isSupabaseConfigured } from './supabase'
import { fetchSnapshot } from './repo'

/** signed-in profile pushed by AuthProvider (dev mockUser now, Supabase
 *  session later). Overlaid onto the seeded current user — the id is kept
 *  because the relational mock graph (joins, threads, messages) points at
 *  CURRENT_USER_ID, and swapping it would orphan all of that. */
let signedInProfile: User | null = null

function withSignedIn(users: User[]): User[] {
  if (!signedInProfile) return users
  // In a freshly created account the sign-up answers ARE the identity and must
  // win over the dev/mock signed-in profile — otherwise the AuthProvider's mock
  // user ("Jen"), re-applied on every mount/reload, would clobber the name,
  // sport and skill the user typed at sign-up. This keeps the name (and the
  // avatar initials derived from it) consistent on every screen.
  const fresh = isFreshAccount()
  return users.map((u) =>
    u.id === CURRENT_USER_ID
      ? {
          ...signedInProfile!,
          id: CURRENT_USER_ID,
          ...(fresh && {
            name: onboarding.name ?? signedInProfile!.name,
            gender: onboarding.gender ?? signedInProfile!.gender,
            sport: onboarding.sport ?? signedInProfile!.sport,
            skill_level: onboarding.skill ?? signedInProfile!.skill_level,
          }),
        }
      : u,
  )
}

/**
 * In-memory reactive store, repository-shaped so screens never touch
 * raw arrays — every accessor mirrors a future Supabase query/RPC.
 * Swap the internals for supabase-js without changing call sites.
 */
interface DB {
  users: User[]
  matches: Match[]
  matchPlayers: MatchPlayer[]
  matchRequests: MatchRequest[]
  matchResults: MatchResult[]
  noShowReports: NoShowReport[]
  chatThreads: ChatThread[]
  chatMessages: ChatMessage[]
  /** per-thread last-read timestamps for the current user */
  threadReadAt: Record<string, string>
  blockedUserIds: string[] // users the current user has blocked
  savedMatchIds: string[]
  /** chat inbox prefs (device-local, persisted to localStorage): threads the
   *  user archived, and the timestamp each was deleted (a newer message
   *  resurfaces a deleted thread, iMessage-style). */
  archivedThreadIds: string[]
  deletedThreadAt: Record<string, string>
  /** count of Chat notifications (Alerts) the user has already seen — drives the
   *  Chat-tab badge: it clears once the inbox is opened and only re-appears when
   *  a genuinely NEW notification arrives. Device-local, persisted like above. */
  notifSeenCount: number
}

/** chat inbox prefs persist to localStorage so archive/delete survive reload
 *  (no Supabase table — device-local, like block/save/read state). */
const CHAT_PREFS_KEY = 'connect.chatPrefs'

function loadChatPrefs(): { archivedThreadIds: string[]; deletedThreadAt: Record<string, string>; notifSeenCount: number } {
  try {
    const raw = localStorage.getItem(CHAT_PREFS_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      return {
        archivedThreadIds: Array.isArray(p.archivedThreadIds) ? p.archivedThreadIds : [],
        deletedThreadAt: p.deletedThreadAt && typeof p.deletedThreadAt === 'object' ? p.deletedThreadAt : {},
        notifSeenCount: typeof p.notifSeenCount === 'number' ? p.notifSeenCount : 0,
      }
    }
  } catch {
    /* storage unavailable / malformed — start clean */
  }
  return { archivedThreadIds: [], deletedThreadAt: {}, notifSeenCount: 0 }
}

function saveChatPrefs(d: DB) {
  try {
    localStorage.setItem(CHAT_PREFS_KEY, JSON.stringify({ archivedThreadIds: d.archivedThreadIds, deletedThreadAt: d.deletedThreadAt, notifSeenCount: d.notifSeenCount }))
  } catch {
    /* storage unavailable — prefs stay in-memory only */
  }
}

const CHAT_PREFS = loadChatPrefs()

/** seeded "returning user" dataset — the demo default */
const SEEDED: DB = {
  users: USERS,
  matches: MATCHES,
  matchPlayers: MATCH_PLAYERS,
  matchRequests: MATCH_REQUESTS,
  matchResults: MATCH_RESULTS,
  noShowReports: [],
  chatThreads: CHAT_THREADS,
  chatMessages: CHAT_MESSAGES,
  threadReadAt: { 't-run': new Date().toISOString(), 't-dm-sara': new Date().toISOString(), 't-hosted': new Date().toISOString() },
  blockedUserIds: [],
  savedMatchIds: [],
  archivedThreadIds: CHAT_PREFS.archivedThreadIds,
  deletedThreadAt: CHAT_PREFS.deletedThreadAt,
  notifSeenCount: CHAT_PREFS.notifSeenCount,
}

/** post-onboarding "fresh account" flag — persists so a reload after the
 *  questionnaire still lands on the first-timer Home. UI-only; becomes
 *  real per-account data when Supabase auth lands. */
const FRESH_KEY = 'connect.freshAccount'

function isFreshAccount(): boolean {
  try {
    return localStorage.getItem(FRESH_KEY) === '1'
  } catch {
    return false
  }
}

/** profile-setup completion flag — set when the user saves a complete profile
 *  (EditProfile). Gates the first-timer "Profile setup" card so it disappears
 *  once done and stays gone on reload (CLAUDE.md §4). UI-only; becomes
 *  per-account data when Supabase auth lands. */
const PROFILE_DONE_KEY = 'connect.profileDone'

export function isProfileComplete(): boolean {
  try {
    return localStorage.getItem(PROFILE_DONE_KEY) === '1'
  } catch {
    return false
  }
}

/** strip the demo user's seeded history → true brand-new account. Profile
 *  picks up the questionnaire answers; the Discover feed (other hosts)
 *  stays seeded, never empty (CLAUDE.md §5). */
function freshDB(): DB {
  const mine = new Set(SEEDED.matchPlayers.filter((mp) => mp.player_id === CURRENT_USER_ID).map((mp) => mp.match_id))
  return {
    ...SEEDED,
    users: withSignedIn(SEEDED.users).map((u) =>
      u.id === CURRENT_USER_ID
        ? { ...u, name: onboarding.name ?? u.name, gender: onboarding.gender ?? u.gender, sport: onboarding.sport ?? u.sport, skill_level: onboarding.skill ?? u.skill_level }
        : u,
    ),
    matches: SEEDED.matches
      .filter((m) => m.host_id !== CURRENT_USER_ID)
      .map((m) => (mine.has(m.id) ? { ...m, spots_available: Math.min(m.total_spots, m.spots_available + 1) } : m)),
    matchPlayers: SEEDED.matchPlayers.filter((mp) => mp.player_id !== CURRENT_USER_ID),
    matchRequests: SEEDED.matchRequests.filter((r) => r.player_id !== CURRENT_USER_ID),
    matchResults: SEEDED.matchResults.filter((r) => r.player_id !== CURRENT_USER_ID),
    chatThreads: [],
    chatMessages: [],
    threadReadAt: {},
  }
}

/** empty graph for live mode — hydrated from Supabase once a session lands */
const EMPTY_DB: DB = {
  users: [], matches: [], matchPlayers: [], matchRequests: [], matchResults: [],
  noShowReports: [], chatThreads: [], chatMessages: [], threadReadAt: {},
  blockedUserIds: [], savedMatchIds: [],
  archivedThreadIds: CHAT_PREFS.archivedThreadIds, deletedThreadAt: CHAT_PREFS.deletedThreadAt,
  notifSeenCount: CHAT_PREFS.notifSeenCount,
}

// Live mode (Supabase configured): start empty, hydrate on connectLive(). Mock
// mode: the seeded demo dataset (or a fresh account) as before.
let db: DB = isSupabaseConfigured ? EMPTY_DB : isFreshAccount() ? freshDB() : SEEDED

const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

function mutate(fn: (next: DB) => DB) {
  db = fn(db)
  emit()
}

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => db,
  )
}

/** Live-mode hydration gate. In mock/unconfigured builds the seeded store is
 *  ready synchronously, so this is `true` from the start. In live mode it stays
 *  `false` from the moment a session connects until the first snapshot lands —
 *  letting route guards hold rendering so screens never read an empty `db`
 *  (e.g. `getUser(db, currentUserId)` returning undefined right after sign-in). */
let liveHydrated = !isSupabaseConfigured

export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => liveHydrated,
  )
}

let idCounter = 0
const newId = (prefix: string) => `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 7)}`

/* ── demo simulation: the seeded dummy accounts respond, so invite flows run
 *  end-to-end with no backend. Pure setTimeout over the existing mutations —
 *  invited players auto-accept (and the match thread announces the join).
 *  (Chat auto-reply was removed so a message you send never produces an
 *  incoming "new message" — only real replies from others count.) Delete this
 *  block when a real backend drives counterparty behaviour (CLAUDE.md §7). */
const INVITE_ACCEPT_DELAY = 1600

/** An invited dummy player accepts a beat later: acceptInvite fills a spot,
 *  adds them to the match thread, and announces the join inline. */
function simulateInviteAccept(reqId: string) {
  const req = db.matchRequests.find((r) => r.id === reqId)
  if (!req || req.status !== 'invited') return
  actions.acceptInvite(reqId)
}

/* ── selectors (future Supabase selects / views) ───────────────────── */

/** The acting user. Mock mode: the seeded 'u-you'. Live mode: the Supabase
 *  session UUID (set by connectLive). Exported as a live binding so screens
 *  that import it always read the current value. */
export let currentUserId = CURRENT_USER_ID

/* ── Supabase live mode ─────────────────────────────────────────────────
 *  When a project is configured AND a session is active, `db` is hydrated from
 *  Supabase and every mutating action goes through the flow RPCs / RLS-guarded
 *  writes; Realtime re-hydrates `db` so changes from other windows appear live.
 *  `liveReady` gates the per-action branch — false until connectLive() runs, so
 *  the mock store keeps working before sign-in and in unconfigured builds. */
let liveReady = false
let realtimeBound = false

async function rehydrate() {
  if (!supabase) return
  try {
    const snap = await fetchSnapshot(supabase)
    // snap carries savedMatchIds (saved_matches table, RLS-scoped); block/read
    // state (blockedUserIds/threadReadAt) has no table yet, so it's preserved by
    // the spread since `snap` doesn't include those keys.
    db = { ...db, ...snap }
    liveHydrated = true // first snapshot is in — release the route guard
    emit()
  } catch (e) {
    console.error('[store] hydrate failed', e)
    // Release the route guard even on failure so the app never hangs on a blank
    // screen (AuthGate holds protected routes until `liveHydrated`). Screens are
    // crash-safe against an empty `db` (e.g. Home falls back to FirstTimerHome),
    // so the user sees the empty state + can retry / re-auth instead of nothing.
    liveHydrated = true
    emit()
  }
}

let rehydrateTimer: ReturnType<typeof setTimeout> | null = null
function scheduleRehydrate() {
  if (rehydrateTimer) return
  rehydrateTimer = setTimeout(() => {
    rehydrateTimer = null
    void rehydrate()
  }, 150)
}

/** AuthProvider → data layer: a Supabase session is ready. Switch to live mode,
 *  hydrate, and subscribe to Realtime (once). */
export async function connectLive(userId: string) {
  if (!supabase) return
  currentUserId = userId
  liveReady = true
  liveHydrated = false // gate screens until the first snapshot lands
  db = { ...EMPTY_DB }
  await rehydrate()
  if (!realtimeBound) {
    realtimeBound = true
    supabase
      .channel('connect-db')
      .on('postgres_changes', { event: '*', schema: 'public' }, scheduleRehydrate)
      .subscribe()
  }
}

/** AuthProvider → data layer: signed out. Configured → empty graph (a
 *  logged-out live app shows nothing, RLS would deny anyway); unconfigured →
 *  the seeded demo dataset. */
export function disconnectLive() {
  liveReady = false
  liveHydrated = !isSupabaseConfigured // configured: re-gate until next sign-in
  currentUserId = CURRENT_USER_ID
  db = isSupabaseConfigured ? EMPTY_DB : SEEDED
  emit()
}

/** Sign-out cleanup: wipe every client-side draft / carry-forward / flag so the
 *  next session starts clean — no leftover Create-a-Match draft, no previous
 *  user's onboarding answers or cached profile, no stale invite state (mirrors
 *  the dev-reset intent, §8). The in-memory `db` is reset separately by the
 *  AuthProvider effect: disconnectLive() in live mode, restoreDemoAccount() in
 *  mock mode. `connect.locale` is intentionally kept — it's a device UI
 *  preference, not per-account data. */
export function clearClientState() {
  clearHostedMatch()      // connect:hostedMatch  — hosted-match / Create-a-Match draft
  clearProfileSports()    // connect.profileSports — multi-sport list
  resetOnboarding()       // connect.onboarding    — sign-up questionnaire carry-forward
  clearPersistedState('') // connect:state:*       — every per-user persisted draft
  try {
    localStorage.removeItem(FRESH_KEY)        // connect.freshAccount
    localStorage.removeItem(PROFILE_DONE_KEY) // connect.profileDone
    localStorage.removeItem('connect:invitesSeen')
    localStorage.removeItem(CHAT_PREFS_KEY)   // connect.chatPrefs — archive/delete
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** curated mock venues use slug ids ('padelin-aspire'); the DB venue_id is a
 *  uuid FK. Pass null for anything that isn't a real uuid — venue_name carries
 *  the display either way. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const asUuidOrNull = (v: unknown): string | null => (typeof v === 'string' && UUID_RE.test(v) ? v : null)

/** Transient RPC-error channel → a toast. The store isn't React, so it can't
 *  call showToast directly; a tiny listener mounted under ToastProvider
 *  (RpcErrorListener) subscribes and surfaces the message. We emit a stable
 *  CODE (not a sentence) so the React side owns i18n. Right now the only code is
 *  'gender_restricted' — the server gate the UI tries to never let you reach
 *  (deep-link/race safety net, CLAUDE.md §5). */
const rpcErrorListeners = new Set<(code: string) => void>()
export function subscribeRpcError(cb: (code: string) => void): () => void {
  rpcErrorListeners.add(cb)
  return () => rpcErrorListeners.delete(cb)
}
function emitRpcError(code: string) {
  for (const l of rpcErrorListeners) l(code)
}

/** call a flow RPC, then refresh `db` (Realtime will also fire, but this makes
 *  the acting window feel instant). Errors are logged; callers stay fire-and-forget. */
async function rpc(fn: string, params: Record<string, unknown>): Promise<unknown> {
  if (!supabase) return
  const { data, error } = await supabase.rpc(fn, params)
  if (error) {
    console.error(`[rpc] ${fn} failed:`, error.message)
    // surface the gender gate as a transient toast (the UI normally blocks this,
    // so this only fires on a deep-link / race / direct-API attempt)
    if (/gender_restricted/i.test(error.message)) emitRpcError('gender_restricted')
    return
  }
  await rehydrate()
  return data
}

/** run a direct (RLS-guarded) table write, then refresh `db`. For the few
 *  mutations with no dedicated RPC (leave waitlist, cancel request, cancel
 *  match, results, no-show, chat insert). */
function afterWrite(p: PromiseLike<{ error: unknown }>) {
  void Promise.resolve(p).then((res) => {
    const err = (res as { error?: { message?: string } } | null)?.error
    if (err) console.error('[write] failed:', err.message)
    return rehydrate()
  })
}

/** Auto-close a FINISHED match once 2+ players record a corroborating result
 *  (CLAUDE.md §5). `closed` is stored (optimistic in both modes); win rate +
 *  no-show count then derive from the closed match via confirmedWinRate /
 *  confirmedNoShowCount. Idempotent — a no-op once closed/cancelled or while the
 *  match is still in progress. The live DB trigger is the durable path; the
 *  afterWrite here just confirms the optimistic close for the recording client. */
function finalizeMatchIfConfirmed(matchId: string) {
  const m = db.matches.find((x) => x.id === matchId)
  if (!m || m.status === 'closed' || m.status === 'cancelled') return
  if (Date.now() < new Date(m.end_time).getTime()) return // hasn't finished yet
  const results = db.matchResults.filter((r) => r.match_id === matchId)
  if (!resultsCorroborated(results)) return
  mutate((d) => ({
    ...d,
    matches: d.matches.map((x) => (x.id === matchId ? { ...x, status: 'closed' as const } : x)),
  }))
  if (liveReady && supabase) {
    afterWrite(supabase.from('matches').update({ status: 'closed' }).eq('id', matchId))
  }
}

export function getUser(d: DB, id: string): User | undefined {
  return d.users.find((u) => u.id === id)
}

/** Win rate over CONFIRMED (closed) matches only — an unconfirmed solo entry
 *  doesn't move the number until 2+ players corroborate and the match closes.
 *  Draws are excluded from the denominator. null when nothing's decided yet. */
export function confirmedWinRate(d: DB, userId: string): number | null {
  const closed = new Set(d.matches.filter((m) => computeStatus(m) === 'closed').map((m) => m.id))
  const decided = d.matchResults.filter((r) => r.player_id === userId && closed.has(r.match_id) && r.result !== 'draw')
  if (!decided.length) return null
  return Math.round((decided.filter((r) => r.result === 'win').length / decided.length) * 100)
}

/** No-shows corroborated against the player on CONFIRMED (closed) matches, added
 *  to any seeded baseline. A no-show only counts once enough co-players report it
 *  (noShowReportThreshold) — the same corroboration gate that confirms the match. */
export function confirmedNoShowCount(d: DB, userId: string): number {
  const base = getUser(d, userId)?.no_show_count ?? 0
  let extra = 0
  for (const m of d.matches) {
    if (computeStatus(m) !== 'closed') continue
    const reports = d.noShowReports.filter((r) => r.match_id === m.id && r.reported_player === userId)
    if (!reports.length) continue
    const roster = d.matchPlayers.filter((mp) => mp.match_id === m.id)
    const showedUp = roster.filter((mp) => mp.attended !== false).length
    if (reports.length >= noShowReportThreshold(roster.length, showedUp)) extra += 1
  }
  return base + extra
}

export function matchPlayers(d: DB, matchId: string): User[] {
  return d.matchPlayers
    .filter((mp) => mp.match_id === matchId)
    .map((mp) => getUser(d, mp.player_id))
    .filter((u): u is User => !!u)
}

export function isJoined(d: DB, matchId: string, userId = currentUserId): boolean {
  return d.matchPlayers.some((mp) => mp.match_id === matchId && mp.player_id === userId)
}

/** The "Ladies only" gate, read-time. True when a user is barred from a match
 *  because it's `gender_restriction='ladies'` and they aren't female. The server
 *  is the real gate (RLS + RPCs raise 'gender_restricted'); this mirrors it so
 *  the UI never offers a join/request/waitlist/invite CTA it knows will be
 *  rejected, and so mock mode behaves the same (CLAUDE.md §6). */
export function genderBlocks(d: DB, matchId: string, userId = currentUserId): boolean {
  const m = d.matches.find((x) => x.id === matchId)
  if (!m || m.gender_restriction !== 'ladies') return false
  return getUser(d, userId)?.gender !== 'female'
}

export function pendingRequest(d: DB, matchId: string, userId = currentUserId): MatchRequest | undefined {
  return d.matchRequests.find(
    (r) => r.match_id === matchId && r.player_id === userId && (r.status === 'requested' || r.status === 'invited'),
  )
}

/** The user has a pending approval REQUEST (kind 'request', status 'requested')
 *  on this match — distinct from an invite. Drives the per-user Discover exclude
 *  and the Home "This week" Requested state, until the host approves (→ joined)
 *  or declines (→ back to Discover, freshly actionable) (CLAUDE.md §5). */
export function hasPendingRequest(d: DB, matchId: string, userId = currentUserId): boolean {
  return d.matchRequests.some(
    (r) => r.match_id === matchId && r.player_id === userId && r.kind === 'request' && r.status === 'requested',
  )
}

/** active waitlist entry for a player on a match (kind 'waitlist', §5) */
export function waitlistEntry(d: DB, matchId: string, userId = currentUserId): MatchRequest | undefined {
  return d.matchRequests.find(
    (r) => r.match_id === matchId && r.player_id === userId && r.kind === 'waitlist' && r.status === 'waitlisted',
  )
}

/** 1-based FIFO position — derived from created_at ordering, never stored (§5) */
export function waitlistPosition(d: DB, matchId: string, userId = currentUserId): number | null {
  const queue = d.matchRequests
    .filter((r) => r.match_id === matchId && r.kind === 'waitlist' && r.status === 'waitlisted')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const i = queue.findIndex((r) => r.player_id === userId)
  return i === -1 ? null : i + 1
}

/** invites awaiting MY response — kind 'invite', status 'invited', on a match
 *  that's still joinable (open/full, not cancelled). Drives the Home + Chat
 *  invite surfaces; FIFO by created_at so the oldest invite shows first. */
export function myInvites(d: DB, userId = currentUserId): MatchRequest[] {
  return d.matchRequests
    .filter((r) => r.player_id === userId && r.kind === 'invite' && r.status === 'invited')
    .filter((r) => {
      const m = d.matches.find((x) => x.id === r.match_id)
      if (!m || m.status === 'cancelled') return false
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/** join requests awaiting MY approval as host — the "request review" feed in
 *  the Chat Alerts pill. Pending ('requested') requests on my own upcoming
 *  matches, newest first. Includes requests that have just `expired` (a sibling
 *  request won the last spot, §5) so they FLIP to a disabled "no longer
 *  available" state in place rather than vanishing; once the match is past they
 *  drop. Whether a row is still actionable is read-time → `requestIsActionable`. */
export function myHostRequests(d: DB, userId = currentUserId): MatchRequest[] {
  return d.matchRequests
    .filter((r) => r.kind === 'request' && (r.status === 'requested' || r.status === 'expired'))
    .filter((r) => {
      const m = d.matches.find((x) => x.id === r.match_id)
      if (!m || m.host_id !== userId || m.status === 'cancelled') return false
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** Is a join request still actionable (host can Approve)? Read-time, no slot
 *  hold (§5): a 'requested' row is live only while its match is still open with
 *  a free spot. Once full/live/past/cancelled — or already resolved — it's
 *  effectively expired and the Approve/Decline controls go inert. */
export function requestIsActionable(d: DB, r: MatchRequest): boolean {
  if (r.kind !== 'request' || r.status !== 'requested') return false
  const m = d.matches.find((x) => x.id === r.match_id)
  if (!m || m.status === 'cancelled' || m.spots_available <= 0) return false
  return computeStatus(m) === 'open'
}

/** Count of actionable join requests on one match — drives the Home "You're
 *  hosting" card "{n} requests" pill. Pending requests on a full match are
 *  read-time expired (§5) so the pill clears the moment the match fills. */
export function pendingRequestCount(d: DB, matchId: string): number {
  return d.matchRequests.filter((r) => r.match_id === matchId && requestIsActionable(d, r)).length
}

/** Items awaiting the user's attention in Chat — actionable join requests on
 *  matches they host, invites sent to them, and their waitlist standing. Powers
 *  the Chat tab badge + the Alerts pill (CLAUDE.md §4 — notifications live in
 *  Chat, never a Home bell). Non-actionable (full/expired) requests don't count. */
export function notificationCount(d: DB, userId = currentUserId): number {
  const reqs = myHostRequests(d, userId).filter((r) => requestIsActionable(d, r)).length
  return myInvites(d, userId).length + reqs + myWaitlistEntries(d, userId).length
}

/** my active waitlist entries — the "waitlist review" feed in the Chat Alerts
 *  pill. Where I'm queued on a still-live match, FIFO by created_at. */
export function myWaitlistEntries(d: DB, userId = currentUserId): MatchRequest[] {
  return d.matchRequests
    .filter((r) => r.player_id === userId && r.kind === 'waitlist' && r.status === 'waitlisted')
    .filter((r) => {
      const m = d.matches.find((x) => x.id === r.match_id)
      return !!m && m.status !== 'cancelled'
    })
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/** every invite a host has sent on a match (any status), newest first —
 *  host view of who's been invited and where each invite stands. */
export function matchInvites(d: DB, matchId: string): MatchRequest[] {
  return d.matchRequests
    .filter((r) => r.match_id === matchId && r.kind === 'invite')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** players the host can still invite: not the host, not already joined, and
 *  with no active invite/request pending (CLAUDE.md §5 — invite is host→player). */
export function invitablePlayers(d: DB, matchId: string): User[] {
  const m = d.matches.find((x) => x.id === matchId)
  const ladies = m?.gender_restriction === 'ladies'
  return d.users.filter((u) => {
    if (u.id === currentUserId || (m && u.id === m.host_id)) return false
    // a 'ladies' match can only invite female players (server enforces too, §5)
    if (ladies && u.gender !== 'female') return false
    if (isJoined(d, matchId, u.id)) return false
    if (d.blockedUserIds.includes(u.id)) return false
    const active = d.matchRequests.some(
      (r) => r.match_id === matchId && r.player_id === u.id && (r.status === 'invited' || r.status === 'requested'),
    )
    return !active
  })
}

/** matches visible in Discover — seeded feed, never empty (CLAUDE.md §5);
 *  blocked users' matches are hidden both ways. Live matches are excluded:
 *  joining is locked and chat is members-only (no chat before joining). */
export function discoverMatches(d: DB): Match[] {
  return d.matches
    .filter((m) => !d.blockedUserIds.includes(m.host_id))
    .filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

/** The Discover feed exactly as the browsing user sees it — open/full matches
 *  not hosted by me, soonest first. Discover renders the whole list (then
 *  applies its filters); the First-Timer Home renders the first three. Both
 *  surfaces read this one selector so they can never drift (CLAUDE.md §4).
 *
 *  Per-user dedup (CLAUDE.md §5): a match leaves YOUR Discover the moment you're
 *  involved — you host it, you've joined it, or you have a pending approval
 *  request on it (those live on Home instead: You're hosting / NEXT UP·This week /
 *  This week with a "Requested" state). Saved/bookmarked matches are NOT excluded
 *  (save ≠ join — they stay, with the bookmark filled). It stays seeded for
 *  everyone else; this is per-viewer filtering, never an empty state. A declined
 *  request flips `hasPendingRequest` false → the match returns here (read-time).
 *  Future SQL: select * from matches m where read_status in ('open','full')
 *    and m.host_id != :me
 *    and not exists (select 1 from match_players p where p.match_id=m.id and p.player_id=:me)
 *    and not exists (select 1 from match_requests r where r.match_id=m.id and r.player_id=:me
 *                    and r.kind='request' and r.status='requested')
 *    order by m.start_time. */
export function discoverFeed(d: DB): Match[] {
  return discoverMatches(d).filter(
    (m) => m.host_id !== currentUserId && !isJoined(d, m.id) && !hasPendingRequest(d, m.id),
  )
}

/** Chronological order for every match list (Home sections + "See all"):
 *  soonest start_time first, ties broken by created_at — read-time, stable. */
export const byStartThenCreated = (a: Match, b: Match) =>
  a.start_time.localeCompare(b.start_time) || a.created_at.localeCompare(b.created_at)

export function joinedMatches(d: DB, userId = currentUserId): Match[] {
  return d.matches.filter((m) => isJoined(d, m.id, userId)).sort(byStartThenCreated)
}

export function hostedMatches(d: DB, userId = currentUserId): Match[] {
  return d.matches.filter((m) => m.host_id === userId).sort(byStartThenCreated)
}

/** "My Matches" archive — matches you JOINED but did NOT create. The host's own
 *  matches live under "You're hosting" (`hostedMatches`); this is its mirror for
 *  joiners, so a player who only ever joins still has a full upcoming+past
 *  history that never depends on hosting (CLAUDE.md §4). Chronological. */
export function joinedNotHostedMatches(d: DB, userId = currentUserId): Match[] {
  return joinedMatches(d, userId).filter((m) => m.host_id !== userId)
}

/** matches you've joined that are still ahead (open/full), soonest first. The
 *  first is NEXT UP; the rest (minus ones you host) are "This week" (§4). */
export function upcomingJoinedMatches(d: DB, userId = currentUserId): Match[] {
  return joinedMatches(d, userId).filter((m) => {
    const s = computeStatus(m)
    return s === 'open' || s === 'full'
  })
}

/** Matches you have a pending approval request on — still open/full, not joined,
 *  not hosted. They fold into "This week" with a Requested state (no separate
 *  Home section, CLAUDE.md §4) until the host approves (→ a joined match) or
 *  declines (→ back to Discover). FIFO/chronological like the rest. */
export function requestedMatches(d: DB, userId = currentUserId): Match[] {
  return d.matches
    .filter((m) => m.host_id !== userId && !isJoined(d, m.id, userId) && hasPendingRequest(d, m.id, userId))
    .filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    .sort(byStartThenCreated)
}

/** Matches you're queued on (FIFO waitlist) — still open/full, not joined, not
 *  hosted. They fold into "My Matches" with a waitlisted state (no separate Home
 *  section) until a slot frees (→ auto-promoted to a joined match) or you leave
 *  (→ off the list). Chronological like the rest (CLAUDE.md §4/§5). */
export function waitlistedMatches(d: DB, userId = currentUserId): Match[] {
  return myWaitlistEntries(d, userId)
    .map((r) => d.matches.find((m) => m.id === r.match_id))
    .filter((m): m is Match => !!m && m.host_id !== userId && !isJoined(d, m.id, userId))
    .filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    .sort(byStartThenCreated)
}

/** Home "This week" — upcoming joined matches after NEXT UP (excluding ones you
 *  host — those live under "You're hosting") PLUS your pending-request and
 *  waitlisted matches, all sorted by start_time. Pending requests render with a
 *  "Requested" state, waitlist entries with an "On waitlist" state (CLAUDE.md §4/§5). */
export function thisWeekMatches(d: DB, userId = currentUserId): Match[] {
  const hostedIds = new Set(hostedMatches(d, userId).map((m) => m.id))
  const joinedWeek = upcomingJoinedMatches(d, userId).slice(1).filter((m) => !hostedIds.has(m.id))
  return [...joinedWeek, ...requestedMatches(d, userId), ...waitlistedMatches(d, userId)].sort(byStartThenCreated)
}

/** Home "Matches you saved" — bookmarked, NOT joined, and still joinable
 *  (open). A match drops out the moment it's joined / full / cancelled /
 *  started, computed at read time (no cron) — CLAUDE.md §5. */
export function savedMatches(d: DB): Match[] {
  return d.matches
    .filter((m) => d.savedMatchIds.includes(m.id) && !isJoined(d, m.id) && computeStatus(m) === 'open')
    .sort(byStartThenCreated)
}

/* ── chat selectors — one canonical thread per match / per pair,
      deep-link never forks (CLAUDE.md §5) ──────────────────────────── */

export function threadForMatch(d: DB, matchId: string): ChatThread | undefined {
  return d.chatThreads.find((t) => t.match_id === matchId)
}

export function dmThreadWith(d: DB, userId: string): ChatThread | undefined {
  return d.chatThreads.find((t) => t.match_id === null && t.participant_ids.includes(userId) && t.participant_ids.includes(currentUserId))
}

export function threadMessages(d: DB, threadId: string): ChatMessage[] {
  // block effect: shared-match messages from blocked users hidden on your side
  return d.chatMessages
    .filter((m) => m.thread_id === threadId)
    .filter((m) => m.system || !d.blockedUserIds.includes(m.sender_id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export function unreadCount(d: DB, threadId: string): number {
  const readAt = d.threadReadAt[threadId] ?? ''
  return threadMessages(d, threadId).filter((m) => !m.system && m.sender_id !== currentUserId && m.created_at > readAt).length
}

export function isThreadArchived(d: DB, threadId: string): boolean {
  return d.archivedThreadIds.includes(threadId)
}

/** A deleted thread stays hidden until a NEWER message arrives (iMessage-style
 *  resurface), so "delete" clears it from the list without losing the thread
 *  if the conversation continues. */
export function isThreadDeleted(d: DB, t: ChatThread): boolean {
  const at = d.deletedThreadAt[t.id]
  if (!at) return false
  const last = threadMessages(d, t.id).at(-1)
  return !last || last.created_at <= at
}

/** inbox threads — block kills DM threads both ways (removed from inbox).
 *  A CANCELLED match's group thread is auto-removed from the inbox too: once
 *  the host (or system) cancels, `matches.status` flips to 'cancelled' and the
 *  thread drops off the Chat page for everyone on the next render/rehydrate
 *  (live: the status change propagates via Realtime). The thread row itself is
 *  NOT deleted — the read-only `MatchChatScreen` stays reachable by deep-link as
 *  a graceful fallback so history isn't lost. Archived + deleted threads are
 *  also excluded (archived → the Archive pill; deleted → gone until a newer msg). */
export function inboxThreads(d: DB): ChatThread[] {
  return d.chatThreads
    .filter((t) => t.participant_ids.includes(currentUserId))
    .filter((t) => t.match_id !== null || !t.participant_ids.some((p) => d.blockedUserIds.includes(p)))
    .filter((t) => {
      if (t.match_id === null) return true
      const m = d.matches.find((x) => x.id === t.match_id)
      return !m || m.status !== 'cancelled'
    })
    .filter((t) => !isThreadArchived(d, t.id) && !isThreadDeleted(d, t))
    .map((t) => ({ t, last: threadMessages(d, t.id).at(-1) }))
    .sort((a, b) => (b.last?.created_at ?? b.t.created_at).localeCompare(a.last?.created_at ?? a.t.created_at))
    .map(({ t }) => t)
}

/** the Archive pill feed — threads the user archived (any type), newest first.
 *  Block/delete still apply; cancelled-match archived threads stay as history. */
export function archivedThreads(d: DB): ChatThread[] {
  return d.chatThreads
    .filter((t) => t.participant_ids.includes(currentUserId))
    .filter((t) => isThreadArchived(d, t.id) && !isThreadDeleted(d, t))
    .filter((t) => t.match_id !== null || !t.participant_ids.some((p) => d.blockedUserIds.includes(p)))
    .map((t) => ({ t, last: threadMessages(d, t.id).at(-1) }))
    .sort((a, b) => (b.last?.created_at ?? b.t.created_at).localeCompare(a.last?.created_at ?? a.t.created_at))
    .map(({ t }) => t)
}

export function threadById(d: DB, threadId: string): ChatThread | undefined {
  return d.chatThreads.find((t) => t.id === threadId)
}

/** Is this a group chat (non-match thread with 3+ members)? §8 */
export function isGroupThread(t: ChatThread): boolean {
  return t.match_id === null && t.participant_ids.length > 2
}

/** other participants of a thread (everyone but me) */
export function threadOthers(d: DB, t: ChatThread): User[] {
  return t.participant_ids.filter((id) => id !== currentUserId).map((id) => getUser(d, id)).filter((u): u is User => !!u)
}

/** display title for a non-match thread: the other person (DM) or the members (group) */
export function threadTitle(d: DB, t: ChatThread): string {
  const others = threadOthers(d, t)
  if (others.length === 0) return 'You'
  if (others.length === 1) return others[0].name
  const firsts = others.map((u) => u.name.split(' ')[0])
  return firsts.length <= 3 ? firsts.join(', ') : `${firsts.slice(0, 2).join(', ')} +${firsts.length - 2}`
}

/**
 * The unified thread timeline (chat-room §1) — one sorted stream of
 * `TimelineItem`s the renderer dispatches on. Chat messages become text/system
 * items; pending/resolved `match_requests` are DERIVED into invite/decision
 * cards (no extra storage), scoped to the viewer by the same visibility the
 * UI already trusts (host sees their match's requests; both sides of a DM see
 * an invite between them — mirrors the `mr_read` RLS policy).
 */
export function threadTimeline(d: DB, threadId: string): TimelineItem[] {
  const t = d.chatThreads.find((x) => x.id === threadId)
  if (!t) return []

  const items: TimelineItem[] = d.chatMessages
    .filter((m) => m.thread_id === threadId)
    .filter((m) => m.system || !d.blockedUserIds.includes(m.sender_id))
    .map((m) => ({ kind: m.system ? 'system' : 'text', id: m.id, created_at: m.created_at, msg: m }) as TimelineItem)

  if (t.match_id) {
    // Match group thread — the HOST sees inbound join requests as decision
    // cards (§7). Pending → actionable; declined → a host-only follow-up line.
    // (Approvals append the trigger's "X joined" system line, so no card there.)
    const m = d.matches.find((x) => x.id === t.match_id)
    if (m && m.host_id === currentUserId && m.status !== 'cancelled') {
      for (const r of d.matchRequests) {
        if (r.match_id !== m.id || r.kind !== 'request') continue
        // requested → actionable/disabled card; declined/expired → follow-up line
        // (expired = a sibling won the last spot, §5). approved/joined collapse to
        // the trigger's "X joined" system line, so they're skipped here.
        if (r.status !== 'requested' && r.status !== 'declined' && r.status !== 'expired') continue
        const player = getUser(d, r.player_id)
        if (!player) continue
        items.push({ kind: 'decision', id: `dec-${r.id}`, created_at: r.created_at, request: r, match: m, player })
      }
    }
  } else if (t.participant_ids.length === 2) {
    // DM — render an invite-to-play card for any match invite between the pair
    // (§5). Actionable for the invited player; status/follow-up for the host.
    const [a, b] = t.participant_ids
    for (const r of d.matchRequests) {
      if (r.kind !== 'invite') continue
      const m = d.matches.find((x) => x.id === r.match_id)
      if (!m) continue
      const playerInPair = r.player_id === a || r.player_id === b
      const hostInPair = m.host_id === a || m.host_id === b
      if (!playerInPair || !hostInPair || m.host_id === r.player_id) continue
      const host = getUser(d, m.host_id)
      const player = getUser(d, r.player_id)
      if (!host || !player) continue
      items.push({ kind: 'invite', id: `inv-${r.id}`, created_at: r.created_at, request: r, match: m, host, player })
    }
  }

  return items.sort((x, y) => x.created_at.localeCompare(y.created_at) || x.id.localeCompare(y.id))
}

/** matches the current user hosts that `other` could still be invited to —
 *  powers the DM "invite to play" picker (§5). Joinable (open/full) and the
 *  other player isn't already in / pending. */
export function invitableMatchesFor(d: DB, otherId: string): Match[] {
  const other = getUser(d, otherId)
  return hostedMatches(d)
    .filter((m) => m.status !== 'cancelled')
    .filter((m) => {
      const s = computeStatus(m)
      return s === 'open' || s === 'full'
    })
    // a male can't be invited to a 'ladies' match — don't even offer it (§5)
    .filter((m) => !(m.gender_restriction === 'ladies' && other?.gender !== 'female'))
    .filter((m) => invitablePlayers(d, m.id).some((u) => u.id === otherId))
}

/** FIFO auto-promotion (CLAUDE.md §5) — executes as part of the cancel
 *  action, never a cron/trigger, and only before start_time. The earliest
 *  'waitlisted' entry takes the freed slot with NO host approval (even on
 *  approval matches — winning the queue *is* the gate), becomes a full
 *  participant, and is notified (the system line in the match thread is the
 *  Stage-1 mock of that notification). No timed claim window. */
function promoteFromWaitlist(d: DB, matchId: string): DB {
  const m = d.matches.find((x) => x.id === matchId)
  if (!m || m.status === 'cancelled' || m.spots_available <= 0) return d
  if (new Date(m.start_time).getTime() <= Date.now()) return d // live/locked → no promotion
  const next = d.matchRequests
    .filter((r) => r.match_id === matchId && r.kind === 'waitlist' && r.status === 'waitlisted')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
  if (!next) return d
  const promoted = getUser(d, next.player_id)
  const thread = threadForMatch(d, matchId)
  return {
    ...d,
    matches: d.matches.map((x) => (x.id === matchId ? { ...x, spots_available: x.spots_available - 1 } : x)),
    matchPlayers: [
      ...d.matchPlayers,
      { id: newId('mp'), match_id: matchId, player_id: next.player_id, joined_at: new Date().toISOString(), attended: null },
    ],
    matchRequests: d.matchRequests.map((r) => (r.id === next.id ? { ...r, status: 'promoted' as const } : r)),
    chatThreads: thread
      ? d.chatThreads.map((t) =>
          t.id === thread.id && !t.participant_ids.includes(next.player_id)
            ? { ...t, participant_ids: [...t.participant_ids, next.player_id] }
            : t,
        )
      : d.chatThreads,
    chatMessages:
      thread && promoted
        ? [
            ...d.chatMessages,
            {
              id: newId('msg'),
              thread_id: thread.id,
              sender_id: next.player_id,
              body: `${promoted.name.split(' ')[0]} joined from the waitlist`,
              created_at: new Date().toISOString(),
              system: true,
              tone: 'pos' as const,
              icon: 'userPlus' as const,
            },
          ]
        : d.chatMessages,
  }
}

/* ── mutations (future Supabase inserts / RPCs) ─────────────────────── */

export const actions = {
  /** AuthProvider → data layer: overlay the signed-in profile onto the
   *  seeded current user (id preserved, see withSignedIn) */
  setSignedInUser(profile: User) {
    if (isSupabaseConfigured) return // live mode: identity comes from the hydrated users table
    signedInProfile = profile
    mutate((d) => ({ ...d, users: withSignedIn(d.users) }))
  },

  /** onboarding "Create account" (the future Supabase signUp): wipe the demo
   *  user's history so Home renders the first-timer variant until they join */
  startFreshAccount() {
    if (isSupabaseConfigured) return // live mode: real sign-up owns account creation
    try {
      localStorage.setItem(FRESH_KEY, '1')
      // a brand-new account hasn't set up its profile yet — clear any prior flag
      localStorage.removeItem(PROFILE_DONE_KEY)
    } catch {
      /* storage unavailable (private mode) — fresh state stays in-memory */
    }
    // clean slate: drop any hosted match left in localStorage from a prior
    // session, otherwise Home shows "You're hosting" instead of the first-timer
    // feed (seeded Discover matches + Find a match / Host one CTAs).
    clearHostedMatch()
    clearProfileSports()
    mutate(() => freshDB())
  },

  /** EditProfile save: mark profile setup complete so the first-timer
   *  checklist card stops rendering and stays gone on reload (CLAUDE.md §4) */
  completeProfile() {
    try {
      localStorage.setItem(PROFILE_DONE_KEY, '1')
    } catch {
      /* storage unavailable — completion stays in-memory only */
    }
  },

  /** EditProfile save: persist identity/game edits so every screen that reads
   *  the current user (Profile, Home greeting/avatar, "Hosted by", cards…)
   *  reflects them. Keeps the signed-in overlay and the onboarding answers in
   *  sync too, so the change survives an AuthProvider remount / reload for a
   *  fresh account (CLAUDE.md §5). The sports list itself (multi-sport) is
   *  persisted separately via lib/profile; here we store the *primary* sport +
   *  level onto the single-sport schema fields. */
  updateProfile(patch: { name?: string; bio?: string; area?: string; city?: string; sport?: Sport; skill_level?: SkillLevel; gender?: Gender }) {
    if (liveReady) {
      // every editable public field maps 1:1 to a users column (bio/area added
      // by add_profile_bio_area_languages, city by add_profile_city_verified,
      // gender by add_users_gender, §6) so the edit persists and propagates to
      // other players via Realtime.
      const up: Record<string, unknown> = {}
      if (patch.name != null) up.name = patch.name
      if (patch.sport != null) up.sport = patch.sport
      if (patch.skill_level != null) up.skill_level = patch.skill_level
      if (patch.gender != null) up.gender = patch.gender
      if (patch.bio != null) up.bio = patch.bio
      if (patch.area != null) up.area = patch.area
      if (patch.city != null) up.city = patch.city
      // Optimistically reflect the edit across every screen that reads the
      // current user (Profile, Settings, "Hosted by", cards…) so there's no
      // stale value and no manual refresh (§4); the write + rehydrate (and
      // Realtime to other clients) then confirm it.
      mutate((d) => ({ ...d, users: d.users.map((u) => (u.id === currentUserId ? { ...u, ...patch } : u)) }))
      if (supabase && Object.keys(up).length) afterWrite(supabase.from('users').update(up).eq('id', currentUserId))
      return
    }
    if (signedInProfile) signedInProfile = { ...signedInProfile, ...patch }
    if (patch.name != null) onboarding.name = patch.name
    if (patch.gender != null) onboarding.gender = patch.gender
    if (patch.sport != null) onboarding.sport = patch.sport
    if (patch.skill_level != null && patch.skill_level !== 'any') onboarding.skill = patch.skill_level
    mutate((d) => ({
      ...d,
      users: d.users.map((u) => (u.id === currentUserId ? { ...u, ...patch } : u)),
    }))
  },

  /** Sign out (mock): drop the fresh-account flag and restore the seeded
   *  returning-user demo dataset */
  restoreDemoAccount() {
    if (isSupabaseConfigured) return // live mode: sign-out is handled by disconnectLive
    try {
      localStorage.removeItem(FRESH_KEY)
    } catch {
      /* storage unavailable — nothing persisted to clear */
    }
    mutate(() => ({ ...SEEDED, users: withSignedIn(SEEDED.users) }))
  },

  /** open join_mode: instant membership — no gatekeeping */
  joinMatch(matchId: string) {
    if (liveReady) { void rpc('join_match', { p_match: matchId }); return }
    mutate((d) => {
      const m = d.matches.find((x) => x.id === matchId)
      if (!m || m.spots_available <= 0 || isJoined(d, matchId)) return d
      if (genderBlocks(d, matchId)) return d // ladies-only gate (mock parity, §6)
      return {
        ...d,
        matches: d.matches.map((x) => (x.id === matchId ? { ...x, spots_available: x.spots_available - 1 } : x)),
        matchPlayers: [
          ...d.matchPlayers,
          { id: newId('mp'), match_id: matchId, player_id: currentUserId, joined_at: new Date().toISOString(), attended: null },
        ],
      }
    })
  },

  leaveMatch(matchId: string) {
    if (liveReady) { void rpc('cancel_participation', { p_match: matchId }); return }
    mutate((d) => {
      if (!isJoined(d, matchId)) return d
      const me = getUser(d, currentUserId)
      const thread = threadForMatch(d, matchId)
      const freed: DB = {
        ...d,
        matches: d.matches.map((x) => (x.id === matchId ? { ...x, spots_available: x.spots_available + 1 } : x)),
        matchPlayers: d.matchPlayers.filter((mp) => !(mp.match_id === matchId && mp.player_id === currentUserId)),
        // drop the leaver from the match group thread and announce it inline, so
        // everyone still in the chat sees who left (mirrors the "X joined" line).
        chatThreads: thread
          ? d.chatThreads.map((t) =>
              t.id === thread.id ? { ...t, participant_ids: t.participant_ids.filter((p) => p !== currentUserId) } : t,
            )
          : d.chatThreads,
        chatMessages:
          thread && me
            ? [
                ...d.chatMessages,
                {
                  id: newId('msg'),
                  thread_id: thread.id,
                  sender_id: currentUserId,
                  body: `${me.name.split(' ')[0]} left the match`,
                  created_at: new Date().toISOString(),
                  system: true,
                  tone: 'warm' as const,
                  icon: 'userMinus' as const,
                },
              ]
            : d.chatMessages,
      }
      // the freed slot auto-promotes the earliest waitlister — promotion
      // lives in the cancel action, not a cron/trigger (§5)
      return promoteFromWaitlist(freed, matchId)
    })
  },

  /** waitlist a FULL match (any join_mode, §5) — holds NO slot, just a FIFO
   *  entry. Upsert per unique(match_id, player_id, kind): re-joining after
   *  'left'/'expired' reuses the row with a fresh created_at (old position
   *  forfeited). Can't waitlist your own or an already-joined match. */
  joinWaitlist(matchId: string) {
    if (liveReady) { void rpc('join_waitlist', { p_match: matchId }); return }
    mutate((d) => {
      const m = d.matches.find((x) => x.id === matchId)
      if (!m || m.host_id === currentUserId || isJoined(d, matchId)) return d
      if (genderBlocks(d, matchId)) return d // ladies-only gate (mock parity, §6)
      if (computeStatus(m) !== 'full') return d
      const existing = d.matchRequests.find(
        (r) => r.match_id === matchId && r.player_id === currentUserId && r.kind === 'waitlist',
      )
      if (existing && existing.status === 'waitlisted') return d
      const now = new Date().toISOString()
      return {
        ...d,
        matchRequests: existing
          ? d.matchRequests.map((r) => (r.id === existing.id ? { ...r, status: 'waitlisted' as const, created_at: now } : r))
          : [
              ...d.matchRequests,
              { id: newId('mr'), match_id: matchId, player_id: currentUserId, kind: 'waitlist' as const, status: 'waitlisted' as const, created_at: now },
            ],
      }
    })
  },

  /** waitlisted → left (player removes themselves from the queue) */
  leaveWaitlist(matchId: string) {
    if (liveReady) {
      if (supabase) afterWrite(supabase.from('match_requests').update({ status: 'left' })
        .eq('match_id', matchId).eq('player_id', currentUserId).eq('kind', 'waitlist').eq('status', 'waitlisted'))
      return
    }
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.map((r) =>
        r.match_id === matchId && r.player_id === currentUserId && r.kind === 'waitlist' && r.status === 'waitlisted'
          ? { ...r, status: 'left' as const }
          : r,
      ),
    }))
  },

  /** approval join_mode: player → host. Pending request holds NO slot. */
  requestToJoin(matchId: string) {
    if (liveReady) { void rpc('request_to_join', { p_match: matchId }); return }
    mutate((d) => {
      if (pendingRequest(d, matchId)) return d
      if (genderBlocks(d, matchId)) return d // ladies-only gate (mock parity, §6)
      return {
        ...d,
        matchRequests: [
          ...d.matchRequests,
          { id: newId('mr'), match_id: matchId, player_id: currentUserId, kind: 'request', status: 'requested', created_at: new Date().toISOString() },
        ],
      }
    })
  },

  cancelRequest(matchId: string) {
    if (liveReady) {
      if (supabase) afterWrite(supabase.from('match_requests').update({ status: 'declined' })
        .eq('match_id', matchId).eq('player_id', currentUserId).eq('kind', 'request').eq('status', 'requested'))
      return
    }
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.filter(
        (r) => !(r.match_id === matchId && r.player_id === currentUserId && r.status === 'requested'),
      ),
    }))
  },

  /** host approves: requested → approved → joined; first to fill wins,
   *  remaining pending requests expire when the match fills (§5 no slot hold).
   *  Returns 'joined' on success or 'full' if the last slot was taken between
   *  render and tap, so the caller surfaces "Match just filled" instead of
   *  over-filling. Returns null in live mode (RPC is async + raises on full). */
  approveRequest(requestId: string): 'joined' | 'full' | null {
    if (liveReady) { void rpc('approve_request', { p_request: requestId }); return null }
    let result: 'joined' | 'full' | null = null
    mutate((d) => {
      const r = d.matchRequests.find((x) => x.id === requestId)
      if (!r) return d
      const m = d.matches.find((x) => x.id === r.match_id)
      if (!m) return d
      if (m.spots_available <= 0) { result = 'full'; return d }
      result = 'joined'
      const spotsLeft = m.spots_available - 1
      // mirror the live `_sync_thread_on_join` trigger: add the approved player
      // to the match's group thread and announce the join inline (§7 follow-up).
      const player = getUser(d, r.player_id)
      const thread = threadForMatch(d, m.id)
      return {
        ...d,
        matches: d.matches.map((x) => (x.id === m.id ? { ...x, spots_available: spotsLeft } : x)),
        matchPlayers: [
          ...d.matchPlayers,
          { id: newId('mp'), match_id: m.id, player_id: r.player_id, joined_at: new Date().toISOString(), attended: null },
        ],
        matchRequests: d.matchRequests.map((x) => {
          if (x.id === requestId) return { ...x, status: 'joined' as const }
          // match just filled → expire all other pending requests/invites
          if (spotsLeft === 0 && x.match_id === m.id && (x.status === 'requested' || x.status === 'invited'))
            return { ...x, status: 'expired' as const }
          return x
        }),
        chatThreads: thread && !thread.participant_ids.includes(r.player_id)
          ? d.chatThreads.map((t) => (t.id === thread.id ? { ...t, participant_ids: [...t.participant_ids, r.player_id] } : t))
          : d.chatThreads,
        chatMessages: thread && player
          ? [
              ...d.chatMessages,
              { id: newId('msg'), thread_id: thread.id, sender_id: r.player_id, body: `${player.name.split(' ')[0]} joined`, created_at: new Date().toISOString(), system: true, tone: 'info' as const, icon: 'userPlus' as const },
            ]
          : d.chatMessages,
      }
    })
    return result
  },

  /** host → player invite. A pending invite holds NO slot (CLAUDE.md §5). */
  invitePlayer(matchId: string, playerId: string) {
    if (liveReady) { void rpc('invite_player', { p_match: matchId, p_player: playerId }); return }
    const reqId = newId('mr')
    let created = false
    mutate((d) => {
      const dup = d.matchRequests.some(
        (r) => r.match_id === matchId && r.player_id === playerId && (r.status === 'invited' || r.status === 'requested'),
      )
      if (dup || isJoined(d, matchId, playerId)) return d
      created = true
      return {
        ...d,
        matchRequests: [
          ...d.matchRequests,
          { id: reqId, match_id: matchId, player_id: playerId, kind: 'invite', status: 'invited', created_at: new Date().toISOString() },
        ],
      }
    })
    // demo: the invited dummy account accepts a beat later so the flow runs end-to-end
    if (created) setTimeout(() => simulateInviteAccept(reqId), INVITE_ACCEPT_DELAY)
  },

  /** invited player accepts: invited → accepted → joined (first to fill wins).
   *  On accept the player is added to the match group thread and the join is
   *  announced inline — no chat access until then (CLAUDE.md §5). Returns
   *  'joined' on success or 'expired' if the last slot was taken between render
   *  and tap, so the caller can route into the thread or surface "Match just
   *  filled" (race-safe accept). Returns null in live mode (RPC is async). */
  acceptInvite(requestId: string): 'joined' | 'expired' | null {
    if (liveReady) { void rpc('accept_invite', { p_request: requestId }); return null }
    let result: 'joined' | 'expired' | null = null
    mutate((d) => {
      const r = d.matchRequests.find((x) => x.id === requestId)
      if (!r || r.status !== 'invited') return d
      const m = d.matches.find((x) => x.id === r.match_id)
      if (!m || m.spots_available <= 0) {
        // match filled before the player answered → the invite expired
        result = 'expired'
        return {
          ...d,
          matchRequests: d.matchRequests.map((x) => (x.id === requestId ? { ...x, status: 'expired' as const } : x)),
        }
      }
      result = 'joined'
      const spotsLeft = m.spots_available - 1
      // add the accepting player to the match's group thread (create it if a
      // legacy/seeded match has none), then announce the join inline.
      const player = getUser(d, r.player_id)
      let thread = threadForMatch(d, m.id)
      let chatThreads = d.chatThreads
      if (!thread) {
        thread = { id: newId('t'), match_id: m.id, participant_ids: [m.host_id], created_at: new Date().toISOString() }
        chatThreads = [...chatThreads, thread]
      }
      const threadId = thread.id
      chatThreads = chatThreads.map((t) =>
        t.id === threadId && !t.participant_ids.includes(r.player_id)
          ? { ...t, participant_ids: [...t.participant_ids, r.player_id] }
          : t,
      )
      return {
        ...d,
        matches: d.matches.map((x) => (x.id === m.id ? { ...x, spots_available: spotsLeft } : x)),
        matchPlayers: [
          ...d.matchPlayers,
          { id: newId('mp'), match_id: m.id, player_id: r.player_id, joined_at: new Date().toISOString(), attended: null },
        ],
        matchRequests: d.matchRequests.map((x) => {
          if (x.id === requestId) return { ...x, status: 'accepted' as const }
          if (spotsLeft === 0 && x.match_id === m.id && (x.status === 'requested' || x.status === 'invited'))
            return { ...x, status: 'expired' as const }
          return x
        }),
        chatThreads,
        chatMessages: player
          ? [
              ...d.chatMessages,
              { id: newId('msg'), thread_id: threadId, sender_id: r.player_id, body: `${player.name.split(' ')[0]} joined`, created_at: new Date().toISOString(), system: true, tone: 'pos' as const, icon: 'userPlus' as const },
            ]
          : d.chatMessages,
      }
    })
    return result
  },

  declineInvite(requestId: string) {
    if (liveReady) { void rpc('decline_invite', { p_request: requestId }); return }
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.map((x) => (x.id === requestId && x.status === 'invited' ? { ...x, status: 'declined' as const } : x)),
    }))
  },

  declineRequest(requestId: string) {
    if (liveReady) { void rpc('decline_request', { p_request: requestId }); return }
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.map((x) => (x.id === requestId ? { ...x, status: 'declined' as const } : x)),
    }))
  },

  cancelMatch(matchId: string) {
    // Optimistically mark the match cancelled in both modes so Home (which
    // navigates immediately after cancel) drops it on the next render; in live
    // mode afterWrite then persists + rehydrates to confirm. Without this the
    // async write returns before navigate('/home'), so the cancelled match
    // still shows under "You're hosting" until the snapshot round-trips.
    mutate((d) => ({
      ...d,
      matches: d.matches.map((x) => (x.id === matchId ? { ...x, status: 'cancelled' as const } : x)),
      // cancelled match → all remaining waitlist entries expire (§5)
      matchRequests: d.matchRequests.map((r) =>
        r.match_id === matchId && r.kind === 'waitlist' && r.status === 'waitlisted' ? { ...r, status: 'expired' as const } : r,
      ),
    }))
    if (liveReady && supabase) {
      afterWrite(supabase.from('matches').update({ status: 'cancelled' }).eq('id', matchId))
    }
  },

  async createMatch(
    input: Omit<Match, 'id' | 'created_at' | 'status' | 'spots_available'> & { spots_available?: number },
  ): Promise<string> {
    if (liveReady) {
      if (!supabase) return ''
      const { data, error } = await supabase.rpc('create_match', {
        p_sport: input.sport,
        p_name: input.name ?? null,
        p_venue_id: asUuidOrNull(input.venue_id),
        p_venue_name: input.venue_name,
        p_venue_location: input.venue_location ?? null,
        p_court_number: input.court_number ?? null,
        p_start: input.start_time,
        p_end: input.end_time,
        p_skill_min: input.skill_min,
        p_skill_max: input.skill_max,
        p_total_spots: input.total_spots,
        p_fee_total: input.fee_total ?? 0,
        p_fee_per_player: input.fee_per_player ?? 0,
        p_join_mode: input.join_mode,
        p_notes: input.notes ?? null,
        p_gender_restriction: input.gender_restriction ?? 'mixed',
      })
      if (error) {
        console.error('[rpc] create_match failed:', error.message)
        return ''
      }
      await rehydrate()
      return (data as string) ?? ''
    }
    const id = newId('m')
    mutate((d) => ({
      ...d,
      matches: [
        ...d.matches,
        {
          ...input,
          id,
          spots_available: input.spots_available ?? input.total_spots - 1, // host occupies a spot
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ],
      matchPlayers: [
        ...d.matchPlayers,
        { id: newId('mp'), match_id: id, player_id: input.host_id, joined_at: new Date().toISOString(), attended: null },
      ],
      // per-match group thread, auto-created with the host as sole member —
      // invited/joining players are added only when they accept/join, so an
      // invite holds no chat access while pending (CLAUDE.md §5).
      chatThreads: [
        ...d.chatThreads,
        { id: newId('t'), match_id: id, participant_ids: [input.host_id], created_at: new Date().toISOString() },
      ],
    }))
    return id
  },

  updateMatch(matchId: string, patch: Partial<Match>) {
    // Optimistically apply in both modes so Home (which navigates straight to
    // /home after Save) reflects the edit — start/end time, spots, price… — on
    // the next render; live mode then persists + rehydrates to confirm. Without
    // this the async write returns after navigate('/home'), so the card keeps
    // showing the old values until the snapshot round-trips. Mirrors cancelMatch.
    mutate((d) => ({
      ...d,
      matches: d.matches.map((x) => (x.id === matchId ? { ...x, ...patch } : x)),
    }))
    if (liveReady) {
      if (!supabase) return
      // map app fields → matches columns (drop route_*/round_trip/status — not
      // in the Stage-1 schema; cancel goes through cancelMatch)
      const cols = ['sport', 'name', 'venue_id', 'venue_name', 'venue_location', 'court_number', 'start_time', 'end_time', 'skill_min', 'skill_max', 'total_spots', 'spots_available', 'fee_total', 'fee_per_player', 'join_mode', 'gender_restriction', 'notes']
      const src = patch as Record<string, unknown>
      const dbPatch: Record<string, unknown> = {}
      for (const k of cols) if (k in src) dbPatch[k] = src[k] ?? null
      if ('venue_id' in dbPatch) dbPatch.venue_id = asUuidOrNull(dbPatch.venue_id)
      if (dbPatch.fee_total == null && 'fee_total' in dbPatch) dbPatch.fee_total = 0
      if (dbPatch.fee_per_player == null && 'fee_per_player' in dbPatch) dbPatch.fee_per_player = 0
      if ('gender_restriction' in dbPatch && dbPatch.gender_restriction == null) dbPatch.gender_restriction = 'mixed'
      afterWrite(supabase.from('matches').update(dbPatch).eq('id', matchId))
    }
  },

  /** post-match step 1: everyone defaults to Played; flag no-shows */
  setAttendance(matchId: string, playerId: string, attended: boolean) {
    if (liveReady) { void rpc('set_attendance', { p_match: matchId, p_player: playerId, p_attended: attended }); return }
    mutate((d) => ({
      ...d,
      matchPlayers: d.matchPlayers.map((mp) =>
        mp.match_id === matchId && mp.player_id === playerId ? { ...mp, attended } : mp,
      ),
    }))
  },

  /** post-match step 2: record YOUR result, feeds win rate. Optimistic in BOTH
   *  modes (mirrors cancelMatch/updateMatch) so the consensus check sees this
   *  submission immediately; once 2+ players corroborate, finalizeMatchIfConfirmed
   *  closes the match and the stats follow (CLAUDE.md §5). */
  recordResult(matchId: string, playerId: string, result: MatchResult['result']) {
    mutate((d) => ({
      ...d,
      matchResults: [
        ...d.matchResults.filter((r) => !(r.match_id === matchId && r.player_id === playerId)),
        { id: newId('res'), match_id: matchId, player_id: playerId, result },
      ],
    }))
    if (liveReady && supabase) {
      // RLS results_insert_self → only your own result persists. Upsert so editing
      // a result you already recorded can't trip unique(match_id, player_id).
      afterWrite(supabase.from('match_results').upsert({ match_id: matchId, player_id: playerId, result }, { onConflict: 'match_id,player_id' }))
    }
    finalizeMatchIfConfirmed(matchId)
  },

  reportNoShow(matchId: string, reportedPlayer: string) {
    if (liveReady) {
      if (reportedPlayer === currentUserId) return
      if (supabase) afterWrite(supabase.from('no_show_reports').insert({ match_id: matchId, reported_player: reportedPlayer, reporter_id: currentUserId }))
      return
    }
    mutate((d) => {
      // unique(match_id, reported_player, reporter_id); no self-report
      if (reportedPlayer === currentUserId) return d
      const dup = d.noShowReports.some(
        (r) => r.match_id === matchId && r.reported_player === reportedPlayer && r.reporter_id === currentUserId,
      )
      if (dup) return d
      return {
        ...d,
        noShowReports: [
          ...d.noShowReports,
          { id: newId('nsr'), match_id: matchId, reported_player: reportedPlayer, reporter_id: currentUserId, created_at: new Date().toISOString() },
        ],
      }
    })
  },

  blockUser(userId: string) {
    mutate((d) => (d.blockedUserIds.includes(userId) ? d : { ...d, blockedUserIds: [...d.blockedUserIds, userId] }))
  },

  unblockUser(userId: string) {
    mutate((d) => ({ ...d, blockedUserIds: d.blockedUserIds.filter((id) => id !== userId) }))
  },

  sendMessage(threadId: string, body: string) {
    const text = body.trim()
    if (!text) return
    // Sending implies you've read this thread: advance your read marker so a
    // message YOU send never surfaces as a "new messages" alert. Combined with
    // unreadCount excluding your own messages (sender_id !== currentUserId),
    // only messages RECEIVED from others ever contribute to the unread count.
    actions.markThreadRead(threadId)
    if (liveReady) {
      if (supabase) afterWrite(supabase.from('chat_messages').insert({ thread_id: threadId, sender_id: currentUserId, body: text }))
      return
    }
    mutate((d) => ({
      ...d,
      chatMessages: [
        ...d.chatMessages,
        { id: newId('msg'), thread_id: threadId, sender_id: currentUserId, body: text, created_at: new Date().toISOString() },
      ],
    }))
  },

  postSystemLine(threadId: string, body: string, tone: ChatMessage['tone'] = 'info', icon: ChatMessage['icon'] = 'flag') {
    if (liveReady) return // system lines come from DB triggers/RPCs in live mode
    mutate((d) => ({
      ...d,
      chatMessages: [
        ...d.chatMessages,
        { id: newId('msg'), thread_id: threadId, sender_id: currentUserId, body, created_at: new Date().toISOString(), system: true, tone, icon },
      ],
    }))
  },

  /** record that the user has seen the current Chat notifications (Alerts) up to
   *  `count` — called when the inbox is open so the Chat-tab badge clears, and
   *  to clamp `seen` back down when the live count drops (an actioned/expired
   *  alert must never suppress a genuinely new one). No-op if unchanged. */
  markNotificationsSeen(count: number) {
    mutate((d) => {
      if (d.notifSeenCount === count) return d
      const next = { ...d, notifSeenCount: count }
      saveChatPrefs(next)
      return next
    })
  },

  markThreadRead(threadId: string) {
    mutate((d) => {
      // opening a thread you'd deleted brings it back (you're using it again)
      const deleted = { ...d.deletedThreadAt }
      let changed = false
      if (threadId in deleted) {
        delete deleted[threadId]
        changed = true
      }
      const next = { ...d, threadReadAt: { ...d.threadReadAt, [threadId]: new Date().toISOString() }, deletedThreadAt: deleted }
      if (changed) saveChatPrefs(next)
      return next
    })
  },

  /** swipe action: move a thread to the Archive pill (reversible) */
  archiveThread(threadId: string) {
    mutate((d) => {
      if (d.archivedThreadIds.includes(threadId)) return d
      const next = { ...d, archivedThreadIds: [...d.archivedThreadIds, threadId] }
      saveChatPrefs(next)
      return next
    })
  },

  /** swipe action (in Archive): return a thread to the main inbox */
  unarchiveThread(threadId: string) {
    mutate((d) => {
      const next = { ...d, archivedThreadIds: d.archivedThreadIds.filter((id) => id !== threadId) }
      saveChatPrefs(next)
      return next
    })
  },

  /** swipe action: remove a thread from the inbox. Soft per-device delete (the
   *  Supabase thread is untouched so other participants keep it) — it stays
   *  hidden until a newer message arrives or you reopen it (markThreadRead). */
  deleteThread(threadId: string) {
    mutate((d) => {
      const next = {
        ...d,
        archivedThreadIds: d.archivedThreadIds.filter((id) => id !== threadId),
        deletedThreadAt: { ...d.deletedThreadAt, [threadId]: new Date().toISOString() },
      }
      saveChatPrefs(next)
      return next
    })
  },

  /** open DM (anyone → anyone) — returns the one canonical thread */
  async getOrCreateDM(userId: string): Promise<string> {
    if (liveReady) {
      if (!supabase) return ''
      const { data, error } = await supabase.rpc('get_or_create_dm', { p_other: userId })
      if (error) {
        console.error('[rpc] get_or_create_dm failed:', error.message)
        return ''
      }
      await rehydrate()
      return (data as string) ?? ''
    }
    const existing = dmThreadWith(db, userId)
    if (existing) return existing.id
    const id = newId('t-dm')
    mutate((d) => ({
      ...d,
      chatThreads: [...d.chatThreads, { id, match_id: null, participant_ids: [currentUserId, userId], created_at: new Date().toISOString() }],
    }))
    return id
  },

  /** New Message multi-select (§8): 1 other → the canonical DM (never fork);
   *  2+ others → a group chat thread. Returns the thread id to route into. */
  async createGroupThread(otherIds: string[]): Promise<string> {
    const others = [...new Set(otherIds.filter((id) => id && id !== currentUserId))]
    if (others.length === 0) return ''
    if (others.length === 1) return actions.getOrCreateDM(others[0])
    if (liveReady) {
      if (!supabase) return ''
      const { data, error } = await supabase.rpc('create_group_thread', { p_others: others })
      if (error) {
        console.error('[rpc] create_group_thread failed:', error.message)
        return ''
      }
      await rehydrate()
      return (data as string) ?? ''
    }
    // mock: reuse an existing group with the exact same member set, else create
    const members = [currentUserId, ...others]
    const setEq = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))
    const dup = db.chatThreads.find((t) => t.match_id === null && setEq(t.participant_ids, members))
    if (dup) return dup.id
    const id = newId('t-grp')
    const me = getUser(db, currentUserId)
    const now = new Date().toISOString()
    mutate((d) => ({
      ...d,
      chatThreads: [...d.chatThreads, { id, match_id: null, participant_ids: members, created_at: now }],
      chatMessages: [
        ...d.chatMessages,
        { id: newId('msg'), thread_id: id, sender_id: currentUserId, body: `${me?.name.split(' ')[0] ?? 'You'} started this group`, created_at: now, system: true, tone: 'info' as const, icon: 'userPlus' as const },
      ],
    }))
    return id
  },

  toggleSaveMatch(matchId: string) {
    const wasSaved = db.savedMatchIds.includes(matchId)
    // optimistic in BOTH modes so the bookmark flips instantly everywhere the
    // card renders; live mode then persists to saved_matches (Realtime + the
    // afterWrite rehydrate confirm it, and propagate across windows).
    mutate((d) => ({
      ...d,
      savedMatchIds: wasSaved ? d.savedMatchIds.filter((id) => id !== matchId) : [...d.savedMatchIds, matchId],
    }))
    if (liveReady && supabase) {
      afterWrite(
        wasSaved
          ? supabase.from('saved_matches').delete().eq('user_id', currentUserId).eq('match_id', matchId)
          : supabase.from('saved_matches').insert({ user_id: currentUserId, match_id: matchId }),
      )
    }
  },
}

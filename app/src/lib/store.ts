import { useSyncExternalStore } from 'react'
import type { ChatMessage, ChatThread, Match, MatchPlayer, MatchRequest, MatchResult, NoShowReport, SkillLevel, Sport, User } from './types'
import { CHAT_MESSAGES, CHAT_THREADS, CURRENT_USER_ID, MATCHES, MATCH_PLAYERS, MATCH_REQUESTS, MATCH_RESULTS, USERS } from './mock/data'
import { onboarding, resetOnboarding } from './onboarding'
import { computeStatus } from './status'
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
}

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
        ? { ...u, name: onboarding.name ?? u.name, sport: onboarding.sport ?? u.sport, skill_level: onboarding.skill ?? u.skill_level }
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

/* ── demo simulation: the seeded dummy accounts respond, so invite + chat
 *  flows run end-to-end with no backend. Pure setTimeout over the existing
 *  mutations — invited players auto-accept (and the match thread announces
 *  the join), DM'd / group-chat players send a canned reply. Delete this
 *  block when a real backend drives counterparty behaviour (CLAUDE.md §7). */
const INVITE_ACCEPT_DELAY = 1600
const REPLY_DELAY = 1500
let replyTick = 0

const CANNED_REPLIES = [
  'Sounds good — count me in! 👍',
  'Nice, see you on court.',
  'Perfect, that works for me.',
  'Great — looking forward to it!',
  'On my way shortly.',
  'Appreciate the message — let’s do it.',
]

/** An invited dummy player accepts a beat later: acceptInvite fills a spot,
 *  adds them to the match thread, and announces the join inline. */
function simulateInviteAccept(reqId: string) {
  const req = db.matchRequests.find((r) => r.id === reqId)
  if (!req || req.status !== 'invited') return
  actions.acceptInvite(reqId)
}

/** A canned reply from the first other (non-blocked) participant of a thread —
 *  works for both 1:1 DMs and match group threads. */
function botReply(threadId: string, senderId: string, index: number) {
  mutate((d) => {
    const t = d.chatThreads.find((x) => x.id === threadId)
    if (!t || !t.participant_ids.includes(senderId) || d.blockedUserIds.includes(senderId)) return d
    return {
      ...d,
      chatMessages: [
        ...d.chatMessages,
        { id: newId('msg'), thread_id: threadId, sender_id: senderId, body: CANNED_REPLIES[index % CANNED_REPLIES.length], created_at: new Date().toISOString() },
      ],
    }
  })
}

function scheduleReply(threadId: string) {
  const thread = db.chatThreads.find((t) => t.id === threadId)
  if (!thread) return
  const responder = thread.participant_ids.find((p) => p !== CURRENT_USER_ID && !db.blockedUserIds.includes(p))
  if (!responder) return // your own solo thread (e.g. hosted) — nobody to reply
  setTimeout(() => botReply(threadId, responder, replyTick++), REPLY_DELAY)
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
    // keep client-only state (block/save/read) that has no table yet
    db = { ...db, ...snap }
    liveHydrated = true // first snapshot is in — release the route guard
    emit()
  } catch (e) {
    console.error('[store] hydrate failed', e)
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
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

/** curated mock venues use slug ids ('padelin-aspire'); the DB venue_id is a
 *  uuid FK. Pass null for anything that isn't a real uuid — venue_name carries
 *  the display either way. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const asUuidOrNull = (v: unknown): string | null => (typeof v === 'string' && UUID_RE.test(v) ? v : null)

/** call a flow RPC, then refresh `db` (Realtime will also fire, but this makes
 *  the acting window feel instant). Errors are logged; callers stay fire-and-forget. */
async function rpc(fn: string, params: Record<string, unknown>): Promise<unknown> {
  if (!supabase) return
  const { data, error } = await supabase.rpc(fn, params)
  if (error) {
    console.error(`[rpc] ${fn} failed:`, error.message)
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

export function getUser(d: DB, id: string): User | undefined {
  return d.users.find((u) => u.id === id)
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

export function pendingRequest(d: DB, matchId: string, userId = currentUserId): MatchRequest | undefined {
  return d.matchRequests.find(
    (r) => r.match_id === matchId && r.player_id === userId && (r.status === 'requested' || r.status === 'invited'),
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
  return d.users.filter((u) => {
    if (u.id === currentUserId || (m && u.id === m.host_id)) return false
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
 *  Future SQL: select * from matches where read_status in ('open','full')
 *  and host_id != :me order by start_time. */
export function discoverFeed(d: DB): Match[] {
  return discoverMatches(d).filter((m) => m.host_id !== currentUserId)
}

export function joinedMatches(d: DB, userId = currentUserId): Match[] {
  return d.matches
    .filter((m) => isJoined(d, m.id, userId))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export function hostedMatches(d: DB, userId = currentUserId): Match[] {
  return d.matches.filter((m) => m.host_id === userId).sort((a, b) => a.start_time.localeCompare(b.start_time))
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

/** inbox threads — block kills DM threads both ways (removed from inbox) */
export function inboxThreads(d: DB): ChatThread[] {
  return d.chatThreads
    .filter((t) => t.participant_ids.includes(currentUserId))
    .filter((t) => t.match_id !== null || !t.participant_ids.some((p) => d.blockedUserIds.includes(p)))
    .map((t) => ({ t, last: threadMessages(d, t.id).at(-1) }))
    .sort((a, b) => (b.last?.created_at ?? b.t.created_at).localeCompare(a.last?.created_at ?? a.t.created_at))
    .map(({ t }) => t)
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
  updateProfile(patch: { name?: string; bio?: string; area?: string; city?: string; sport?: Sport; skill_level?: SkillLevel }) {
    if (liveReady) {
      // every editable public field maps 1:1 to a users column (bio/area added
      // by add_profile_bio_area_languages, city by add_profile_city_verified, §6)
      // so the edit persists and propagates to other players via Realtime.
      const up: Record<string, unknown> = {}
      if (patch.name != null) up.name = patch.name
      if (patch.sport != null) up.sport = patch.sport
      if (patch.skill_level != null) up.skill_level = patch.skill_level
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
      const freed: DB = {
        ...d,
        matches: d.matches.map((x) => (x.id === matchId ? { ...x, spots_available: x.spots_available + 1 } : x)),
        matchPlayers: d.matchPlayers.filter((mp) => !(mp.match_id === matchId && mp.player_id === currentUserId)),
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
   *  remaining pending requests expire when the match fills. */
  approveRequest(requestId: string) {
    if (liveReady) { void rpc('approve_request', { p_request: requestId }); return }
    mutate((d) => {
      const r = d.matchRequests.find((x) => x.id === requestId)
      if (!r) return d
      const m = d.matches.find((x) => x.id === r.match_id)
      if (!m || m.spots_available <= 0) return d
      const spotsLeft = m.spots_available - 1
      return {
        ...d,
        matches: d.matches.map((x) => (x.id === m.id ? { ...x, spots_available: spotsLeft } : x)),
        matchPlayers: [
          ...d.matchPlayers,
          { id: newId('mp'), match_id: m.id, player_id: r.player_id, joined_at: new Date().toISOString(), attended: null },
        ],
        matchRequests: d.matchRequests.map((x) => {
          if (x.id === requestId) return { ...x, status: 'approved' as const }
          // match just filled → expire all other pending requests/invites
          if (spotsLeft === 0 && x.match_id === m.id && (x.status === 'requested' || x.status === 'invited'))
            return { ...x, status: 'expired' as const }
          return x
        }),
      }
    })
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
    if (liveReady) {
      if (supabase) afterWrite(supabase.from('matches').update({ status: 'cancelled' }).eq('id', matchId))
      return
    }
    mutate((d) => ({
      ...d,
      matches: d.matches.map((x) => (x.id === matchId ? { ...x, status: 'cancelled' as const } : x)),
      // cancelled match → all remaining waitlist entries expire (§5)
      matchRequests: d.matchRequests.map((r) =>
        r.match_id === matchId && r.kind === 'waitlist' && r.status === 'waitlisted' ? { ...r, status: 'expired' as const } : r,
      ),
    }))
  },

  async createMatch(
    input: Omit<Match, 'id' | 'created_at' | 'status' | 'spots_available'> & { spots_available?: number },
  ): Promise<string> {
    if (liveReady) {
      if (!supabase) return ''
      const { data, error } = await supabase.rpc('create_match', {
        p_sport: input.sport,
        p_venue_id: asUuidOrNull(input.venue_id),
        p_venue_name: input.venue_name,
        p_venue_location: input.venue_location ?? null,
        p_court_number: input.court_number ?? null,
        p_start: input.start_time,
        p_end: input.end_time,
        p_skill: input.skill_level,
        p_total_spots: input.total_spots,
        p_fee_total: input.fee_total ?? 0,
        p_fee_per_player: input.fee_per_player ?? 0,
        p_join_mode: input.join_mode,
        p_notes: input.notes ?? null,
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
    if (liveReady) {
      if (!supabase) return
      // map app fields → matches columns (drop route_*/round_trip/status — not
      // in the Stage-1 schema; cancel goes through cancelMatch)
      const cols = ['sport', 'venue_id', 'venue_name', 'venue_location', 'court_number', 'start_time', 'end_time', 'skill_level', 'total_spots', 'spots_available', 'fee_total', 'fee_per_player', 'join_mode', 'notes']
      const src = patch as Record<string, unknown>
      const dbPatch: Record<string, unknown> = {}
      for (const k of cols) if (k in src) dbPatch[k] = src[k] ?? null
      if ('venue_id' in dbPatch) dbPatch.venue_id = asUuidOrNull(dbPatch.venue_id)
      if (dbPatch.fee_total == null && 'fee_total' in dbPatch) dbPatch.fee_total = 0
      if (dbPatch.fee_per_player == null && 'fee_per_player' in dbPatch) dbPatch.fee_per_player = 0
      afterWrite(supabase.from('matches').update(dbPatch).eq('id', matchId))
      return
    }
    mutate((d) => ({
      ...d,
      matches: d.matches.map((x) => (x.id === matchId ? { ...x, ...patch } : x)),
    }))
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

  /** post-match step 2: optional result, feeds win rate */
  recordResult(matchId: string, playerId: string, result: MatchResult['result']) {
    if (liveReady) {
      // RLS results_insert_self → only your own result persists
      if (supabase) afterWrite(supabase.from('match_results').insert({ match_id: matchId, player_id: playerId, result }))
      return
    }
    mutate((d) => ({
      ...d,
      matchResults: [
        ...d.matchResults.filter((r) => !(r.match_id === matchId && r.player_id === playerId)),
        { id: newId('res'), match_id: matchId, player_id: playerId, result },
      ],
    }))
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
    scheduleReply(threadId) // demo: the other side replies shortly so chats run end-to-end
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

  markThreadRead(threadId: string) {
    mutate((d) => ({ ...d, threadReadAt: { ...d.threadReadAt, [threadId]: new Date().toISOString() } }))
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

  toggleSaveMatch(matchId: string) {
    mutate((d) => ({
      ...d,
      savedMatchIds: d.savedMatchIds.includes(matchId)
        ? d.savedMatchIds.filter((id) => id !== matchId)
        : [...d.savedMatchIds, matchId],
    }))
  },
}

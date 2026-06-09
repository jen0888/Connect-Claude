import { useSyncExternalStore } from 'react'
import type { ChatMessage, ChatThread, Match, MatchPlayer, MatchRequest, MatchResult, NoShowReport, SkillLevel, Sport, User } from './types'
import { CHAT_MESSAGES, CHAT_THREADS, CURRENT_USER_ID, MATCHES, MATCH_PLAYERS, MATCH_REQUESTS, MATCH_RESULTS, USERS } from './mock/data'
import { onboarding } from './onboarding'
import { computeStatus } from './status'
import { clearHostedMatch } from './hostedMatch'
import { clearProfileSports } from './profile'

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

let db: DB = isFreshAccount() ? freshDB() : SEEDED

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

let idCounter = 0
const newId = (prefix: string) => `${prefix}-${++idCounter}-${Math.random().toString(36).slice(2, 7)}`

/* ── selectors (future Supabase selects / views) ───────────────────── */

export const currentUserId = CURRENT_USER_ID

export function getUser(d: DB, id: string): User | undefined {
  return d.users.find((u) => u.id === id)
}

export function matchPlayers(d: DB, matchId: string): User[] {
  return d.matchPlayers
    .filter((mp) => mp.match_id === matchId)
    .map((mp) => getUser(d, mp.player_id))
    .filter((u): u is User => !!u)
}

export function isJoined(d: DB, matchId: string, userId = CURRENT_USER_ID): boolean {
  return d.matchPlayers.some((mp) => mp.match_id === matchId && mp.player_id === userId)
}

export function pendingRequest(d: DB, matchId: string, userId = CURRENT_USER_ID): MatchRequest | undefined {
  return d.matchRequests.find(
    (r) => r.match_id === matchId && r.player_id === userId && (r.status === 'requested' || r.status === 'invited'),
  )
}

/** active waitlist entry for a player on a match (kind 'waitlist', §5) */
export function waitlistEntry(d: DB, matchId: string, userId = CURRENT_USER_ID): MatchRequest | undefined {
  return d.matchRequests.find(
    (r) => r.match_id === matchId && r.player_id === userId && r.kind === 'waitlist' && r.status === 'waitlisted',
  )
}

/** 1-based FIFO position — derived from created_at ordering, never stored (§5) */
export function waitlistPosition(d: DB, matchId: string, userId = CURRENT_USER_ID): number | null {
  const queue = d.matchRequests
    .filter((r) => r.match_id === matchId && r.kind === 'waitlist' && r.status === 'waitlisted')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
  const i = queue.findIndex((r) => r.player_id === userId)
  return i === -1 ? null : i + 1
}

/** invites awaiting MY response — kind 'invite', status 'invited', on a match
 *  that's still joinable (open/full, not cancelled). Drives the Home + Chat
 *  invite surfaces; FIFO by created_at so the oldest invite shows first. */
export function myInvites(d: DB, userId = CURRENT_USER_ID): MatchRequest[] {
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
    if (u.id === CURRENT_USER_ID || (m && u.id === m.host_id)) return false
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
  return discoverMatches(d).filter((m) => m.host_id !== CURRENT_USER_ID)
}

export function joinedMatches(d: DB, userId = CURRENT_USER_ID): Match[] {
  return d.matches
    .filter((m) => isJoined(d, m.id, userId))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

export function hostedMatches(d: DB, userId = CURRENT_USER_ID): Match[] {
  return d.matches.filter((m) => m.host_id === userId).sort((a, b) => a.start_time.localeCompare(b.start_time))
}

/* ── chat selectors — one canonical thread per match / per pair,
      deep-link never forks (CLAUDE.md §5) ──────────────────────────── */

export function threadForMatch(d: DB, matchId: string): ChatThread | undefined {
  return d.chatThreads.find((t) => t.match_id === matchId)
}

export function dmThreadWith(d: DB, userId: string): ChatThread | undefined {
  return d.chatThreads.find((t) => t.match_id === null && t.participant_ids.includes(userId) && t.participant_ids.includes(CURRENT_USER_ID))
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
  return threadMessages(d, threadId).filter((m) => !m.system && m.sender_id !== CURRENT_USER_ID && m.created_at > readAt).length
}

/** inbox threads — block kills DM threads both ways (removed from inbox) */
export function inboxThreads(d: DB): ChatThread[] {
  return d.chatThreads
    .filter((t) => t.participant_ids.includes(CURRENT_USER_ID))
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
    signedInProfile = profile
    mutate((d) => ({ ...d, users: withSignedIn(d.users) }))
  },

  /** onboarding "Create account" (the future Supabase signUp): wipe the demo
   *  user's history so Home renders the first-timer variant until they join */
  startFreshAccount() {
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
  updateProfile(patch: { name?: string; bio?: string; area?: string; sport?: Sport; skill_level?: SkillLevel }) {
    if (signedInProfile) signedInProfile = { ...signedInProfile, ...patch }
    if (patch.name != null) onboarding.name = patch.name
    if (patch.sport != null) onboarding.sport = patch.sport
    if (patch.skill_level != null && patch.skill_level !== 'any') onboarding.skill = patch.skill_level
    mutate((d) => ({
      ...d,
      users: d.users.map((u) => (u.id === CURRENT_USER_ID ? { ...u, ...patch } : u)),
    }))
  },

  /** Sign out (mock): drop the fresh-account flag and restore the seeded
   *  returning-user demo dataset */
  restoreDemoAccount() {
    try {
      localStorage.removeItem(FRESH_KEY)
    } catch {
      /* storage unavailable — nothing persisted to clear */
    }
    mutate(() => ({ ...SEEDED, users: withSignedIn(SEEDED.users) }))
  },

  /** open join_mode: instant membership — no gatekeeping */
  joinMatch(matchId: string) {
    mutate((d) => {
      const m = d.matches.find((x) => x.id === matchId)
      if (!m || m.spots_available <= 0 || isJoined(d, matchId)) return d
      return {
        ...d,
        matches: d.matches.map((x) => (x.id === matchId ? { ...x, spots_available: x.spots_available - 1 } : x)),
        matchPlayers: [
          ...d.matchPlayers,
          { id: newId('mp'), match_id: matchId, player_id: CURRENT_USER_ID, joined_at: new Date().toISOString(), attended: null },
        ],
      }
    })
  },

  leaveMatch(matchId: string) {
    mutate((d) => {
      if (!isJoined(d, matchId)) return d
      const freed: DB = {
        ...d,
        matches: d.matches.map((x) => (x.id === matchId ? { ...x, spots_available: x.spots_available + 1 } : x)),
        matchPlayers: d.matchPlayers.filter((mp) => !(mp.match_id === matchId && mp.player_id === CURRENT_USER_ID)),
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
    mutate((d) => {
      const m = d.matches.find((x) => x.id === matchId)
      if (!m || m.host_id === CURRENT_USER_ID || isJoined(d, matchId)) return d
      if (computeStatus(m) !== 'full') return d
      const existing = d.matchRequests.find(
        (r) => r.match_id === matchId && r.player_id === CURRENT_USER_ID && r.kind === 'waitlist',
      )
      if (existing && existing.status === 'waitlisted') return d
      const now = new Date().toISOString()
      return {
        ...d,
        matchRequests: existing
          ? d.matchRequests.map((r) => (r.id === existing.id ? { ...r, status: 'waitlisted' as const, created_at: now } : r))
          : [
              ...d.matchRequests,
              { id: newId('mr'), match_id: matchId, player_id: CURRENT_USER_ID, kind: 'waitlist' as const, status: 'waitlisted' as const, created_at: now },
            ],
      }
    })
  },

  /** waitlisted → left (player removes themselves from the queue) */
  leaveWaitlist(matchId: string) {
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.map((r) =>
        r.match_id === matchId && r.player_id === CURRENT_USER_ID && r.kind === 'waitlist' && r.status === 'waitlisted'
          ? { ...r, status: 'left' as const }
          : r,
      ),
    }))
  },

  /** approval join_mode: player → host. Pending request holds NO slot. */
  requestToJoin(matchId: string) {
    mutate((d) => {
      if (pendingRequest(d, matchId)) return d
      return {
        ...d,
        matchRequests: [
          ...d.matchRequests,
          { id: newId('mr'), match_id: matchId, player_id: CURRENT_USER_ID, kind: 'request', status: 'requested', created_at: new Date().toISOString() },
        ],
      }
    })
  },

  cancelRequest(matchId: string) {
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.filter(
        (r) => !(r.match_id === matchId && r.player_id === CURRENT_USER_ID && r.status === 'requested'),
      ),
    }))
  },

  /** host approves: requested → approved → joined; first to fill wins,
   *  remaining pending requests expire when the match fills. */
  approveRequest(requestId: string) {
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
    mutate((d) => {
      const dup = d.matchRequests.some(
        (r) => r.match_id === matchId && r.player_id === playerId && (r.status === 'invited' || r.status === 'requested'),
      )
      if (dup || isJoined(d, matchId, playerId)) return d
      return {
        ...d,
        matchRequests: [
          ...d.matchRequests,
          { id: newId('mr'), match_id: matchId, player_id: playerId, kind: 'invite', status: 'invited', created_at: new Date().toISOString() },
        ],
      }
    })
  },

  /** invited player accepts: invited → accepted → joined (first to fill wins) */
  acceptInvite(requestId: string) {
    mutate((d) => {
      const r = d.matchRequests.find((x) => x.id === requestId)
      if (!r || r.status !== 'invited') return d
      const m = d.matches.find((x) => x.id === r.match_id)
      if (!m || m.spots_available <= 0) {
        // match filled before the player answered → the invite expired
        return {
          ...d,
          matchRequests: d.matchRequests.map((x) => (x.id === requestId ? { ...x, status: 'expired' as const } : x)),
        }
      }
      const spotsLeft = m.spots_available - 1
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
      }
    })
  },

  declineInvite(requestId: string) {
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.map((x) => (x.id === requestId && x.status === 'invited' ? { ...x, status: 'declined' as const } : x)),
    }))
  },

  declineRequest(requestId: string) {
    mutate((d) => ({
      ...d,
      matchRequests: d.matchRequests.map((x) => (x.id === requestId ? { ...x, status: 'declined' as const } : x)),
    }))
  },

  cancelMatch(matchId: string) {
    mutate((d) => ({
      ...d,
      matches: d.matches.map((x) => (x.id === matchId ? { ...x, status: 'cancelled' as const } : x)),
      // cancelled match → all remaining waitlist entries expire (§5)
      matchRequests: d.matchRequests.map((r) =>
        r.match_id === matchId && r.kind === 'waitlist' && r.status === 'waitlisted' ? { ...r, status: 'expired' as const } : r,
      ),
    }))
  },

  createMatch(input: Omit<Match, 'id' | 'created_at' | 'status' | 'spots_available'> & { spots_available?: number }) {
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
    }))
    return id
  },

  updateMatch(matchId: string, patch: Partial<Match>) {
    mutate((d) => ({
      ...d,
      matches: d.matches.map((x) => (x.id === matchId ? { ...x, ...patch } : x)),
    }))
  },

  /** post-match step 1: everyone defaults to Played; flag no-shows */
  setAttendance(matchId: string, playerId: string, attended: boolean) {
    mutate((d) => ({
      ...d,
      matchPlayers: d.matchPlayers.map((mp) =>
        mp.match_id === matchId && mp.player_id === playerId ? { ...mp, attended } : mp,
      ),
    }))
  },

  /** post-match step 2: optional result, feeds win rate */
  recordResult(matchId: string, playerId: string, result: MatchResult['result']) {
    mutate((d) => ({
      ...d,
      matchResults: [
        ...d.matchResults.filter((r) => !(r.match_id === matchId && r.player_id === playerId)),
        { id: newId('res'), match_id: matchId, player_id: playerId, result },
      ],
    }))
  },

  reportNoShow(matchId: string, reportedPlayer: string) {
    mutate((d) => {
      // unique(match_id, reported_player, reporter_id); no self-report
      if (reportedPlayer === CURRENT_USER_ID) return d
      const dup = d.noShowReports.some(
        (r) => r.match_id === matchId && r.reported_player === reportedPlayer && r.reporter_id === CURRENT_USER_ID,
      )
      if (dup) return d
      return {
        ...d,
        noShowReports: [
          ...d.noShowReports,
          { id: newId('nsr'), match_id: matchId, reported_player: reportedPlayer, reporter_id: CURRENT_USER_ID, created_at: new Date().toISOString() },
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
    mutate((d) => ({
      ...d,
      chatMessages: [
        ...d.chatMessages,
        { id: newId('msg'), thread_id: threadId, sender_id: CURRENT_USER_ID, body: text, created_at: new Date().toISOString() },
      ],
    }))
  },

  postSystemLine(threadId: string, body: string, tone: ChatMessage['tone'] = 'info', icon: ChatMessage['icon'] = 'flag') {
    mutate((d) => ({
      ...d,
      chatMessages: [
        ...d.chatMessages,
        { id: newId('msg'), thread_id: threadId, sender_id: CURRENT_USER_ID, body, created_at: new Date().toISOString(), system: true, tone, icon },
      ],
    }))
  },

  markThreadRead(threadId: string) {
    mutate((d) => ({ ...d, threadReadAt: { ...d.threadReadAt, [threadId]: new Date().toISOString() } }))
  },

  /** open DM (anyone → anyone) — returns the one canonical thread */
  getOrCreateDM(userId: string): string {
    const existing = dmThreadWith(db, userId)
    if (existing) return existing.id
    const id = newId('t-dm')
    mutate((d) => ({
      ...d,
      chatThreads: [...d.chatThreads, { id, match_id: null, participant_ids: [CURRENT_USER_ID, userId], created_at: new Date().toISOString() }],
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

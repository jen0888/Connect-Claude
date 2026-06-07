import { useSyncExternalStore } from 'react'
import type { ChatMessage, ChatThread, Match, MatchPlayer, MatchRequest, MatchResult, NoShowReport, User } from './types'
import { CHAT_MESSAGES, CHAT_THREADS, CURRENT_USER_ID, MATCHES, MATCH_PLAYERS, MATCH_REQUESTS, MATCH_RESULTS, USERS } from './mock/data'
import { computeStatus } from './status'

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

let db: DB = {
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

/* ── mutations (future Supabase inserts / RPCs) ─────────────────────── */

export const actions = {
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
      return {
        ...d,
        matches: d.matches.map((x) => (x.id === matchId ? { ...x, spots_available: x.spots_available + 1 } : x)),
        matchPlayers: d.matchPlayers.filter((mp) => !(mp.match_id === matchId && mp.player_id === CURRENT_USER_ID)),
      }
    })
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

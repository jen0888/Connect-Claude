import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ChatMessage, ChatThread, Gender, Match, MatchPlayer, MatchRequest, MatchResult,
  NoShowReport, SkillLevel, SkillTier, Sport, User,
} from './types'

/**
 * Supabase ⇆ domain mapping. The DB is intentionally Supabase-shaped
 * (snake_case, CLAUDE.md §6), so most rows map 1:1; this module owns the few
 * places they diverge and the one fetch that hydrates the whole in-memory `db`.
 *
 * Read-time `status` stays in the app (`computeStatus`): the DB's lifecycle
 * status (open/full/live/…) is collapsed to the stored shape 'active'|'cancelled'
 * and recomputed on render — so the client is the single source of lifecycle.
 */

/** what `store.ts` overlays onto the in-memory DB after a fetch */
export interface RepoSnapshot {
  users: User[]
  matches: Match[]
  matchPlayers: MatchPlayer[]
  matchRequests: MatchRequest[]
  matchResults: MatchResult[]
  noShowReports: NoShowReport[]
  chatThreads: ChatThread[]
  chatMessages: ChatMessage[]
  /** match ids the signed-in viewer has bookmarked (RLS scopes the table to them) */
  savedMatchIds: string[]
}

const asSport = (s: unknown): Sport =>
  s === 'tennis' || s === 'badminton' || s === 'running' ? s : 'padel'

const asSkill = (s: unknown): SkillLevel => {
  const ok: SkillLevel[] = ['baby', 'beginner', 'low_int', 'int', 'high_int', 'advance', 'pro', 'any']
  return ok.includes(s as SkillLevel) ? (s as SkillLevel) : 'any'
}

/** a match's skill_min/skill_max are concrete tiers (never 'any'); fall back to a
 *  sane single tier for any legacy/partial row */
const asTier = (s: unknown): SkillTier => {
  const ok: SkillTier[] = ['baby', 'beginner', 'low_int', 'int', 'high_int', 'advance', 'pro']
  return ok.includes(s as SkillTier) ? (s as SkillTier) : 'int'
}

// gender is NOT NULL in the schema, but stay defensive against legacy/partial rows
const asGender = (g: unknown): Gender => (g === 'female' ? 'female' : 'male')

/** trust signals not stored on `users` are derived from the fetched relations */
function mapUser(row: any, playedById: Map<string, number>): User {
  return {
    id: row.id,
    name: row.name ?? (row.email?.split('@')[0] ?? 'Player'),
    email: row.email ?? '',
    phone: row.phone ?? null,
    avatar_url: row.avatar_url ?? null,
    sport: asSport(row.sport),
    skill_level: asSkill(row.skill_level),
    gender: asGender(row.gender),
    language: row.language === 'ar' ? 'ar' : 'en',
    dob: row.dob ?? '1990-01-01',
    attendance_rate: Number(row.attendance_rate ?? 100),
    created_at: row.created_at ?? new Date(0).toISOString(),
    matches_played: playedById.get(row.id) ?? 0,
    no_show_count: 0, // RLS scopes no_show_reports to the viewer — not derivable for others
    languages: Array.isArray(row.languages) ? row.languages : [],
    bio: row.bio ?? undefined,
    area: row.area ?? undefined,
    city: row.city ?? undefined,
    verified: row.verified === true,
  }
}

function mapMatch(row: any): Match {
  const fee = (n: unknown) => (Number(n) > 0 ? Number(n) : null)
  return {
    id: row.id,
    host_id: row.host_id,
    sport: asSport(row.sport),
    name: row.name ?? null, // optional host-given title (store flow)
    venue_id: row.venue_id ?? null,
    venue_name: row.venue_name ?? '',
    venue_location: row.venue_location ?? null,
    court_number: row.court_number ?? null,
    route_start: null, // running-route fields aren't modelled in the Stage-1 schema
    route_end: null,
    round_trip: false,
    distance_km: null,
    start_time: row.start_time,
    end_time: row.end_time,
    skill_min: asTier(row.skill_min),
    skill_max: asTier(row.skill_max),
    total_spots: row.total_spots,
    spots_available: row.spots_available,
    fee_total: fee(row.fee_total),
    fee_per_player: fee(row.fee_per_player),
    join_mode: row.join_mode === 'approval' || row.join_mode === 'invite' ? row.join_mode : 'open',
    gender_restriction: row.gender_restriction === 'ladies' ? 'ladies' : 'mixed',
    // DB lifecycle status → stored shape; computeStatus re-derives open/full/live.
    // `closed` (set server-side once results are corroborated) is preserved so
    // the early terminal state survives rehydrate; everything else → 'active'.
    status: row.status === 'cancelled' ? 'cancelled' : row.status === 'closed' ? 'closed' : 'active',
    notes: row.notes ?? null,
    created_at: row.created_at,
  }
}

const mapPlayer = (r: any): MatchPlayer => ({
  id: r.id, match_id: r.match_id, player_id: r.player_id, joined_at: r.joined_at, attended: r.attended ?? null,
})

const mapRequest = (r: any): MatchRequest => ({
  id: r.id, match_id: r.match_id, player_id: r.player_id, kind: r.kind, status: r.status, created_at: r.created_at,
})

const mapResult = (r: any): MatchResult => ({
  id: r.id, match_id: r.match_id, player_id: r.player_id, result: r.result,
})

const mapReport = (r: any): NoShowReport => ({
  id: r.id, match_id: r.match_id, reported_player: r.reported_player, reporter_id: r.reporter_id, created_at: r.created_at,
})

const mapThread = (r: any): ChatThread => ({
  id: r.id, match_id: r.match_id ?? null, participant_ids: r.participant_ids ?? [], created_at: r.created_at,
})

const mapMessage = (r: any): ChatMessage => ({
  id: r.id, thread_id: r.thread_id, sender_id: r.sender_id, body: r.body, created_at: r.created_at,
  ...(r.system ? { system: true, tone: r.tone ?? undefined, icon: r.icon ?? undefined } : {}),
})

/** One round-trip hydrate of every table the store needs. RLS scopes
 *  match_requests / chat_* / no_show_reports to the signed-in viewer
 *  automatically — we just map whatever comes back. */
export async function fetchSnapshot(supabase: SupabaseClient): Promise<RepoSnapshot> {
  const [users, matches, players, requests, results, reports, threads, messages, saved] = await Promise.all([
    supabase.from('users').select('*'),
    supabase.from('matches').select('*'),
    supabase.from('match_players').select('*'),
    supabase.from('match_requests').select('*'),
    supabase.from('match_results').select('*'),
    supabase.from('no_show_reports').select('*'),
    supabase.from('chat_threads').select('*'),
    supabase.from('chat_messages').select('*'),
    supabase.from('saved_matches').select('match_id'), // RLS → only the viewer's saves
  ])

  const firstError = [users, matches, players, requests, results, reports, threads, messages, saved].find((r) => r.error)?.error
  if (firstError) throw firstError

  const playerRows = players.data ?? []
  const playedById = new Map<string, number>()
  for (const mp of playerRows) playedById.set(mp.player_id, (playedById.get(mp.player_id) ?? 0) + 1)

  return {
    users: (users.data ?? []).map((u) => mapUser(u, playedById)),
    matches: (matches.data ?? []).map(mapMatch),
    matchPlayers: playerRows.map(mapPlayer),
    matchRequests: (requests.data ?? []).map(mapRequest),
    matchResults: (results.data ?? []).map(mapResult),
    noShowReports: (reports.data ?? []).map(mapReport),
    chatThreads: (threads.data ?? []).map(mapThread),
    chatMessages: (messages.data ?? []).map(mapMessage),
    savedMatchIds: (saved.data ?? []).map((r) => r.match_id as string),
  }
}

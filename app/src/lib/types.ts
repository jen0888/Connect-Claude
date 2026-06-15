/**
 * Domain types mirroring the Supabase schema (CLAUDE.md §6) so the
 * mock layer can be swapped for real queries without touching screens.
 */

export type Sport = 'padel' | 'tennis' | 'badminton' | 'running'

/** Player gender — Stage 1 is Male/Female only (no third option). Required,
 *  public, display + storage only (no match filtering). Mirrors the `users.gender`
 *  CHECK constraint (CLAUDE.md §6). */
export type Gender = 'male' | 'female'

/** The single ordered skill scale, shared app-wide (matches `skill_min`/`skill_max`,
 *  profile skill, Discover filter, display). Lowest → highest, exactly 7 tiers —
 *  store the value, render the label via `format.skillTierLabel`. */
export const SKILL_TIERS = ['baby', 'beginner', 'low_int', 'int', 'high_int', 'advance', 'pro'] as const
export type SkillTier = (typeof SKILL_TIERS)[number]
/** tier ordinal (0..6) — for range math + the skill_min ≤ skill_max guard */
export function skillOrd(t: SkillTier): number {
  return SKILL_TIERS.indexOf(t)
}
/** true if `tier` falls within the inclusive [min, max] range, by tier order */
export function skillInRange(tier: SkillTier, min: SkillTier, max: SkillTier): boolean {
  return skillOrd(tier) >= skillOrd(min) && skillOrd(tier) <= skillOrd(max)
}
/** a concrete tier, or 'any' (no preference) for the profile/filter context */
export type SkillLevel = SkillTier | 'any'

export type JoinMode = 'open' | 'approval' | 'invite'

/** Stored status — time-based states are computed at read time, never stored. */
export type StoredMatchStatus = 'active' | 'cancelled'

/** Read-time status (CLAUDE.md §5): open → full → live → completed → closed (+ cancelled). */
export type MatchStatus = 'open' | 'full' | 'live' | 'completed' | 'closed' | 'cancelled'

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  avatar_url: string | null
  sport: Sport
  skill_level: SkillLevel
  gender: Gender // required + public; collected at sign-up (questionnaire)
  language: 'en' | 'ar'
  dob: string // ISO date; 18+ enforced at sign-up
  attendance_rate: number // 0–100
  created_at: string
  // public trust signals (computed server-side later)
  matches_played: number
  no_show_count: number
  languages: string[]
  bio?: string
  area?: string
  city?: string // Qatar city (defaults to Doha)
  verified?: boolean // platform-verified — drives the hero badge
}

export interface Match {
  id: string
  host_id: string
  sport: Sport
  name?: string | null // optional host-given title (store flow); null/absent → derive a label
  venue_id: string | null // FK for curated venues
  venue_name: string // display name; used alone for custom venues
  venue_location: string | null
  court_number: string | null // separate optional free-text field
  /** Running matches use route fields instead of venue/court */
  route_start: string | null
  route_end: string | null
  round_trip: boolean
  start_time: string // ISO
  end_time: string // ISO
  /** open-to skill RANGE, by tier order; skill_min === skill_max ⇒ a single level */
  skill_min: SkillTier
  skill_max: SkillTier
  total_spots: number
  spots_available: number
  fee_total: number | null // informational only — never a transaction
  fee_per_player: number | null // display only
  join_mode: JoinMode
  waitlist_open?: boolean // queue allowed once full (default off)
  waitlist_size?: number // max queued players, 1–8 (only meaningful when waitlist_open)
  status: StoredMatchStatus
  notes: string | null
  created_at: string
}

export interface MatchPlayer {
  id: string
  match_id: string
  player_id: string
  joined_at: string
  attended: boolean | null
}

export type RequestKind = 'request' | 'invite' | 'waitlist'
export type RequestStatus =
  | 'requested' // initial — kind 'request'
  | 'invited' // initial — kind 'invite'
  | 'waitlisted' // initial — kind 'waitlist' (FIFO queue on a full match)
  | 'approved'
  | 'accepted'
  | 'promoted' // waitlist slot won — auto, no host approval (§5)
  | 'joined'
  | 'declined'
  | 'left' // player removed themselves from the waitlist
  | 'expired'

/** unique(match_id, player_id, kind) — re-waitlisting after 'left' is an
 *  update of the same row with a fresh created_at (position forfeited). */
export interface MatchRequest {
  id: string
  match_id: string
  player_id: string
  kind: RequestKind // request = player→host · invite = host→player · waitlist = FIFO queue
  status: RequestStatus
  created_at: string
}

export interface NoShowReport {
  id: string
  match_id: string
  reported_player: string
  reporter_id: string
  created_at: string
}

export type MatchResultValue = 'win' | 'loss' | 'draw'

export interface MatchResult {
  id: string
  match_id: string
  player_id: string
  result: MatchResultValue
}

export type VenueSetting = 'Indoor' | 'Outdoor' | 'Rooftop' | 'Indoor + Outdoor'

export interface Venue {
  id: string
  name: string
  area: string
  sports: Sport[]
  setting: VenueSetting
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title_en: string
  title_ar: string
  body_en: string
  body_ar: string
  is_read: boolean
  created_at: string
}

export type SystemTone = 'info' | 'wait' | 'pos' | 'warm' | 'alert'
export type SystemIcon = 'flag' | 'userPlus' | 'userMinus' | 'lock' | 'check' | 'bell' | 'xCircle' | 'trophy' | 'flagFinish'

export interface ChatMessage {
  id: string
  thread_id: string
  sender_id: string
  body: string
  created_at: string
  /** system lines (match created, player joined, result posted…) */
  system?: boolean
  tone?: SystemTone
  icon?: SystemIcon
}

export interface ChatThread {
  id: string
  /** match group thread when set; 1:1 DM or group chat otherwise */
  match_id: string | null
  participant_ids: string[]
  created_at: string
}

/**
 * One renderer, many message types (chat-room §1). A thread's timeline is a
 * single sorted stream of these, dispatched by `kind`:
 *  - text     · a chat bubble
 *  - system   · a centred system line (created / joined / result / promoted…)
 *  - invite   · a host→player match invite, rendered inline in a DM (§5);
 *               actionable for the player, status-only for the host
 *  - decision · a host's inbound join request on their match thread (§7);
 *               approve/decline, then collapses to a follow-up line
 *
 * `invite` / `decision` are DERIVED from the persisted `match_requests` rows
 * (no extra storage) so they stay live + RLS-correct in both modes.
 */
export type TimelineItem =
  | { kind: 'text'; id: string; created_at: string; msg: ChatMessage }
  | { kind: 'system'; id: string; created_at: string; msg: ChatMessage }
  | { kind: 'invite'; id: string; created_at: string; request: MatchRequest; match: Match; host: User; player: User }
  | { kind: 'decision'; id: string; created_at: string; request: MatchRequest; match: Match; player: User }

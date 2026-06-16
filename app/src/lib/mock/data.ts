import type { ChatMessage, ChatThread, Match, MatchPlayer, MatchRequest, MatchResult, User } from '../types'

/** Times are generated relative to "now" so every lifecycle state
 *  (open/full/live/completed/closed) is visible in the running app. */
const H = 60 * 60 * 1000
// snap "now" to the previous half-hour so seeded times read naturally (18:30, not 18:47)
const now = Math.floor(Date.now() / (30 * 60 * 1000)) * (30 * 60 * 1000)
const iso = (offsetHours: number) => new Date(now + offsetHours * H).toISOString()

export const CURRENT_USER_ID = 'u-you'

export const USERS: User[] = [
  {
    id: 'u-you', name: 'Jen S.', email: 'you@example.com', phone: null, avatar_url: null,
    sport: 'padel', skill_level: 'int', gender: 'female', language: 'en', dob: '1995-04-12',
    attendance_rate: 96, created_at: iso(-2000), matches_played: 23, no_show_count: 0,
    languages: ['English', 'Arabic'], area: 'Al Waab', bio: 'Padel three times a week. Always up for a morning run.', city: 'Doha', verified: true,
  },
  {
    id: 'u-marco', name: 'Marco D.', email: 'marco@example.com', phone: null, avatar_url: null,
    sport: 'padel', skill_level: 'int', gender: 'male', language: 'en', dob: '1992-09-03',
    attendance_rate: 98, created_at: iso(-3000), matches_played: 41, no_show_count: 0,
    languages: ['English', 'Italian'], area: 'West Bay', bio: 'Weeknight padel host. Doubles preferred.', city: 'Doha', verified: true,
  },
  {
    id: 'u-jk', name: 'Jana K.', email: 'jana@example.com', phone: null, avatar_url: null,
    sport: 'tennis', skill_level: 'advance', gender: 'female', language: 'en', dob: '1997-01-21',
    attendance_rate: 92, created_at: iso(-2500), matches_played: 35, no_show_count: 1,
    languages: ['English', 'Czech'], area: 'The Pearl', bio: 'Tennis since juniors. Up for hits and drills.', city: 'Doha', verified: true,
  },
  {
    id: 'u-rp', name: 'Rashid P.', email: 'rashid@example.com', phone: null, avatar_url: null,
    sport: 'badminton', skill_level: 'int', gender: 'male', language: 'ar', dob: '1994-06-30',
    attendance_rate: 89, created_at: iso(-1800), matches_played: 18, no_show_count: 1,
    languages: ['Arabic', 'English'], area: 'Ain Khaled', bio: 'Badminton on weekdays, padel on weekends.', city: 'Doha', verified: true,
  },
  {
    id: 'u-lb', name: 'Lina B.', email: 'lina@example.com', phone: null, avatar_url: null,
    sport: 'running', skill_level: 'any', gender: 'female', language: 'en', dob: '1999-11-08',
    attendance_rate: 100, created_at: iso(-900), matches_played: 12, no_show_count: 0,
    languages: ['English', 'French'], area: 'Lusail', bio: 'Easy-pace morning loops. All levels welcome.', city: 'Doha', verified: true,
  },
  {
    id: 'u-st', name: 'Sara T.', email: 'sara@example.com', phone: null, avatar_url: null,
    sport: 'padel', skill_level: 'beginner', gender: 'female', language: 'en', dob: '2000-02-17',
    attendance_rate: 94, created_at: iso(-700), matches_played: 8, no_show_count: 0,
    languages: ['English'], area: 'Al Sadd', city: 'Doha', verified: true,
  },
  {
    id: 'u-nv', name: 'Noor V.', email: 'noor@example.com', phone: null, avatar_url: null,
    sport: 'tennis', skill_level: 'int', gender: 'female', language: 'ar', dob: '1996-08-25',
    attendance_rate: 91, created_at: iso(-1200), matches_played: 27, no_show_count: 2,
    languages: ['Arabic', 'English'], area: 'West Bay', city: 'Doha', verified: true,
  },
  {
    id: 'u-hd', name: 'Hassan D.', email: 'hassan@example.com', phone: null, avatar_url: null,
    sport: 'padel', skill_level: 'advance', gender: 'male', language: 'ar', dob: '1990-12-02',
    attendance_rate: 97, created_at: iso(-2600), matches_played: 52, no_show_count: 0,
    languages: ['Arabic', 'English', 'Urdu'], area: 'Msheireb', city: 'Doha', verified: true,
  },
]

export const MATCHES: Match[] = [
  // NEXT UP — joined, starts in 3h (open: one spot left)
  {
    id: 'm-nextup', host_id: 'u-marco', sport: 'padel',
    venue_id: 'padelin-aspire', venue_name: 'Padel In — Aspire Zone', venue_location: 'Aspire Zone · Al Waab',
    court_number: 'Court 4', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(3), end_time: iso(4), skill_min: 'int', skill_max: 'advance',
    total_spots: 4, spots_available: 1, fee_total: 100, fee_per_player: 25,
    join_mode: 'open', status: 'active', notes: 'Doubles. Bring a can of balls if you have one.', created_at: iso(-48),
  },
  // Hosted by you — Thursday singles, needs one more
  {
    id: 'm-hosted', host_id: 'u-you', sport: 'padel',
    venue_id: 'padelin-aspire', venue_name: 'Padel In — Aspire Zone', venue_location: 'Aspire Zone · Al Waab',
    court_number: 'Court 2', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(65), end_time: iso(66), skill_min: 'int', skill_max: 'int',
    total_spots: 2, spots_available: 1, fee_total: 80, fee_per_player: 40,
    join_mode: 'open', status: 'active', notes: null, created_at: iso(-24),
  },
  // This week — morning run loop (joined)
  {
    id: 'm-run', host_id: 'u-lb', sport: 'running',
    venue_id: null, venue_name: 'Aspire Park', venue_location: 'Aspire Zone · Al Waab',
    court_number: null, route_start: 'Aspire Park main gate', route_end: 'Bayside loop', round_trip: true, distance_km: 6,
    start_time: iso(17), end_time: iso(17.75), skill_min: 'baby', skill_max: 'pro',
    total_spots: 8, spots_available: 3, fee_total: 0, fee_per_player: null,
    join_mode: 'open', status: 'active', notes: 'Easy pace, ~6 km. All levels.', created_at: iso(-72),
  },
  // This week — Saturday open match (joined)
  {
    id: 'm-sat', host_id: 'u-hd', sport: 'padel',
    venue_id: 'doha-oasis', venue_name: 'Doha Oasis Padel', venue_location: 'Msheireb',
    court_number: 'Court 1', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(113), end_time: iso(114.5), skill_min: 'baby', skill_max: 'pro',
    total_spots: 4, spots_available: 2, fee_total: 120, fee_per_player: 30,
    join_mode: 'approval', status: 'active', notes: null, created_at: iso(-30),
  },
  // Discover — Sunday tennis (not joined, approval)
  {
    id: 'm-tennis', host_id: 'u-jk', sport: 'tennis',
    venue_id: 'westbay-tennis', venue_name: 'West Bay Tennis Club', venue_location: 'West Bay',
    court_number: 'Court A', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(143), end_time: iso(144), skill_min: 'advance', skill_max: 'advance',
    total_spots: 2, spots_available: 1, fee_total: 80, fee_per_player: 40,
    join_mode: 'approval', gender_restriction: 'ladies', status: 'active', notes: 'Hit + drills, one set after.', created_at: iso(-20),
  },
  // Discover — badminton tonight (open)
  {
    id: 'm-badminton', host_id: 'u-rp', sport: 'badminton',
    venue_id: 'dynamic', venue_name: 'Dynamic Sports Academy', venue_location: 'Ain Khaled',
    court_number: 'Hall 2', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(6), end_time: iso(7), skill_min: 'int', skill_max: 'int',
    total_spots: 4, spots_available: 2, fee_total: 60, fee_per_player: 15,
    join_mode: 'open', status: 'active', notes: null, created_at: iso(-10),
  },
  // JUST PLAYED — ended 2h ago, inside 24h post-match window (you played)
  {
    id: 'm-justplayed', host_id: 'u-you', sport: 'padel',
    venue_id: 'padel91', venue_name: 'Padel 91 West Walk', venue_location: 'West Walk · Al Waab',
    court_number: 'Court 3', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(-3), end_time: iso(-2), skill_min: 'int', skill_max: 'int',
    total_spots: 4, spots_available: 0, fee_total: 100, fee_per_player: 25,
    join_mode: 'open', status: 'active', notes: null, created_at: iso(-96),
  },
  // LIVE now — lifecycle visibility on Home/My Matches. Deliberately NOT in
  // Discover: joining is locked and chat is members-only (see discoverMatches).
  {
    id: 'm-live', host_id: 'u-nv', sport: 'tennis',
    venue_id: 'khalifa', venue_name: 'Khalifa Int’l Tennis Complex', venue_location: 'West Bay · Al Dafna',
    court_number: 'Court 6', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(-0.5), end_time: iso(0.75), skill_min: 'int', skill_max: 'int',
    total_spots: 4, spots_available: 0, fee_total: 0, fee_per_player: null,
    join_mode: 'open', status: 'active', notes: null, created_at: iso(-50),
  },
  // FULL — open mode; the canonical "Join waitlist" card (waitlist demo, §5)
  {
    id: 'm-full-padel', host_id: 'u-hd', sport: 'padel',
    venue_id: 'the-dome', venue_name: 'The Dome — Education City Golf', venue_location: 'Education City · Al Rayyan',
    court_number: 'Court 1', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(28), end_time: iso(29.5), skill_min: 'int', skill_max: 'int',
    total_spots: 4, spots_available: 0, fee_total: 100, fee_per_player: 25,
    join_mode: 'open', status: 'active', notes: 'Locked in — waitlist open if someone drops.', created_at: iso(-60),
  },
  // FULL — approval mode singles; waitlist is orthogonal to join_mode (§5)
  {
    id: 'm-full-tennis', host_id: 'u-jk', sport: 'tennis',
    venue_id: 'khalifa', venue_name: 'Khalifa Int’l Tennis Complex', venue_location: 'West Bay · Al Dafna',
    court_number: 'Court 2', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(37), end_time: iso(38), skill_min: 'advance', skill_max: 'advance',
    total_spots: 2, spots_available: 0, fee_total: 70, fee_per_player: 35,
    join_mode: 'approval', status: 'active', notes: null, created_at: iso(-55),
  },
  // free open badminton tonight — beginner, instant Join
  {
    id: 'm-bad-beg', host_id: 'u-rp', sport: 'badminton',
    venue_id: 'accelerate', venue_name: 'Accelerate Sports', venue_location: 'Doha',
    court_number: 'Court 5', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(9), end_time: iso(10), skill_min: 'beginner', skill_max: 'beginner',
    total_spots: 4, spots_available: 2, fee_total: 0, fee_per_player: null,
    join_mode: 'open', status: 'active', notes: 'Casual rallies, rackets to borrow.', created_at: iso(-15),
  },
  // invite-only tennis — card CTA reads "Invite only", never Join
  {
    id: 'm-invite-tennis', host_id: 'u-nv', sport: 'tennis',
    venue_id: 'al-dana', venue_name: 'Al Dana Club — Indoor Tennis', venue_location: 'Doha',
    court_number: 'Court 2', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(52), end_time: iso(53), skill_min: 'int', skill_max: 'int',
    total_spots: 4, spots_available: 2, fee_total: 120, fee_per_player: 30,
    join_mode: 'invite', status: 'active', notes: 'Regulars group — ask Noor for an invite.', created_at: iso(-22),
  },
  // custom venue (venue_id null, free-text venue_name) — approval, free
  {
    id: 'm-custom-padel', host_id: 'u-st', sport: 'padel',
    venue_id: null, venue_name: 'Barwa Madinatna community court', venue_location: 'Al Wakrah Road',
    court_number: null, route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(76), end_time: iso(77), skill_min: 'beginner', skill_max: 'beginner',
    total_spots: 4, spots_available: 3, fee_total: 0, fee_per_player: null,
    join_mode: 'approval', status: 'active', notes: 'Compound court, friendly beginners game.', created_at: iso(-18),
  },
  // second run — custom route, beginner, free
  {
    id: 'm-run-corniche', host_id: 'u-lb', sport: 'running',
    venue_id: null, venue_name: 'Doha Corniche', venue_location: 'Corniche · Al Dafna',
    court_number: null, route_start: 'Sheraton Park gate', route_end: 'MIA Park', round_trip: false, distance_km: 5,
    start_time: iso(25), end_time: iso(25.75), skill_min: 'beginner', skill_max: 'beginner',
    total_spots: 10, spots_available: 6, fee_total: 0, fee_per_player: null,
    join_mode: 'open', status: 'active', notes: 'Sunrise 5K along the water. Walk breaks fine.', created_at: iso(-36),
  },
  // CLOSED — played last week (Past tab, won)
  {
    id: 'm-past-won', host_id: 'u-marco', sport: 'padel',
    venue_id: 'padelin-cc', venue_name: 'Padel In — City Center Doha', venue_location: 'West Bay · Al Dafna',
    court_number: 'Court 1', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(-170), end_time: iso(-169), skill_min: 'int', skill_max: 'int',
    total_spots: 4, spots_available: 0, fee_total: 100, fee_per_player: 25,
    join_mode: 'open', status: 'active', notes: null, created_at: iso(-250),
  },
  // CANCELLED — was tomorrow
  {
    id: 'm-cancelled', host_id: 'u-st', sport: 'padel',
    venue_id: 'padel-garden', venue_name: 'Padel Garden — Katara Hills', venue_location: 'Katara',
    court_number: 'Court 2', route_start: null, route_end: null, round_trip: false, distance_km: null,
    start_time: iso(26), end_time: iso(27), skill_min: 'beginner', skill_max: 'beginner',
    total_spots: 4, spots_available: 1, fee_total: 80, fee_per_player: 20,
    join_mode: 'open', status: 'cancelled', notes: null, created_at: iso(-40),
  },
]

export const MATCH_PLAYERS: MatchPlayer[] = [
  { id: 'mp-1', match_id: 'm-nextup', player_id: 'u-marco', joined_at: iso(-48), attended: null },
  { id: 'mp-2', match_id: 'm-nextup', player_id: 'u-you', joined_at: iso(-40), attended: null },
  { id: 'mp-3', match_id: 'm-nextup', player_id: 'u-jk', joined_at: iso(-30), attended: null },
  { id: 'mp-4', match_id: 'm-hosted', player_id: 'u-you', joined_at: iso(-24), attended: null },
  { id: 'mp-5', match_id: 'm-run', player_id: 'u-lb', joined_at: iso(-72), attended: null },
  { id: 'mp-6', match_id: 'm-run', player_id: 'u-you', joined_at: iso(-60), attended: null },
  { id: 'mp-7', match_id: 'm-run', player_id: 'u-st', joined_at: iso(-55), attended: null },
  { id: 'mp-8', match_id: 'm-run', player_id: 'u-rp', joined_at: iso(-44), attended: null },
  { id: 'mp-9', match_id: 'm-run', player_id: 'u-hd', joined_at: iso(-12), attended: null },
  { id: 'mp-10', match_id: 'm-sat', player_id: 'u-hd', joined_at: iso(-30), attended: null },
  { id: 'mp-11', match_id: 'm-sat', player_id: 'u-you', joined_at: iso(-28), attended: null },
  { id: 'mp-12', match_id: 'm-tennis', player_id: 'u-jk', joined_at: iso(-20), attended: null },
  { id: 'mp-13', match_id: 'm-badminton', player_id: 'u-rp', joined_at: iso(-10), attended: null },
  { id: 'mp-14', match_id: 'm-badminton', player_id: 'u-nv', joined_at: iso(-8), attended: null },
  { id: 'mp-15', match_id: 'm-justplayed', player_id: 'u-you', joined_at: iso(-96), attended: true },
  { id: 'mp-16', match_id: 'm-justplayed', player_id: 'u-marco', joined_at: iso(-90), attended: true },
  { id: 'mp-17', match_id: 'm-justplayed', player_id: 'u-st', joined_at: iso(-80), attended: true },
  { id: 'mp-18', match_id: 'm-justplayed', player_id: 'u-hd', joined_at: iso(-70), attended: null },
  { id: 'mp-19', match_id: 'm-past-won', player_id: 'u-you', joined_at: iso(-250), attended: true },
  { id: 'mp-20', match_id: 'm-past-won', player_id: 'u-marco', joined_at: iso(-240), attended: true },
  { id: 'mp-21', match_id: 'm-past-won', player_id: 'u-jk', joined_at: iso(-230), attended: true },
  { id: 'mp-22', match_id: 'm-past-won', player_id: 'u-nv', joined_at: iso(-220), attended: true },
  { id: 'mp-23', match_id: 'm-live', player_id: 'u-nv', joined_at: iso(-50), attended: null },
  { id: 'mp-24', match_id: 'm-live', player_id: 'u-hd', joined_at: iso(-48), attended: null },
  // m-full-padel — full roster 4/4 (spots_available 0)
  { id: 'mp-25', match_id: 'm-full-padel', player_id: 'u-hd', joined_at: iso(-60), attended: null },
  { id: 'mp-26', match_id: 'm-full-padel', player_id: 'u-marco', joined_at: iso(-54), attended: null },
  { id: 'mp-27', match_id: 'm-full-padel', player_id: 'u-nv', joined_at: iso(-46), attended: null },
  { id: 'mp-28', match_id: 'm-full-padel', player_id: 'u-jk', joined_at: iso(-33), attended: null },
  // m-full-tennis — full singles 2/2
  { id: 'mp-29', match_id: 'm-full-tennis', player_id: 'u-jk', joined_at: iso(-55), attended: null },
  { id: 'mp-30', match_id: 'm-full-tennis', player_id: 'u-nv', joined_at: iso(-41), attended: null },
  // m-bad-beg — 2/4
  { id: 'mp-31', match_id: 'm-bad-beg', player_id: 'u-rp', joined_at: iso(-15), attended: null },
  { id: 'mp-32', match_id: 'm-bad-beg', player_id: 'u-st', joined_at: iso(-11), attended: null },
  // m-invite-tennis — 2/4
  { id: 'mp-33', match_id: 'm-invite-tennis', player_id: 'u-nv', joined_at: iso(-22), attended: null },
  { id: 'mp-34', match_id: 'm-invite-tennis', player_id: 'u-jk', joined_at: iso(-16), attended: null },
  // m-custom-padel — 1/4
  { id: 'mp-35', match_id: 'm-custom-padel', player_id: 'u-st', joined_at: iso(-18), attended: null },
  // m-run-corniche — 4/10
  { id: 'mp-36', match_id: 'm-run-corniche', player_id: 'u-lb', joined_at: iso(-36), attended: null },
  { id: 'mp-37', match_id: 'm-run-corniche', player_id: 'u-st', joined_at: iso(-29), attended: null },
  { id: 'mp-38', match_id: 'm-run-corniche', player_id: 'u-marco', joined_at: iso(-20), attended: null },
  { id: 'mp-39', match_id: 'm-run-corniche', player_id: 'u-rp', joined_at: iso(-9), attended: null },
]

export const MATCH_REQUESTS: MatchRequest[] = [
  // pending request → your hosted match (approval surface)
  { id: 'mr-1', match_id: 'm-hosted', player_id: 'u-st', kind: 'request', status: 'requested', created_at: iso(-2) },
  // your pending request → Saturday approval match (already approved+joined above? no — m-sat you joined; use tennis instead)
  { id: 'mr-2', match_id: 'm-tennis', player_id: 'u-you', kind: 'request', status: 'requested', created_at: iso(-5) },
  // invite to you from Hassan's circle (expired example)
  { id: 'mr-3', match_id: 'm-cancelled', player_id: 'u-you', kind: 'invite', status: 'expired', created_at: iso(-40) },
  // FIFO waitlist head on the full padel match — waitlisting after this lands at #2
  { id: 'mr-4', match_id: 'm-full-padel', player_id: 'u-lb', kind: 'waitlist', status: 'waitlisted', created_at: iso(-6) },
  // live invite → you, from Noor's invite-only tennis (surfaces on Home + Chat; accept/decline in Match Details)
  { id: 'mr-5', match_id: 'm-invite-tennis', player_id: 'u-you', kind: 'invite', status: 'invited', created_at: iso(-3) },
]

export const MATCH_RESULTS: MatchResult[] = [
  { id: 'res-1', match_id: 'm-past-won', player_id: 'u-you', result: 'win' },
  { id: 'res-2', match_id: 'm-past-won', player_id: 'u-marco', result: 'win' },
]

/** one canonical group thread per joined match + 1:1 DMs (CLAUDE.md §5) */
export const CHAT_THREADS: ChatThread[] = [
  { id: 't-nextup', match_id: 'm-nextup', participant_ids: ['u-marco', 'u-you', 'u-jk'], created_at: iso(-48) },
  { id: 't-run', match_id: 'm-run', participant_ids: ['u-lb', 'u-you', 'u-st', 'u-rp', 'u-hd'], created_at: iso(-72) },
  { id: 't-sat', match_id: 'm-sat', participant_ids: ['u-hd', 'u-you'], created_at: iso(-30) },
  { id: 't-justplayed', match_id: 'm-justplayed', participant_ids: ['u-you', 'u-marco', 'u-st', 'u-hd'], created_at: iso(-96) },
  { id: 't-hosted', match_id: 'm-hosted', participant_ids: ['u-you'], created_at: iso(-24) },
  // invite-only tennis — host + already-joined regulars; you're added only when
  // you accept the invite (mr-5), never while it's pending (no chat before
  // joining, §5)
  { id: 't-invite-tennis', match_id: 'm-invite-tennis', participant_ids: ['u-nv', 'u-jk'], created_at: iso(-22) },
  { id: 't-dm-marco', match_id: null, participant_ids: ['u-you', 'u-marco'], created_at: iso(-200) },
  { id: 't-dm-sara', match_id: null, participant_ids: ['u-you', 'u-st'], created_at: iso(-150) },
]

export const CHAT_MESSAGES: ChatMessage[] = [
  // ── next-up match thread (filling) ──
  { id: 'msg-1', thread_id: 't-nextup', sender_id: 'u-marco', body: 'Marco created this match', created_at: iso(-48), system: true, tone: 'info', icon: 'flag' },
  { id: 'msg-2', thread_id: 't-nextup', sender_id: 'u-marco', body: "Court 4's booked — jump in and say hi.", created_at: iso(-47.9) },
  { id: 'msg-3', thread_id: 't-nextup', sender_id: 'u-you', body: 'You joined', created_at: iso(-40), system: true, tone: 'info', icon: 'userPlus' },
  { id: 'msg-4', thread_id: 't-nextup', sender_id: 'u-you', body: "In! Been wanting to play Court 4 for ages.", created_at: iso(-39.8) },
  { id: 'msg-5', thread_id: 't-nextup', sender_id: 'u-jk', body: 'Jana joined', created_at: iso(-30), system: true, tone: 'info', icon: 'userPlus' },
  { id: 'msg-6', thread_id: 't-nextup', sender_id: 'u-jk', body: 'Hi all — first time at Aspire, looking forward to it.', created_at: iso(-29.9) },
  { id: 'msg-7', thread_id: 't-nextup', sender_id: 'u-marco', body: "One spot left — tell your friends. I'll grab the spare balls.", created_at: iso(-5) },

  // ── run thread ──
  { id: 'msg-r1', thread_id: 't-run', sender_id: 'u-lb', body: 'Lina created this match', created_at: iso(-72), system: true, tone: 'info', icon: 'flag' },
  { id: 'msg-r2', thread_id: 't-run', sender_id: 'u-lb', body: 'Easy pace loop tomorrow morning — regroup at the bridge.', created_at: iso(-71.9) },
  { id: 'msg-r3', thread_id: 't-run', sender_id: 'u-hd', body: 'Hassan joined', created_at: iso(-12), system: true, tone: 'info', icon: 'userPlus' },
  { id: 'msg-r4', thread_id: 't-run', sender_id: 'u-rp', body: 'Could we push the start to 7:15?', created_at: iso(-4) },

  // ── just-played thread (completed, result pending) ──
  { id: 'msg-j1', thread_id: 't-justplayed', sender_id: 'u-you', body: 'Match was full — all 4 players in', created_at: iso(-90), system: true, tone: 'pos', icon: 'lock' },
  { id: 'msg-j2', thread_id: 't-justplayed', sender_id: 'u-marco', body: 'See you all there.', created_at: iso(-26) },
  { id: 'msg-j3', thread_id: 't-justplayed', sender_id: 'u-you', body: 'Match ended', created_at: iso(-2), system: true, tone: 'info', icon: 'flagFinish' },
  { id: 'msg-j4', thread_id: 't-justplayed', sender_id: 'u-marco', body: "Good games — shame Hassan couldn't make it.", created_at: iso(-1.8) },
  { id: 'msg-j5', thread_id: 't-justplayed', sender_id: 'u-you', body: 'How did it go? Record the result up top', created_at: iso(-1.7), system: true, tone: 'warm', icon: 'trophy' },
  { id: 'msg-j6', thread_id: 't-justplayed', sender_id: 'u-st', body: 'Well played you two. Rematch next week?', created_at: iso(-1.5) },

  // ── hosted thread (created, just you) ──
  { id: 'msg-h1', thread_id: 't-hosted', sender_id: 'u-you', body: 'You created this match', created_at: iso(-24), system: true, tone: 'info', icon: 'flag' },
  { id: 'msg-h2', thread_id: 't-hosted', sender_id: 'u-you', body: "Court 2's booked for Thursday — jump in and say hi.", created_at: iso(-23.9) },

  // ── invite-only tennis thread (host + regulars, awaiting your reply) ──
  { id: 'msg-iv1', thread_id: 't-invite-tennis', sender_id: 'u-nv', body: 'Noor created this match', created_at: iso(-22), system: true, tone: 'info', icon: 'flag' },
  { id: 'msg-iv2', thread_id: 't-invite-tennis', sender_id: 'u-nv', body: 'Regulars night at Al Dana — invited a couple of you. Accept and hop in!', created_at: iso(-21.9) },
  { id: 'msg-iv3', thread_id: 't-invite-tennis', sender_id: 'u-jk', body: 'Jana joined', created_at: iso(-16), system: true, tone: 'info', icon: 'userPlus' },

  // ── DMs ──
  { id: 'msg-d1', thread_id: 't-dm-marco', sender_id: 'u-marco', body: 'Good game yesterday. Up for a rematch Thursday?', created_at: iso(-7) },
  { id: 'msg-d2', thread_id: 't-dm-sara', sender_id: 'u-st', body: 'Thanks for hosting — that was a fun session.', created_at: iso(-26) },
  { id: 'msg-d3', thread_id: 't-dm-sara', sender_id: 'u-you', body: 'Any time! You should join Saturday at Oasis.', created_at: iso(-25) },
]

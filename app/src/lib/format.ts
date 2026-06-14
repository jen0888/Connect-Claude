import type { Match, User } from './types'

/** Time/date display helpers — Western numerals in both languages,
 *  numbers stay LTR (CLAUDE.md §3/§7). */

export function hm(isoTime: string): string {
  const d = new Date(isoTime)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function timeRange(m: Pick<Match, 'start_time' | 'end_time'>): string {
  return `${hm(m.start_time)}–${hm(m.end_time)}`
}

/** "9:5" / "19:00" -> "19:00" — normalise an "HH:mm" string to zero-padded
 *  24-hour clock (no AM/PM anywhere in the UI). Times are stored 24h already;
 *  this is the single helper every time display routes through. */
export function to24h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** "Today" / "Tomorrow" / "Thu" — short bucket label used on cards */
export function whenLabel(isoTime: string, now: Date = new Date()): string {
  const d = new Date(isoTime)
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((startOfDay(d) - startOfDay(now)) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'
  return DAY_NAMES[d.getDay()]
}

/** "Thu 23" — day + date */
export function dayLabel(isoTime: string): string {
  const d = new Date(isoTime)
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()}`
}

/** hours until start, rounded — for "Next up · in 3h" */
export function hoursUntil(isoTime: string, now: Date = new Date()): number {
  return Math.max(0, Math.round((new Date(isoTime).getTime() - now.getTime()) / 3600000))
}

/** Countdown suffix for "Next up · in {…}": days when a day or more out,
 *  otherwise hours (e.g. "3d", "5h"); "soon" inside the final hour. */
export function countdownUntil(isoTime: string, now: Date = new Date()): string {
  const hours = hoursUntil(isoTime, now)
  if (hours >= 24) return `${Math.round(hours / 24)}d`
  if (hours < 1) return 'soon'
  return `${hours}h`
}

/** "Tuesday · May 21" — Home greeting date line */
export function greetingDate(now: Date = new Date()): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`
}

/** "2h ago" / "3d ago" — relative timestamp for request/save labels */
export function timeAgoLabel(isoTime: string, now: Date = new Date()): string {
  const ms = now.getTime() - new Date(isoTime).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** Card display kind — serif title reads "{kind} at {courtLabel}".
 *  Display-only; derived, never stored (schema §6 has no kind column). */
export function matchKind(m: Match): string {
  if (m.sport === 'running') return m.round_trip ? 'Group loop' : 'Group run'
  if (m.total_spots === 2) return 'Singles'
  if (m.total_spots === 4) return 'Doubles'
  return 'Open match'
}

/** Render a court value as "Court N". The stored value may be a bare number
 *  ("4", typed in the picker) or already contain a word ("Court 4", "Hall 2",
 *  "Court A" from seed data) — only prefix "Court " when it's a bare number so
 *  we never produce "Court Court 4". */
export function courtNumberLabel(court: string | null | undefined): string | null {
  if (!court) return null
  const v = court.trim()
  if (!v) return null
  return /^\d+$/.test(v) ? `Court ${v}` : v
}

/** The "at {x}" part of the card title: court # for court sports, route for runs */
export function courtLabel(m: Match): string {
  return courtNumberLabel(m.court_number) ?? m.route_end ?? m.venue_name
}

/** Art variant for the card header illustration */
export function artType(m: Pick<Match, 'sport'>): 'padel' | 'tennis' | 'run' {
  if (m.sport === 'running') return 'run'
  if (m.sport === 'tennis') return 'tennis'
  return 'padel'
}

export function sportLabel(sport: Match['sport']): string {
  return sport.charAt(0).toUpperCase() + sport.slice(1)
}

/** display label for the 7-step skill ladder (snake_case values) */
export function skillLabel(level: User['skill_level']): string {
  const labels: Record<User['skill_level'], string> = {
    baby_beginner: 'Baby Beginner',
    beginner: 'Beginner',
    low_intermediate: 'Low Intermediate',
    intermediate: 'Intermediate',
    high_intermediate: 'High Intermediate',
    advanced: 'Advanced',
    pro: 'Pro',
    any: 'Any level',
  }
  return labels[level]
}

/** A match's open-to skill as a readable BAND ("Beginner → Low int."), not a
 *  single point. The store collapses the create form's min→max slider into one
 *  coarse `skill_level` (levelRange in CreateMatchScreen), so we expand each
 *  coarse value back to the band it represents for display on the MatchCard. */
export function skillRangeLabel(level: Match['skill_level']): string {
  const ranges: Record<Match['skill_level'], string> = {
    any: 'All levels',
    baby_beginner: 'Baby → Beginner',
    beginner: 'Beginner → Low int.',
    low_intermediate: 'Low → Intermediate',
    intermediate: 'Low int. → High int.',
    high_intermediate: 'Intermediate → Advanced',
    advanced: 'Advanced → Pro',
    pro: 'Pro level',
  }
  return ranges[level]
}

export function initials(user: Pick<User, 'name'>): string {
  const parts = user.name.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

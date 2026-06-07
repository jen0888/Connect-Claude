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

/** The "at {x}" part of the card title: court # for court sports, route for runs */
export function courtLabel(m: Match): string {
  return m.court_number ?? m.route_end ?? m.venue_name
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

export function initials(user: Pick<User, 'name'>): string {
  const parts = user.name.split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

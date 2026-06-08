/** Shared date/time helpers for the match create/edit forms — kept in one
 *  place so both create flows (store-backed CreateMatchScreen and the demo
 *  EditMatchScreen) format and parse times identically. 24h throughout. */

export const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** local yyyy-mm-dd key (avoids the UTC shift of toISOString) */
export const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** "2024-05-23" -> "Thu · May 23" (any month, not hardcoded) */
export function labelFromKey(key: string): string {
  const [y, mo, da] = key.split('-').map(Number)
  if (!y || !mo || !da) return ''
  return `${WD[new Date(y, mo - 1, da).getDay()]} · ${MO[mo - 1]} ${da}`
}

/** add minutes to an "HH:mm" string, wrapping within a day */
export const addMinutes = (hhmm: string, mins: number) => {
  const [h, mn] = hhmm.split(':').map(Number)
  const total = (((h * 60 + mn + mins) % 1440) + 1440) % 1440
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** minutes from a -> b ("HH:mm"), wrapping within a day */
export const diffMinutes = (a: string, b: string) => {
  const [ah, am] = a.split(':').map(Number)
  const [bh, bm] = b.split(':').map(Number)
  return (((bh * 60 + bm - ah * 60 - am) % 1440) + 1440) % 1440
}

/** Parse free-typed time ("1830", "18:30", "7:5", "9") into a valid 24h
 *  "HH:MM"; falls back to the previous value if it can't be read. */
export function normalizeTime(input: string, fallback: string): string {
  const s = input.trim()
  if (!s) return fallback
  let h: number, m: number
  if (s.includes(':')) {
    const [hp, mp] = s.split(':')
    h = parseInt(hp.replace(/\D/g, ''), 10)
    m = parseInt((mp ?? '').replace(/\D/g, ''), 10)
  } else {
    const d = s.replace(/\D/g, '')
    h = parseInt(d.length <= 2 ? d : d.slice(0, -2), 10)
    m = d.length <= 2 ? 0 : parseInt(d.slice(-2), 10)
  }
  if (isNaN(h)) return fallback
  if (isNaN(m)) m = 0
  h = Math.min(23, Math.max(0, h))
  m = Math.min(59, Math.max(0, m))
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

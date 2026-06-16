import type { Sport } from './types'

/** Cover photos live in /public/sports/<sport>/<variant>/<idx>.jpg.
 *  Only sports with a non-zero count have art; the rest fall back to the
 *  SVG SportArt header (matchImage returns null → caller skips the <img>). */
const SPORT_IMAGE_COUNT: Record<Sport, number> = {
  padel: 0,
  tennis: 7,
  badminton: 0,
  running: 0,
}

/** How many cover photos a sport has (0 ⇒ no art, use the SVG SportArt). */
export function sportImageCount(sport: Sport): number {
  return SPORT_IMAGE_COUNT[sport] ?? 0
}

/** Build the path to a specific cover image. `index` is normalised into range,
 *  so callers can pass any integer (e.g. a feed position) without bounds math. */
export function matchImagePath(sport: Sport, index: number, variant: 'full' | 'brief'): string | null {
  const count = sportImageCount(sport)
  if (count === 0) return null
  const idx = ((Math.trunc(index) % count) + count) % count
  return `/sports/${sport}/${variant}/${idx}.jpg`
}

/** Stable, deterministic string hash (djb2). Same matchId → same image every
 *  render/reload, so a match keeps its cover photo. */
function hashString(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

/** Resolve a match's cover image path for the given card variant, or null when
 *  the sport has no art (count 0) so the caller renders the SVG art instead.
 *  Default index = hash(matchId) % count (stable per match). Pass an explicit
 *  `index` to override — e.g. a list assigns distinct positions so a feed never
 *  shows the same photo twice (see DiscoverScreen). */
export function matchImage(
  sport: Sport,
  matchId: string,
  variant: 'full' | 'brief',
  index?: number,
): string | null {
  if (sportImageCount(sport) === 0) return null
  return matchImagePath(sport, index ?? hashString(matchId), variant)
}

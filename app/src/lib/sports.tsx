import type { Sport } from './types'

/** Single source of truth for the per-sport emoji glyph, reused on every
 *  surface (create/edit forms, profile sports list) so the same sport always
 *  reads the same way. Padel uses the solid-paddle 🏓 to stay distinct from
 *  tennis 🎾. Pair with `sportLabel` for the text. */
export const SPORT_EMOJI: Record<Sport, string> = {
  padel: '🏓',
  tennis: '🎾',
  badminton: '🏸',
  running: '🏃',
}

export const sportEmoji = (sport: Sport): string => SPORT_EMOJI[sport]

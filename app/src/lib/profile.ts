import type { SkillLevel, Sport } from './types'

/**
 * Player profile sports & self-rated levels (Edit Profile → SportsLevelSection).
 * Players can play several sports, each at its own level. The store `User`
 * schema only carries a single sport/skill_level (the *primary*, see the
 * mappers below) so the rest of the app stays single-sport; the full list is
 * persisted here so the editor rehydrates with everything the player added.
 * UI-only for now — becomes a `player_sports` table when Supabase lands.
 */

export const SKILL_RATINGS = ['Casual', 'Beginner', 'Intermediate', 'Advanced'] as const
export type SkillRating = (typeof SKILL_RATINGS)[number]

export interface SportLevel {
  sport: Sport
  level: SkillRating
}

const STORAGE_KEY = 'connect.profileSports'

export function readProfileSports(): SportLevel[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as SportLevel[]) : null
    return parsed && parsed.length ? parsed : null
  } catch {
    return null
  }
}

export function writeProfileSports(list: SportLevel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* storage unavailable (private mode) — list stays in-memory only */
  }
}

/** Clear on fresh sign-up so a brand-new account doesn't inherit prior sports. */
export function clearProfileSports(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage unavailable — nothing persisted to clear */
  }
}

/** Collapse the stored 7-step ladder onto the 4 self-rated profile levels. */
export function skillLevelToRating(level: SkillLevel): SkillRating {
  switch (level) {
    case 'baby_beginner':
    case 'any':
      return 'Casual'
    case 'beginner':
      return 'Beginner'
    case 'advanced':
    case 'pro':
      return 'Advanced'
    default:
      return 'Intermediate'
  }
}

/** Map a self-rated profile level back onto the schema's single skill_level. */
export function ratingToSkillLevel(rating: SkillRating): SkillLevel {
  switch (rating) {
    case 'Casual':
      return 'baby_beginner'
    case 'Beginner':
      return 'beginner'
    case 'Advanced':
      return 'advanced'
    default:
      return 'intermediate'
  }
}

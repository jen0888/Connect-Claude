import type { SkillLevel, Sport } from './types'

/**
 * Sign-up questionnaire answers — persisted to localStorage on every write
 * (the web stand-in for AsyncStorage) so each step is reversible AND answers
 * survive a reload mid-questionnaire; screens hydrate from here on mount.
 * UI-only for now; becomes the `users` profile insert when Supabase auth lands.
 */
/** player levels = the full ladder minus the match-only 'any' */
export type OnboardingSkill = Exclude<SkillLevel, 'any'>

export interface OnboardingAnswers {
  /** display name captured on the Sign Up screen (Create account) */
  name: string | null
  /** month is 0-based (JS Date convention) */
  dob: { year: number; month: number; day: number } | null
  sport: Sport | null
  skill: OnboardingSkill | null
  /** Community Guidelines agreement — required to reach "All set" */
  agreedGuidelines: boolean
  /** single master notifications opt-in — opt-in, never blocking */
  notifications: boolean
}

const STORAGE_KEY = 'connect.onboarding'

const DEFAULTS: OnboardingAnswers = {
  name: null,
  dob: null,
  sport: null,
  skill: null,
  agreedGuidelines: false,
  notifications: false,
}

function load(): OnboardingAnswers {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

/** every `onboarding.x = y` write persists immediately — call sites stay plain assignments */
export const onboarding: OnboardingAnswers = new Proxy(load(), {
  set(target, prop, value) {
    Reflect.set(target, prop, value)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(target))
    } catch {
      /* storage unavailable (private mode) — answers stay in-memory */
    }
    return true
  },
})

/** Wipe saved answers so a *new* sign-up starts the questionnaire blank — every
 *  step renders with nothing pre-selected. Mutates the shared proxy in place
 *  (each write persists), so it never replaces the singleton screens read.
 *  Mid-questionnaire Back/Next still hydrates from here; only a fresh sign-up
 *  resets it (CLAUDE.md §3). */
export function resetOnboarding() {
  onboarding.name = null
  onboarding.dob = null
  onboarding.sport = null
  onboarding.skill = null
  onboarding.agreedGuidelines = false
  onboarding.notifications = false
}

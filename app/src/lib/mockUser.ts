import type { User } from './types'

/**
 * Single mock signed-in user for local development.
 * Mirrors the Supabase `users` schema (CLAUDE.md §6) in snake_case — reusing
 * the shared `User` type from ./types so it can be swapped for a real query
 * without touching screens. Public trust signals (matches_played,
 * attendance_rate, no_show_count, languages) are always exposed: profiles are
 * public by default (§5).
 */
export const mockUser: User = {
  id: 'Jen0888',
  name: 'Jen',
  email: 'Jen@connectgcc.com',
  phone: null,
  avatar_url: null,
  sport: 'padel',
  skill_level: 'intermediate',
  language: 'en',
  dob: '1995-04-12', // 18+ enforced at sign-up
  attendance_rate: 96,
  created_at: new Date('2026-01-12T08:30:00.000Z').toISOString(),
  matches_played: 23,
  no_show_count: 0,
  languages: ['English', 'Arabic'],
  area: 'Al Waab',
  city: 'Doha',
  bio: 'Padel three times a week. Always up for a morning run.',
  verified: true,
}

export default mockUser

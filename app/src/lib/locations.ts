/**
 * Qatar city → areas, for the Edit Profile location picker (CLAUDE.md §6
 * users.city/area). Doha-first (the Stage-1 focus, §1) with the curated
 * neighbourhoods used across the seeded venues/users, plus the other
 * municipalities a player might live in. UI-only reference data.
 */
export const QATAR_CITIES = [
  'Doha',
  'Al Rayyan',
  'Lusail',
  'Al Wakrah',
  'Al Khor',
  'Umm Salal',
  'Al Daayen',
] as const

export type QatarCity = (typeof QATAR_CITIES)[number]

export const AREAS_BY_CITY: Record<string, string[]> = {
  Doha: [
    'Al Waab',
    'West Bay',
    'The Pearl',
    'Al Sadd',
    'Msheireb',
    'Ain Khaled',
    'Al Dafna',
    'Aspire Zone',
    'Corniche',
    'Old Airport',
    'Bin Mahmoud',
  ],
  'Al Rayyan': ['Education City', 'Al Gharrafa', 'Muaither', 'Al Wajba'],
  Lusail: ['Marina District', 'Fox Hills', 'Energy City', 'Waterfront'],
  'Al Wakrah': ['Al Wakrah Centre', 'Barwa City', 'Mesaieed'],
  'Al Khor': ['Al Khor Centre', 'Al Thakhira'],
  'Umm Salal': ['Umm Salal Mohammed', 'Umm Salal Ali'],
  'Al Daayen': ['Al Daayen Centre', 'Wadi Al Banat'],
}

/** Areas for a city (empty list → free choice). */
export function areasFor(city: string): string[] {
  return AREAS_BY_CITY[city] ?? []
}

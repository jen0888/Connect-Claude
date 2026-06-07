import type { Venue } from '../types'

/** Stage-1 curated Doha venues — ported verbatim from the design seed
 *  (create-match-shared.jsx) / Connect_Doha_Venues.md. Running has no
 *  fixed venues; it uses route start/finish instead. */
export const VENUES: Venue[] = [
  { id: 'padelin-aspire', name: 'Padel In — Aspire Zone', area: 'Aspire Zone · Al Waab', sports: ['padel'], setting: 'Indoor' },
  { id: 'padelin-cc', name: 'Padel In — City Center Doha', area: 'West Bay · Al Dafna', sports: ['padel'], setting: 'Indoor' },
  { id: 'padelin-alkhor', name: 'Padel In — Al Khor', area: 'Al Khor', sports: ['padel'], setting: 'Indoor' },
  { id: 'the-dome', name: 'The Dome — Education City Golf', area: 'Education City · Al Rayyan', sports: ['padel'], setting: 'Indoor' },
  { id: 'doha-oasis', name: 'Doha Oasis Padel', area: 'Msheireb', sports: ['padel'], setting: 'Indoor' },
  { id: 'padel91', name: 'Padel 91 West Walk', area: 'West Walk · Al Waab', sports: ['padel'], setting: 'Indoor' },
  { id: 'padel-up', name: 'Padel Up — J-Mall Rooftop', area: 'Al Markhiya', sports: ['padel'], setting: 'Rooftop' },
  { id: 'padel-garden', name: 'Padel Garden — Katara Hills', area: 'Katara', sports: ['padel'], setting: 'Outdoor' },
  { id: '14love', name: '14/Love — The Gate Mall', area: 'West Bay', sports: ['padel'], setting: 'Rooftop' },
  { id: 'sheraton-padel', name: 'Sheraton Grand Doha Padel', area: 'Al Dafna · West Bay', sports: ['padel'], setting: 'Outdoor' },
  { id: 'la-pelota', name: 'La Pelota Padel Club', area: 'Doha', sports: ['padel'], setting: 'Outdoor' },
  { id: 'khalifa', name: 'Khalifa Int’l Tennis Complex', area: 'West Bay · Al Dafna', sports: ['tennis'], setting: 'Outdoor' },
  { id: 'al-dana', name: 'Al Dana Club — Indoor Tennis', area: 'Doha', sports: ['tennis'], setting: 'Indoor' },
  { id: 'westbay-tennis', name: 'West Bay Tennis Club', area: 'West Bay', sports: ['tennis'], setting: 'Indoor + Outdoor' },
  { id: 'sheraton-tennis', name: 'Sheraton Grand Doha — Tennis', area: 'Al Dafna · West Bay', sports: ['tennis'], setting: 'Indoor' },
  { id: 'al-bidda', name: 'Al Bidda Park — Tennis', area: 'Al Bidda · Corniche', sports: ['tennis'], setting: 'Outdoor' },
  { id: 'ec-tennis', name: 'Education City — Tennis', area: 'Education City · Al Rayyan', sports: ['tennis'], setting: 'Outdoor' },
  { id: 'marsa-malaz', name: 'Marsa Malaz Kempinski', area: 'The Pearl-Qatar', sports: ['tennis'], setting: 'Outdoor' },
  { id: 'radisson', name: 'Radisson Blu — Cabana Club', area: 'Al Muntazah', sports: ['tennis'], setting: 'Outdoor' },
  { id: 'diplomatic', name: 'The Diplomatic Club', area: 'Al Dafna · West Bay', sports: ['tennis'], setting: 'Outdoor' },
  { id: 'aspire-tennis', name: 'Aspire Tennis Courts', area: 'Aspire Zone · Al Waab', sports: ['tennis'], setting: 'Outdoor' },
  { id: 'aspire-dome', name: 'Aspire Dome', area: 'Aspire Zone · Al Waab', sports: ['tennis'], setting: 'Indoor' },
  { id: 'dynamic', name: 'Dynamic Sports Academy', area: 'Ain Khaled', sports: ['badminton'], setting: 'Indoor' },
  { id: 'accelerate', name: 'Accelerate Sports', area: 'Doha', sports: ['badminton'], setting: 'Indoor' },
  { id: 'green-stadium', name: 'Green Stadium Qatar', area: 'Doha', sports: ['badminton'], setting: 'Indoor' },
  { id: 'feathers', name: 'Feathers Badminton', area: 'Al Khor', sports: ['badminton'], setting: 'Indoor' },
  { id: 'prime', name: 'Prime Sports Center', area: 'Doha', sports: ['badminton'], setting: 'Indoor' },
]

export function venuesForSport(sport: string): Venue[] {
  return VENUES.filter((v) => v.sports.includes(sport as Venue['sports'][number]))
}

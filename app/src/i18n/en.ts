/**
 * EN strings. Keys are added screen-by-screen as they're implemented;
 * the AR dictionary mirrors these keys in the Arabic pass
 * (terms must follow Connect_AR_Glossary.md).
 */
export const en = {
  // Navigation
  'nav.discover': 'Discover',
  'nav.home': 'Home',
  'nav.chat': 'Chat',

  // Match card / lifecycle
  'match.status.open': 'Open',
  'match.status.full': 'Full',
  'match.status.live': 'Live',
  'match.status.completed': 'Just played',
  'match.status.closed': 'Closed',
  'match.status.cancelled': 'Cancelled',
  'match.action.join': 'Join',
  'match.action.request': 'Request',
  'match.action.view': 'View',
  'match.action.attend': 'Attend',
  'match.action.attended': 'Attended',
  'match.action.cancel': 'Cancel',
  'match.action.edit': 'Edit',
  'match.action.recordResult': 'Record result',
  'match.action.openChat': 'Open chat',
  'match.spotsLeft': '{count} spots left',
  'match.spotLeft': '1 spot left',
  'match.hostedBy': 'Hosted by {name}',

  // Sports
  'sport.padel': 'Padel',
  'sport.tennis': 'Tennis',
  'sport.badminton': 'Badminton',
  'sport.running': 'Running',
} as const

export type MessageKey = keyof typeof en

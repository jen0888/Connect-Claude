import type { LucideIcon } from 'lucide-react'
import { Ban, CalendarCheck, Eye, Flag, Gauge, HeartHandshake, Landmark, MessagesSquare, ShieldAlert, ShieldBan, ShieldCheck } from 'lucide-react'

/**
 * Content for the onboarding Community Standards screen — every string,
 * icon and per-card accent lives here, never inside layout components
 * (screen spec rule). Copy mirrors Connect_Community_Standards.md;
 * the 2-hour cancellation rule is canonical (CLAUDE.md §5).
 *
 * NOTE: the six per-standard accents + tints are screen-spec literals,
 * deliberately outside the global token palette — they exist only as
 * data here, so swapping them touches one file.
 */

/** spec: tinted surfaces use color-mix(in oklab, <color> 14%, white) */
export const tint = (color: string, pct = 14) => `color-mix(in oklab, ${color} ${pct}%, white)`

/** red used for penalty rows / not-allowed marks (from the spec palette) */
export const STANDARDS_RED = '#E85D2C'

export interface PenaltyRow {
  rule: string
  result: string
  note: string
}

export interface StandardCard {
  num: string
  kicker: string
  accent: string
  icon: LucideIcon
  title: string
  lead: string
  checklist: string[]
  penalties?: PenaltyRow[]
}

export const STANDARDS_SCREEN = {
  hero: {
    eyebrow: 'Community Standards',
    headlineLines: ['Treat every player', 'the way you’d want', 'to be treated.'],
    meta: 'Adults only · 18+ · Last updated 2026-05-30',
  },
  spirit: {
    title: 'The spirit of Connect!',
    body: 'We’re a community of players, not strangers passing through. Most of us are meeting in person, often for the first time. That only works when everyone shows up in good faith — reliable, honest, and respectful. Follow the spirit of these standards, not just the wording.',
  },
  dividers: {
    standards: 'The six standards',
    notAllowed: 'The hard lines',
    handling: 'Enforcement',
    reporting: 'Your tools',
  },
  standards: [
    {
      num: '01',
      kicker: 'Standard 01',
      accent: '#2FB872',
      icon: CalendarCheck,
      title: 'Show up',
      lead: 'When you join or host a match, people are counting on you. One no-show can cancel the whole game.',
      checklist: [
        'Only join matches you actually intend to play.',
        'If your plans change, cancel at least 2 hours before start so your spot can be filled — players and hosts alike.',
        'Confirming you’re coming doesn’t protect you — if you don’t show, the host and the other players can report you.',
        'A no-show is recorded on your profile for other players to see. No block, no penalty beyond that.',
      ],
      penalties: [
        { rule: 'Cancel within 2h of start', result: 'No-show', note: 'lands instantly' },
        { rule: 'Don’t turn up at all', result: 'No-show', note: 'on your profile' },
      ],
    },
    {
      num: '02',
      kicker: 'Standard 02',
      accent: '#C99A2E',
      icon: Gauge,
      title: 'Be honest about your level',
      lead: 'Good matches depend on honest self-rating. Overstating or understating makes the game worse for everyone.',
      checklist: [
        'Set your level honestly, and update it as you improve.',
        'Play to the spirit of the match’s level — keep it fun and fair for everyone on the court.',
      ],
    },
    {
      num: '03',
      kicker: 'Standard 03',
      accent: '#E85D2C',
      icon: HeartHandshake,
      title: 'Respect every player',
      lead: 'Everyone 18 and over is welcome on Connect! — all backgrounds, genders, and abilities.',
      checklist: [
        'No harassment, hate speech, discrimination, or bullying — on the court, in chat, or anywhere.',
        'No unwanted advances or messages. “No” means no.',
        'Keep the banter friendly. Competitive is fine; cruel is not.',
      ],
    },
    {
      num: '04',
      kicker: 'Standard 04',
      accent: '#3C8FFF',
      icon: ShieldCheck,
      title: 'Play it safe',
      lead: 'You’re meeting people in person, so use good judgment.',
      checklist: [
        'Meet at the booked public venue, and keep first games to public, well-used courts.',
        'Don’t share more personal information than you’re comfortable with.',
        'If someone makes you feel unsafe, leave — then block and report them.',
        'For anything urgent or threatening, contact local authorities.',
      ],
    },
    {
      num: '05',
      kicker: 'Standard 05',
      accent: '#7C5CFF',
      icon: MessagesSquare,
      title: 'Communicate well',
      lead: 'Match chat is for organizing the game.',
      checklist: [
        'Keep messages relevant, respectful, and timely.',
        'No spam, ads, scams, or links to off-platform schemes.',
        'Sort out court fees and splits clearly and fairly before you play.',
      ],
    },
    {
      num: '06',
      kicker: 'Standard 06',
      accent: '#6B7280',
      icon: Landmark,
      title: 'Respect venues and the game',
      lead: 'Courts and clubs host us — keep them glad we came.',
      checklist: [
        'Follow each venue’s rules, dress code, and booking terms.',
        'Arrive on time, clean up after yourselves, and respect staff and other players.',
        'Honor Qatar’s local laws and customs in how you behave and communicate.',
      ],
    },
  ] satisfies StandardCard[],
  notAllowed: {
    title: 'What’s not allowed',
    lead: 'To be clear, these will get you removed:',
    items: [
      'Harassment, threats, hate speech, or discrimination',
      'Sexual harassment or sharing explicit content',
      'Faking your identity or impersonating someone else',
      'Repeated no-shows or chronic unreliability',
      'Scams, spam, soliciting, or luring people off-platform',
      'Using Connect! under 18, or helping anyone under 18 use it',
      'Anything illegal under Qatari law',
    ],
  },
  handling: {
    title: 'How we handle problems',
    rows: [
      {
        icon: Eye as LucideIcon,
        accent: '#3C8FFF',
        title: 'Reliability is public',
        desc: 'No-shows are recorded on your profile for other players to see. No automatic blocks — your record speaks for itself.',
      },
      {
        icon: Ban as LucideIcon,
        accent: '#C99A2E',
        title: 'Serious or repeated violations',
        desc: 'Temporary or permanent removal from Connect!.',
      },
      {
        icon: ShieldAlert as LucideIcon,
        accent: '#E85D2C',
        title: 'Threats to anyone’s safety',
        desc: 'Immediate action, every time. Safety isn’t negotiable.',
      },
    ],
  },
  reporting: {
    cards: [
      {
        icon: ShieldBan as LucideIcon,
        title: 'Block',
        body: 'Instantly stops someone from seeing you, joining your matches, or messaging you. On their profile: name → ⋯ → Block.',
      },
      {
        icon: Flag as LucideIcon,
        title: 'Report',
        body: 'Tells our team what happened so we can act. Use it for anything that breaks these standards.',
      },
    ],
    note: 'Every report is reviewed, and reporting in good faith never counts against you.',
  },
  closing: {
    title: 'A final word',
    body: 'Connect! is only as good as the people in it — and that’s you. Play hard, be decent, and help us build the kind of community you’d want to show up to.',
    kicker: 'See you on the court.',
  },
}

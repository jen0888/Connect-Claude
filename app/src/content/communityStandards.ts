/**
 * Full, unabridged Community Standards (EN) — mirrored verbatim from
 * "Connect! UI Lab/Connect_Community_Standards.md" (Stage 1 draft).
 * That doc also carries the complete AR translation — wire it here,
 * keyed by locale, in the Arabic pass. 2-hour cancellation rule is
 * canonical (CLAUDE.md §5).
 */

export const STANDARDS_UPDATED = '2026-05-30'

export const STANDARDS_INTRO: string[] = [
  'Connect! exists to get people in Doha off their phones and onto the court. Whether you play padel, tennis, badminton, go for a run, or anything in between, this is a place to find a game, meet good people, and play more often. These standards keep it that way — they’re simple, and they come down to one idea: treat every player the way you’d want to be treated.',
  'Connect! is for adults only — you must be 18 or older to use it. Because the whole point is meeting people in person to play, the app is not for anyone under 18.',
]

export interface StandardsSection {
  /** display numeral for the six core standards; framing sections have none */
  n?: number
  title: string
  lead?: string
  bullets?: string[]
  outro?: string
}

export const STANDARDS_SECTIONS: StandardsSection[] = [
  {
    title: 'The spirit of Connect!',
    lead: 'We’re a community of players, not strangers passing through. Most of us are meeting in person, often for the first time. That only works when everyone shows up in good faith — reliable, honest, and respectful. Follow the spirit of these standards, not just the wording.',
  },
  {
    n: 1,
    title: 'Show up',
    lead: 'When you join or host a match, people are counting on you. One no-show can cancel the whole game.',
    bullets: [
      'Only join matches you actually intend to play.',
      'If your plans change, cancel at least 2 hours before the match starts so your spot can be filled in time. This applies to players and hosts alike.',
      'Cancelling within 2 hours of start counts as a no-show — and so does simply not turning up. A no-show is a no-show, whichever way it happens.',
      'Confirming you’re coming doesn’t protect you. Even if you’ve tapped the confirm / attend button, if you don’t actually show, the host and the other players can report you as a no-show.',
      'A no-show is recorded on your profile for other players to see — there’s no block or penalty beyond that. Your attendance record speaks for itself.',
    ],
  },
  {
    n: 2,
    title: 'Be honest about your level',
    lead: 'Good matches depend on honest self-rating. Overstating or understating your level makes the game worse for everyone.',
    bullets: [
      'Set your level honestly, and update it as you improve.',
      'Play to the spirit of the match’s level — keep it fun and fair for everyone on the court.',
    ],
  },
  {
    n: 3,
    title: 'Respect every player',
    lead: 'Everyone 18 and over is welcome on Connect! — all backgrounds, genders, and abilities.',
    bullets: [
      'No harassment, hate speech, discrimination, or bullying — on the court, in chat, or anywhere.',
      'No unwanted advances or messages. “No” means no.',
      'Keep the banter friendly. Competitive is fine; cruel is not.',
    ],
  },
  {
    n: 4,
    title: 'Play it safe',
    lead: 'You’re meeting people in person, so use good judgment.',
    bullets: [
      'Meet at the booked public venue, and keep first games to public, well-used courts.',
      'Don’t share more personal information than you’re comfortable with.',
      'If someone makes you feel unsafe, leave — then block and report them. Your safety comes first.',
      'For anything urgent or threatening, contact local authorities.',
    ],
  },
  {
    n: 5,
    title: 'Communicate well',
    lead: 'Match chat is for organizing the game.',
    bullets: [
      'Keep messages relevant, respectful, and timely.',
      'No spam, ads, scams, or links to off-platform schemes.',
      'Sort out court fees and splits clearly and fairly before you play.',
    ],
  },
  {
    n: 6,
    title: 'Respect venues and the game',
    bullets: [
      'Follow each venue’s rules, dress code, and booking terms.',
      'Arrive on time, clean up after yourselves, and respect staff and other players.',
      'Honor Qatar’s local laws and customs in how you behave and communicate.',
    ],
  },
  {
    title: 'What’s not allowed',
    lead: 'To be clear, these will get you removed:',
    bullets: [
      'Harassment, threats, hate speech, or discrimination',
      'Sexual harassment or sharing explicit content',
      'Faking your identity or impersonating someone else',
      'Repeated no-shows or chronic unreliability',
      'Scams, spam, soliciting, or moving people off-platform to deceive them',
      'Using Connect! if you’re under 18, or helping anyone under 18 use it',
      'Anything illegal under Qatari law',
    ],
  },
  {
    title: 'How we handle problems',
    lead: 'Safety isn’t negotiable. Reliability is public — your track record shows on your profile.',
    bullets: [
      'Reliability issues: a no-show — cancelling within 2 hours of start, or not turning up — is recorded on your profile for other players to see. There’s no automatic block; your attendance record is public and speaks for itself. Confirming attendance doesn’t exempt you; hosts and players can both report a no-show.',
      'Serious or repeated violations: temporary or permanent removal from Connect!.',
      'Anything threatening someone’s safety: immediate action.',
    ],
  },
  {
    title: 'Reporting and blocking',
    lead: 'See something off? You have two tools, any time:',
    bullets: [
      'Block — instantly stops someone from seeing you, joining your matches, or messaging you. Find it on their profile (tap their name → ⋯ → Block).',
      'Report — tells our team what happened so we can act. Use it for anything that breaks these standards.',
    ],
    outro: 'Every report is reviewed, and reporting in good faith never counts against you.',
  },
  {
    title: 'A final word',
    lead: 'Connect! is only as good as the people in it — and that’s you. Play hard, be decent, and help us build the kind of community you’d want to show up to. See you on the court.',
  },
]

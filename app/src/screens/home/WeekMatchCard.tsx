import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Match, User } from '@/lib/types'
import { artType, courtLabel, hm, matchKind, sportLabel, whenLabel, initials as userInitials } from '@/lib/format'
import { AvatarStack } from '@/components/Avatar'
import { SportArt } from '@/components/SportArt'

/** "This week" row — compact horizontal variant with a left art panel
 *  (home-screens.jsx WeekMatchCard). Mirrors Discover's row style. */
export function WeekMatchCard({ match, host, players = [] }: { match: Match; host?: User | null; players?: User[] }) {
  const filled = match.total_spots - match.spots_available
  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-stretch overflow-hidden rounded-[18px] border bg-card text-inherit no-underline shadow-row transition-transform hover:-translate-y-px"
      style={{ borderColor: 'rgba(26,26,26,0.08)' }}
    >
      {/* left art panel — day + time */}
      <div className="relative w-[86px] shrink-0">
        <div className="absolute inset-0">
          <SportArt type={artType(match)} />
        </div>
        <div className="absolute start-2 top-2 text-[9.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(244,240,232,0.92)' }}>
          {whenLabel(match.start_time)}
        </div>
        <div className="absolute bottom-2 start-2 font-display text-[20px] leading-none text-onbrand ltr-nums">{hm(match.start_time)}</div>
      </div>
      {/* right content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between px-3.5 pt-[11px] pb-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
            <span className="inline-flex items-center gap-[5px]">
              <span className="h-[5px] w-[5px] rounded-full bg-accent" />
              {sportLabel(match.sport)}
            </span>
            <span className="opacity-40">·</span>
            <span className="truncate">{match.venue_name}</span>
          </div>
          <div className="font-display text-[19px] leading-[1.1] text-ink" style={{ letterSpacing: '-0.012em' }}>
            {matchKind(match)} <span className="italic text-brand">at</span> {courtLabel(match)}
          </div>
        </div>
        <div className="mt-[9px] flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {host && (
              <span className="truncate whitespace-nowrap text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                Hosted by {host.name}
              </span>
            )}
            <AvatarStack initials={players.map(userInitials)} filled={filled} max={match.total_spots} accent="var(--color-accent)" />
          </div>
          <span
            className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border rtl:rotate-180"
            style={{ color: 'var(--color-text-muted)', borderColor: 'rgba(26,26,26,0.12)' }}
          >
            <ChevronRight size={14} strokeWidth={2.2} />
          </span>
        </div>
      </div>
    </Link>
  )
}

import { useNavigate } from 'react-router-dom'
import { MapPin, Pencil } from 'lucide-react'
import { SportArt } from '@/components/SportArt'
import { PlayerDots } from '@/components/controls'
import { courtNumberLabel, to24h } from '@/lib/format'
import type { HostedMatch } from '@/lib/hostedMatch'

/** The "You're hosting" card on Home — renders the host's own match straight
 *  from the localStorage source of truth (lib/hostedMatch), so it always
 *  mirrors whatever the Create/Edit form last wrote. Tap (or the Edit pill)
 *  opens the same edit form. */

const cardStyle = { borderColor: 'rgba(26,26,26,0.10)' }

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-pill px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.04em]"
      style={{ background: 'rgba(26,26,26,0.06)', color: 'var(--color-text)' }}
    >
      {children}
    </span>
  )
}

export function HostedMatchCard({ match }: { match: HostedMatch }) {
  const navigate = useNavigate()
  const art = match.sport === 'running' ? 'run' : match.sport === 'tennis' ? 'tennis' : 'padel'
  const edit = () => navigate('/matches/edit-demo')

  return (
    <div
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        edit()
      }}
      className="cursor-pointer overflow-hidden rounded-[22px] border bg-card shadow-card"
      style={cardStyle}
    >
      {/* art header */}
      <div className="relative h-[118px]">
        <SportArt type={art} />
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-1.5">
          <Chip>{match.matchType === 'competition' ? 'Competition' : 'Casual'}</Chip>
          <Chip>{match.gender === 'ladies' ? 'Ladies only' : 'Mixed'}</Chip>
        </div>
      </div>

      {/* body */}
      <div className="p-[18px]">
        <h3 className="m-0 font-display text-[24px] font-normal leading-[1.1]" style={{ letterSpacing: '-0.01em' }}>
          {match.name}
        </h3>

        {/* time — 24-hour HH:MM, no clock icon */}
        <div className="mt-1.5 font-display text-[18px] leading-none ltr-nums" style={{ color: 'var(--color-text)' }}>
          {to24h(match.startTime)}–{to24h(match.endTime)}
        </div>

        {/* location */}
        <div className="mt-2.5 flex items-start gap-1.5 text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
          <MapPin size={13} strokeWidth={1.8} className="mt-px shrink-0" />
          {match.isRoute ? (
            <span className="min-w-0">
              {match.venueName} <span className="opacity-40">→</span>{' '}
              {match.loop ? <span className="italic text-brand">Loop · back to start</span> : match.routeEnd}
              {!!match.km && <span className="nums-tabular"> · {match.km} km</span>}
            </span>
          ) : (
            <span className="min-w-0">
              <span className="text-ink">{match.venueName}</span>
              {match.court && <span className="italic text-brand"> · {courtNumberLabel(match.court)}</span>}
              {(match.area || match.setting) && (
                <span>
                  {' · '}
                  {[match.area, match.setting].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
          )}
        </div>

        {/* players + price + edit */}
        <div className="mt-3.5 flex items-center justify-between gap-3 border-t pt-3.5" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
          <div className="flex items-center gap-2.5">
            <PlayerDots filled={Math.min(match.filled, match.players)} total={match.players} size={26} />
            <span className="text-[12.5px] font-medium nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
              {match.filled}/{match.players}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12.5px] font-semibold nums-tabular text-ink">
              {match.isFree ? 'Free' : `QAR ${match.pricePerPlayer || 0}/player`}
            </span>
            <button
              type="button"
              onClick={edit}
              className="inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-pill bg-transparent px-3.5 text-[12.5px] font-semibold text-ink"
              style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
            >
              <Pencil size={13} strokeWidth={2} /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

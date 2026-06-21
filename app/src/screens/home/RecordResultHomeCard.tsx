import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, Trophy } from 'lucide-react'
import type { Match } from '@/lib/types'
import { artType, courtLabel, matchKind, timeRange } from '@/lib/format'
import { Eyebrow } from '@/components/Eyebrow'
import { SportArt } from '@/components/SportArt'

/** "You just played" — post-match prompt at the top of Home during the 24h
 *  window (home-screens.jsx RecordResultHomeCard). Opens the same form the
 *  chat pinned bar uses. */
export function RecordResultHomeCard({ match }: { match: Match }) {
  return (
    <>
      <div className="mb-2.5">
        <Eyebrow accent="var(--color-brand)">You just played · today</Eyebrow>
      </div>
      <Link
        to={`/post-match/${match.id}`}
        className="mb-[26px] block overflow-hidden rounded-[22px] bg-card text-inherit no-underline transition-transform hover:-translate-y-px"
        style={{
          border: '1px solid color-mix(in srgb, var(--color-brand) 20%, transparent)',
          boxShadow: '0 1px 0 rgba(26,26,26,0.02), 0 20px 38px -22px color-mix(in srgb, var(--color-brand) 47%, transparent)',
        }}
      >
        {/* tinted header — match identity */}
        <div
          className="flex items-center gap-[13px] px-[18px] pt-[15px] pb-3.5"
          style={{
            background: 'color-mix(in srgb, var(--color-brand) 5%, transparent)',
            borderBottom: '1px solid color-mix(in srgb, var(--color-brand) 12%, transparent)',
          }}
        >
          <div className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[13px]">
            <SportArt type={artType(match)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand">Match finished</div>
            <div className="mt-px truncate font-display text-[20px] leading-[1.05]" style={{ letterSpacing: '-0.015em' }}>
              {matchKind(match)} <span className="italic text-brand">at</span> {courtLabel(match)}
            </div>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-onbrand" style={{ boxShadow: '0 8px 18px -8px var(--color-brand)' }}>
            <Trophy size={16} strokeWidth={1.8} />
          </span>
        </div>
        {/* body — prompt + CTA */}
        <div className="px-[18px] pt-3.5 pb-4">
          <div className="flex items-center gap-3.5 text-[12.5px]" style={{ color: 'rgba(26,26,26,0.6)' }}>
            <span className="inline-flex items-center gap-[5px] nums-tabular">
              <Clock size={12} strokeWidth={2} />
              <span className="ltr-nums">{timeRange(match)}</span>
            </span>
            <span className="inline-flex items-center gap-[5px]">
              <MapPin size={12} strokeWidth={2} />
              {match.venue_name.split(' ')[0]}
            </span>
          </div>
          <div className="mt-[13px] flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="whitespace-nowrap text-[13.5px] font-semibold text-ink">How did it go?</div>
              <div className="mt-px text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                Log the result &middot; all optional
              </div>
            </div>
            <span className="inline-flex h-11 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-pill bg-brand px-[18px] text-[13.5px] font-semibold tracking-[0.01em] text-onbrand" style={{ boxShadow: '0 10px 22px -8px var(--color-brand)' }}>
              Record result <ArrowRight size={11} strokeWidth={2.2} className="rtl:rotate-180" />
            </span>
          </div>
        </div>
      </Link>
    </>
  )
}

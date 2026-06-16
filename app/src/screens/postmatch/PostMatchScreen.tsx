import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, MessageCircle } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { useToast } from '@/components/Toast'
import { currentUserId, useDB } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { courtLabel, matchKind, timeRange, whenLabel } from '@/lib/format'
import { LIFECYCLE } from '@/components/lifecycle'
import { RecordResultForm } from './RecordResultForm'

/** Post-Match Detail — the full "Record result" page (postmatch-sheet.jsx).
 *  A thin editorial wrapper around the SHARED RecordResultForm — the exact
 *  same form that drops down inside the chat pinned bar. Auto-closes 24h
 *  after the match ends (status → closed, computed at read time). */
export function PostMatchScreen() {
  const { id } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const match = db.matches.find((m) => m.id === id)

  if (!match) return null
  const status = computeStatus(match)
  const lc = LIFECYCLE[status]
  const saved = db.matchResults.some((r) => r.match_id === match.id && r.player_id === currentUserId)

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        {/* floating top bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-[18px] pt-11 pb-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="pointer-events-auto inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full text-ink backdrop-blur-[8px]"
            style={{ border: '1px solid rgba(26,26,26,0.10)', background: 'rgba(244,240,232,0.6)' }}
          >
            <ChevronLeft size={16} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <span
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-pill px-[13px] py-[7px] text-[11px] font-semibold tracking-[0.04em] backdrop-blur-[8px]"
            style={{ background: 'rgba(244,240,232,0.7)', border: '1px solid rgba(26,26,26,0.10)', color: 'var(--color-text-muted)' }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: lc.color }} /> {lc.label}
          </span>
        </div>

        <div className="scroll-area relative z-1 flex-1 overflow-y-auto pt-[104px] pb-10">
          {/* hero */}
          <div className="px-[22px] pb-1">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
              {matchKind(match)} at {courtLabel(match)} · {whenLabel(match.end_time)} · <span className="ltr-nums">{timeRange(match)}</span>
            </div>
            <h1 className="m-0 font-display text-[37px] font-normal leading-none" style={{ letterSpacing: '-0.022em' }}>
              {saved ? (
                <>
                  That's <em className="italic text-brand">logged</em>.
                </>
              ) : (
                <>
                  How did it <em className="italic text-brand">go</em>?
                </>
              )}
            </h1>
            <p className="mt-[9px] mb-[18px] max-w-[300px] text-[13px] leading-[1.4]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
              {saved
                ? 'This match is recorded. Edit it any time until the match closes.'
                : match.sport === 'running'
                  ? "One quick step. Mark who showed up — it saves straight to everyone's history."
                  : "Two quick questions. Mark who showed and which side won — it saves straight to everyone's history."}
            </p>
          </div>

          {/* the shared form */}
          <RecordResultForm
            match={match}
            onSaved={() => showToast('Result submitted')}
            savedSlot={
              <button
                type="button"
                onClick={() => navigate(`/chat/match/${match.id}`)}
                className="inline-flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill border-none bg-brand text-[13px] font-semibold text-onbrand"
              >
                <MessageCircle size={14} strokeWidth={1.9} /> Chat
              </button>
            }
          />
        </div>
      </div>
    </Shell>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Pencil, Share2, Trophy, UserX } from 'lucide-react'
import { actions, currentUserId, matchPlayers, noShowFlagFor, useDB } from '@/lib/store'
import { computeStatus } from '@/lib/status'
import { initials } from '@/lib/format'
import { ShareCard } from '@/components/ShareCard'
import type { Match, MatchResultValue, User } from '@/lib/types'

/** ONE shared post-match form (CLAUDE.md §5, light model) — rendered identically
 *  on the full Post-Match page and inline in the chat pinned bar. EVERYTHING here
 *  is OPTIONAL and never blocks the loop. Two independent, optional sections:
 *
 *   1. Log result — FIRST-SUBMITTER sets it: the first participant to log
 *      win/lose/draw makes it canonical immediately (no second confirmation).
 *      Logging offers the share card; any participant/host can edit within 24h.
 *   2. Flag a no-show — a host flags a participant; a participant who showed
 *      flags the host. Never peer-vs-peer. One flag lands it; the flagged user
 *      is notified and may dispute. */

function PmAvatar({ p, size = 32, muted = false }: { p: User; size?: number; muted?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display italic text-onbrand"
      style={{ width: size, height: size, fontSize: size * 0.42, background: muted ? 'var(--color-neutral)' : 'var(--color-accent)', opacity: muted ? 0.6 : 1 }}
    >
      {initials(p)[0]}
    </span>
  )
}

function SectionHead({ label, summary }: { label: string; summary?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
        <span className="h-[5px] w-[5px] rounded-full bg-brand" />
        {label}
      </span>
      {summary}
    </div>
  )
}

const cardStyle = { background: 'var(--surface-card)', border: '1px solid rgba(26,26,26,0.10)', borderRadius: 18 }
const OUTCOMES: { id: MatchResultValue; label: string; color: string }[] = [
  { id: 'win', label: 'Won', color: 'var(--color-success)' },
  { id: 'loss', label: 'Lost', color: 'var(--color-danger)' },
  { id: 'draw', label: 'Draw', color: 'var(--color-neutral)' },
]

export function RecordResultForm({ match, onSaved, savedSlot }: { match: Match; onSaved?: () => void; savedSlot?: ReactNode }) {
  const db = useDB()
  const roster = matchPlayers(db, match.id)
  const isHost = match.host_id === currentUserId
  const isRunning = match.sport === 'running'

  // first-submitter result (earliest created_at = canonical) + my own row
  const myResult = db.matchResults.find((r) => r.match_id === match.id && r.player_id === currentUserId)
  const canonical = useMemo(
    () => [...db.matchResults.filter((r) => r.match_id === match.id)].sort((a, b) => a.created_at.localeCompare(b.created_at))[0],
    [db.matchResults, match.id],
  )

  const [editing, setEditing] = useState(!myResult)
  const [pick, setPick] = useState<MatchResultValue | null>(myResult?.result ?? null)
  const [share, setShare] = useState(false)

  // did I show up? (a participant who showed may flag the host)
  const myMp = db.matchPlayers.find((mp) => mp.match_id === match.id && mp.player_id === currentUserId)
  const iShowed = !myMp || myMp.attended !== false

  // The no-show flag is the ONLY time-bounded post-match action (CLAUDE.md §5):
  // accepted only within ~24h of end_time, i.e. while the match reads `completed`.
  // Once it's `closed` (>24h) the flag window has shut — results/cards stay open.
  const flagWindowOpen = computeStatus(match) === 'completed'

  // who I may flag (CLAUDE.md §5): host → any non-host participant; a participant
  // who showed → only the host. NEVER peer-vs-peer.
  const flagTargets = roster.filter((p) =>
    p.id === currentUserId ? false : isHost ? p.id !== match.host_id : p.id === match.host_id && iShowed,
  )

  const submit = () => {
    const value: MatchResultValue | null = isRunning ? 'draw' : pick
    if (!value) return
    actions.recordResult(match.id, currentUserId, value)
    setEditing(false)
    onSaved?.()
    setShare(true) // offer the share card the moment a result is logged (§5)
  }

  const shownResult = myResult?.result ?? canonical?.result ?? null

  return (
    <div className="px-4 text-ink">
      {/* ── 1 · Log result (optional) ─────────────────────────── */}
      <SectionHead
        label="Log result"
        summary={
          shownResult ? (
            <span className="inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ background: 'color-mix(in srgb, var(--color-brand) 9%, transparent)', color: 'var(--color-brand)' }}>
              <Trophy size={11} strokeWidth={2.2} /> {OUTCOMES.find((o) => o.id === shownResult)?.label}
            </span>
          ) : null
        }
      />

      {!editing && myResult ? (
        <div className="px-3.5 py-3" style={cardStyle}>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: 'var(--color-success)' }}>
              <Check size={15} strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold" style={{ color: 'var(--color-success)' }}>Result logged</div>
              <div className="mt-px text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>It's on the match — edit any time today.</div>
            </div>
          </div>
          <div className="mt-2.5 flex gap-[9px]">
            <button
              type="button"
              onClick={() => { setPick(myResult.result); setEditing(true) }}
              className="inline-flex h-[44px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill bg-transparent text-[13px] font-semibold text-brand"
              style={{ border: '1.5px solid color-mix(in srgb, var(--color-brand) 40%, transparent)' }}
            >
              <Pencil size={14} strokeWidth={2} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setShare(true)}
              className="inline-flex h-[44px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill border-none bg-brand text-[13px] font-semibold text-onbrand"
            >
              <Share2 size={14} strokeWidth={2} /> Share
            </button>
          </div>
        </div>
      ) : isRunning ? (
        <div className="px-3.5 py-3.5" style={cardStyle}>
          <p className="m-0 mb-3 text-[12.5px] leading-[1.45]" style={{ color: 'var(--color-text-muted)' }}>
            Runs aren't head-to-head — just log it as done to drop it into everyone's history.
          </p>
          <button
            type="button"
            onClick={submit}
            className="inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-pill border-none bg-brand text-[14px] font-semibold text-onbrand"
            style={{ boxShadow: '0 12px 24px -12px var(--color-brand)' }}
          >
            Log this run <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
          </button>
        </div>
      ) : (
        <div className="px-3.5 py-3.5" style={cardStyle}>
          <div className="flex gap-[9px]">
            {OUTCOMES.map((o) => {
              const sel = pick === o.id
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setPick(o.id)}
                  className="flex-1 rounded-[14px] py-3 text-[13px] font-semibold transition-all"
                  style={{
                    border: sel ? `1.5px solid ${o.color}` : '1px solid rgba(26,26,26,0.12)',
                    background: sel ? `color-mix(in srgb, ${o.color} 10%, transparent)` : 'var(--surface-card)',
                    color: sel ? o.color : 'var(--color-text-muted)',
                  }}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!pick}
            className="mt-3 inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-pill border-none text-[14px] font-semibold transition-colors"
            style={{
              cursor: pick ? 'pointer' : 'default',
              background: pick ? 'var(--color-brand)' : 'rgba(26,26,26,0.14)',
              color: pick ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.4)',
              boxShadow: pick ? '0 12px 24px -12px var(--color-brand)' : 'none',
            }}
          >
            {myResult ? 'Save result' : 'Log result'} <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <div className="mt-2 text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            Optional · the first to log sets it. You can change it today.
          </div>
        </div>
      )}

      {/* ── 2 · Flag a no-show (optional, 24h window only) ────── */}
      {flagWindowOpen && flagTargets.length > 0 && (
        <div className="mt-[18px]">
          <SectionHead label={isHost ? 'Anyone not show?' : 'Host not show?'} />
          <div className="px-3.5 py-0.5" style={cardStyle}>
            {flagTargets.map((p, i) => {
              const flag = noShowFlagFor(db, match.id, p.id)
              const contested = db.noShowFlags.find((f) => f.match_id === match.id && f.subject_player === p.id)?.status === 'contested'
              const flagged = !!flag || contested
              return (
                <div key={p.id} className="flex items-center gap-[11px] py-[10px]" style={{ borderBottom: i < flagTargets.length - 1 ? '1px solid rgba(26,26,26,0.10)' : 'none' }}>
                  <PmAvatar p={p} muted={flagged} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-semibold" style={{ color: flagged ? 'var(--color-text-muted)' : 'var(--color-text)' }}>{p.name}</div>
                    {contested && <div className="text-[10.5px] font-semibold" style={{ color: 'var(--color-warning)' }}>Disputed the flag</div>}
                  </div>
                  {flagged ? (
                    <span className="inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]" style={{ background: 'color-mix(in srgb, var(--color-danger) 9%, transparent)', color: 'var(--color-danger)' }}>
                      <UserX size={11} strokeWidth={2.2} /> No-show
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => actions.flagNoShow(match.id, p.id)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-pill border px-[13px] py-1.5 text-[12px] font-semibold"
                      style={{ borderColor: 'color-mix(in srgb, var(--color-danger) 30%, transparent)', color: 'var(--color-danger)', background: 'transparent' }}
                    >
                      Didn't show
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-2 px-1 text-[11px] leading-[1.45]" style={{ color: 'var(--color-text-muted)' }}>
            One flag marks it — a reliability note on their profile, not a penalty. They're notified and can dispute it.
          </div>
        </div>
      )}

      {savedSlot && <div className="mt-[18px] flex gap-[9px]">{savedSlot}</div>}

      {share && <ShareCard match={match} result={shownResult} onClose={() => setShare(false)} />}
    </div>
  )
}

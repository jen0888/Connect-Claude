import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Share2, X } from 'lucide-react'
import { useToast } from '@/components/Toast'
import { matchJoinUrl, shareMatch } from '@/lib/share'
import { courtLabel, dayDateLabel, matchKind, sportLabel, timeRange } from '@/lib/format'
import { sportEmoji } from '@/lib/sports'
import type { Match, MatchResultValue } from '@/lib/types'

/** Post-match share card (CLAUDE.md §5). Player-initiated, ALWAYS optional —
 *  never blocks the loop. A brand-styled poster (Editorial Calm tokens, serif,
 *  Western/tabular numerals) the sharer can post via the one-tap Web Share API;
 *  it carries a join link + offline QR to the match.
 *
 *  Three variants the sharer picks:
 *    (a) 'result'  — outcome (Won / Lost / Draw) + an OPTIONAL typed score
 *                    (ephemeral — shown on the poster only, never persisted)
 *    (b) 'win'     — a clean victory poster (offered only when you won)
 *    (c) 'details' — match details only; works even when no result was logged */

type Variant = 'result' | 'win' | 'details'

const OUTCOME_WORD: Record<MatchResultValue, string> = { win: 'Won', loss: 'Lost', draw: 'Draw' }

export function ShareCard({ match, result, onClose }: { match: Match; result?: MatchResultValue | null; onClose: () => void }) {
  const { showToast } = useToast()
  const url = matchJoinUrl(match.id)
  const [qr, setQr] = useState<string>('')
  const [score, setScore] = useState('')

  const canResult = !!result
  const canWin = result === 'win'
  const [variant, setVariant] = useState<Variant>(canWin ? 'win' : canResult ? 'result' : 'details')

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(url, { margin: 0, width: 240, color: { dark: '#1a1a1aff', light: '#00000000' } })
      .then((d) => { if (alive) setQr(d) })
      .catch(() => { if (alive) setQr('') })
    return () => { alive = false }
  }, [url])

  const title = match.name || `${matchKind(match)} at ${courtLabel(match)}`
  const shareText =
    variant === 'win' ? `Won our ${sportLabel(match.sport)} match on Connect! 🎾 Join the next one:`
    : variant === 'result' && result ? `${OUTCOME_WORD[result]}${score ? ` ${score}` : ''} — ${title} on Connect!. Join us:`
    : `${title} · ${sportLabel(match.sport)} in Doha on Connect!. Join us:`

  const onShare = async () => {
    const r = await shareMatch({ title: 'Connect!', text: shareText, url })
    if (r === 'copied') showToast('Link copied')
    else if (r === 'unavailable') showToast('Sharing not available')
  }
  const onCopy = async () => {
    try { await navigator.clipboard?.writeText(url); showToast('Link copied') } catch { showToast('Sharing not available') }
  }

  const variants: { id: Variant; label: string; enabled: boolean }[] = [
    { id: 'result', label: 'Result', enabled: canResult },
    { id: 'win', label: 'Win', enabled: canWin },
    { id: 'details', label: 'Details', enabled: true },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-end"
      style={{ background: 'rgba(20,16,12,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-t-[26px] px-5 pt-3 pb-8"
        style={{ background: 'var(--surface-page)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* grabber + close */}
        <div className="relative mb-3 flex items-center justify-center">
          <span className="h-1 w-9 rounded-full" style={{ background: 'rgba(26,26,26,0.18)' }} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute inset-y-0 end-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink"
            style={{ border: '1px solid rgba(26,26,26,0.10)' }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* ── poster ────────────────────────────────────────────── */}
        <div
          className="overflow-hidden rounded-[22px] text-ink"
          style={{ background: 'var(--surface-card)', border: '1px solid rgba(26,26,26,0.10)', boxShadow: '0 24px 48px -28px rgba(26,26,26,0.45)' }}
        >
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.22em]" style={{ color: 'var(--color-accent)' }}>
                <span className="h-[5px] w-[5px] rounded-full" style={{ background: 'var(--color-brand)' }} />
                Connect · Doha
              </span>
              <span className="text-[18px] leading-none">{sportEmoji(match.sport)}</span>
            </div>

            {/* headline by variant */}
            {variant === 'win' ? (
              <div className="mt-6">
                <div className="font-display text-[15px] italic" style={{ color: 'var(--color-brand)' }}>Victory</div>
                <h2 className="m-0 font-display text-[46px] leading-[0.95]" style={{ letterSpacing: '-0.02em' }}>
                  We <span className="italic text-brand">won</span>.
                </h2>
              </div>
            ) : variant === 'result' && result ? (
              <div className="mt-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>Final</div>
                <h2 className="m-0 font-display text-[46px] leading-[0.95]" style={{ letterSpacing: '-0.02em' }}>
                  <span className="italic text-brand">{OUTCOME_WORD[result]}</span>
                </h2>
                {score && <div className="mt-1 font-display text-[28px] ltr-nums nums-tabular" style={{ letterSpacing: '0.01em' }}>{score}</div>}
              </div>
            ) : (
              <div className="mt-6">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>You're invited</div>
                <h2 className="m-0 font-display text-[38px] leading-[1.0]" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
              </div>
            )}

            {/* fixtures line */}
            <div className="mt-5 grid gap-1.5 text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              <div>{sportLabel(match.sport)} · {matchKind(match)}</div>
              <div className="ltr-nums nums-tabular">{dayDateLabel(match.start_time)} · {timeRange(match)}</div>
              <div>{match.venue_name}{match.court_number ? ` · ${courtLabel(match)}` : ''}</div>
            </div>
          </div>

          {/* QR strip */}
          <div className="flex items-center gap-3.5 px-6 py-4" style={{ borderTop: '1px solid rgba(26,26,26,0.10)', background: 'color-mix(in srgb, var(--color-brand) 4%, transparent)' }}>
            <div className="h-[58px] w-[58px] shrink-0 rounded-[10px] p-1.5" style={{ background: 'var(--surface-card)', border: '1px solid rgba(26,26,26,0.10)' }}>
              {qr && <img src={qr} alt="" className="h-full w-full" />}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-ink">Scan to join</div>
              <div className="truncate text-[11px] ltr-nums" style={{ color: 'var(--color-text-muted)' }}>{url.replace(/^https?:\/\//, '')}</div>
            </div>
          </div>
        </div>

        {/* ── controls ──────────────────────────────────────────── */}
        {/* variant picker */}
        <div className="mt-4 inline-flex w-full rounded-pill p-1" style={{ background: 'rgba(26,26,26,0.06)' }}>
          {variants.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={!v.enabled}
              onClick={() => setVariant(v.id)}
              className="flex-1 rounded-pill px-3 py-2 text-[12.5px] font-semibold transition-colors"
              style={{
                cursor: v.enabled ? 'pointer' : 'not-allowed',
                background: variant === v.id ? 'var(--color-brand)' : 'transparent',
                color: variant === v.id ? 'var(--color-text-onbrand)' : v.enabled ? 'var(--color-text-muted)' : 'var(--color-text-faint)',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* optional score — variant (a) only, ephemeral */}
        {variant === 'result' && (
          <div className="mt-3">
            <input
              value={score}
              onChange={(e) => setScore(e.target.value.replace(/[^0-9\- ,/]/g, '').slice(0, 24))}
              inputMode="numeric"
              placeholder="Add score (optional) — e.g. 6-4 6-3"
              className="num w-full rounded-[14px] px-4 py-3 text-[14px] ltr-nums nums-tabular text-ink outline-none"
              style={{ background: 'var(--surface-card)', border: '1px solid rgba(26,26,26,0.12)' }}
            />
          </div>
        )}

        {/* actions */}
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex h-[52px] flex-1 items-center justify-center gap-2 rounded-pill border-none text-[15px] font-semibold text-onbrand"
            style={{ background: 'var(--color-brand)', boxShadow: '0 14px 28px -12px var(--color-brand)' }}
          >
            <Share2 size={16} strokeWidth={2} /> Share
          </button>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy link"
            className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-pill bg-transparent text-brand"
            style={{ border: '1.5px solid color-mix(in srgb, var(--color-brand) 40%, transparent)' }}
          >
            <Copy size={17} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
          <Check size={12} strokeWidth={2} /> Always optional · share whenever you like
        </div>
      </div>
    </div>
  )
}

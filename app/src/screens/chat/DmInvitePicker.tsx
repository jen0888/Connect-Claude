import { Clock, MapPin, Send, X } from 'lucide-react'
import { SportArt } from '@/components/SportArt'
import { useToast } from '@/components/Toast'
import { actions, invitableMatchesFor, useDB } from '@/lib/store'
import { artType, courtLabel, hm, matchKind, whenLabel } from '@/lib/format'
import type { User } from '@/lib/types'

/** §5 — "invite to play" sheet opened from a DM. Lists the matches the current
 *  user hosts that `other` could still be invited to; picking one sends the
 *  invite (host→player `match_requests` row via invite_player), which then
 *  renders as an invite card in the DM timeline. Styled to match VenuePicker /
 *  InvitePicker so the create-match sheets feel like one family. */
export function DmInvitePicker({ other, onClose }: { other: User; onClose: () => void }) {
  const db = useDB()
  const { showToast } = useToast()
  const matches = invitableMatchesFor(db, other.id)
  const first = other.name.split(' ')[0]

  const invite = (matchId: string) => {
    actions.invitePlayer(matchId, other.id)
    showToast(`${first} invited`)
    onClose()
  }

  return (
    <div onClick={onClose} className="absolute inset-0 z-45 flex items-end justify-center backdrop-blur-[2px]" style={{ background: 'rgba(26,26,26,0.45)' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90%] w-full max-w-[430px] flex-col rounded-t-[28px] bg-page"
        style={{ boxShadow: '0 -24px 60px -24px rgba(26,26,26,0.6)' }}
      >
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-[38px] rounded-pill" style={{ background: 'rgba(26,26,26,0.18)' }} />
        </div>

        <div className="flex items-start gap-3 px-[22px] pt-3 pb-3.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-brand">
              <Send size={12} strokeWidth={2} /> Invite to play
            </div>
            <h2 className="m-0 font-display text-[28px] font-normal leading-none" style={{ letterSpacing: '-0.015em' }}>
              Invite <span className="italic text-brand">{first}</span>.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.06)' }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="scroll-area flex-1 overflow-y-auto px-3.5 pb-[26px]" style={{ scrollbarWidth: 'none' }}>
          {matches.length === 0 ? (
            <div className="mx-2 mt-1 rounded-[18px] px-5 py-8 text-center" style={{ background: 'rgba(255,255,255,0.6)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="mb-1.5 font-display text-[20px]" style={{ letterSpacing: '-0.012em' }}>
                Nothing to <span className="italic text-accent">invite</span> to.
              </div>
              <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                Host a match (or free up a spot) and {first} will show up here.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {matches.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => invite(m.id)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-[16px] border bg-card px-3.5 py-3 text-start transition-transform hover:-translate-y-px"
                  style={{ borderColor: 'rgba(26,26,26,0.08)' }}
                >
                  <div className="h-[46px] w-[46px] shrink-0 overflow-hidden rounded-[12px]">
                    <SportArt type={artType(m)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-semibold text-ink">{m.name || `${matchKind(m)} · ${courtLabel(m)}`}</div>
                    <div className="mt-[3px] flex min-w-0 items-center gap-1.5 truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                      <Clock size={12} strokeWidth={1.9} className="shrink-0" />
                      <span className="ltr-nums">{whenLabel(m.start_time)} · {hm(m.start_time)}</span>
                      <span className="opacity-50">·</span>
                      <MapPin size={12} strokeWidth={1.9} className="shrink-0" />
                      <span className="truncate">{m.venue_name}</span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-brand px-3 py-1.5 text-[11px] font-semibold text-onbrand" style={{ boxShadow: '0 6px 14px -6px var(--color-brand)' }}>
                    <Send size={11} strokeWidth={2.2} /> Invite
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { Check, ChevronRight, Hourglass, MessageCircle, Shield, X, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { MatchRequest, User } from '@/lib/types'
import { initials } from '@/lib/format'

/** Approval-flow atoms (approval-shared.jsx): profile peek + decision buttons
 *  + resolved note. Trust signals follow CLAUDE.md §5 — level, matches played,
 *  attendance — never star ratings, and never a gate, just transparency. */

function AfAvatar({ user, size = 48 }: { user: User; size?: number }) {
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent font-display italic text-onbrand"
      style={{ width: size, height: size, fontSize: size * 0.42, letterSpacing: '0.02em', boxShadow: '0 4px 12px -6px rgba(26,26,26,0.4)' }}
    >
      {initials(user)}
    </div>
  )
}

function StatChips({ user }: { user: User }) {
  const items = [
    { icon: <Shield size={12} strokeWidth={1.9} />, label: <span className="capitalize">{user.skill_level}</span>, key: 'level' },
    {
      icon: <Zap size={13} strokeWidth={1.9} />,
      label: (
        <span>
          <strong className="font-semibold text-ink">{user.matches_played}</strong> played
        </span>
      ),
      key: 'played',
    },
    {
      icon: <Check size={13} strokeWidth={2.2} />,
      label: <span>{user.attendance_rate}% attendance</span>,
      key: 'attendance',
    },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
      {items.map((it, i) => (
        <span key={it.key} className="inline-flex items-center gap-[5px] whitespace-nowrap text-[11.5px] font-medium nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
          {i > 0 && <span className="-ms-2 h-[3px] w-[3px] rounded-full opacity-50" style={{ background: 'var(--color-text-faint)' }} />}
          <span className="inline-flex" style={{ color: 'var(--color-text-faint)' }}>
            {it.icon}
          </span>
          {it.label}
        </span>
      ))}
    </div>
  )
}

export function ProfilePeek({ user, mode, note }: { user: User; mode: 'request' | 'invite'; note?: string }) {
  const navigate = useNavigate()
  return (
    <div className="rounded-[18px] border bg-page px-4 py-[15px]" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
      <button
        type="button"
        onClick={() => navigate(`/players/${user.id}`)}
        className="flex w-full cursor-pointer items-center gap-[13px] border-none bg-transparent p-0 text-start text-inherit"
      >
        <AfAvatar user={user} size={52} />
        <div className="min-w-0 flex-1">
          <div className="mb-[3px] text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-faint)' }}>
            {mode === 'invite' ? 'Invited by' : 'Requested by'}
          </div>
          <div className="truncate font-display text-[23px] leading-none" style={{ letterSpacing: '-0.012em' }}>
            {user.name}
          </div>
          <div className="mt-1.5">
            <StatChips user={user} />
          </div>
        </div>
        <ChevronRight size={16} strokeWidth={2} className="shrink-0 rtl:rotate-180" style={{ color: 'var(--color-text-faint)' }} />
      </button>
      {note && (
        <div className="mt-3 flex gap-[9px] border-t pt-3" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
          <MessageCircle size={14} strokeWidth={1.9} className="mt-px shrink-0 text-brand" />
          <p className="m-0 font-display text-[16px] leading-[1.4]" style={{ letterSpacing: '-0.005em', color: 'rgba(26,26,26,0.78)' }}>
            “{note}”
          </p>
        </div>
      )}
    </div>
  )
}

export function DecisionButtons({
  mode,
  onApprove,
  onDecline,
  size = 'lg',
}: {
  mode: 'request' | 'invite'
  onApprove: () => void
  onDecline: () => void
  size?: 'sm' | 'lg'
}) {
  const h = size === 'sm' ? 42 : 52
  const fs = size === 'sm' ? 13.5 : 15
  return (
    <div className="flex gap-2.5">
      <button
        type="button"
        onClick={onDecline}
        className="inline-flex flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill bg-transparent font-semibold tracking-[0.01em]"
        style={{ height: h, fontSize: fs, color: 'var(--color-danger)', border: '1.5px solid color-mix(in srgb, var(--color-danger) 27%, transparent)' }}
      >
        <X size={15} strokeWidth={2.2} /> Decline
      </button>
      <button
        type="button"
        onClick={onApprove}
        className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill border-none font-semibold tracking-[0.01em] text-onbrand"
        style={{ height: h, fontSize: fs, background: 'var(--color-success)', boxShadow: '0 12px 24px -10px var(--color-success)' }}
      >
        <Check size={15} strokeWidth={2.4} /> {mode === 'invite' ? 'Accept' : 'Approve'}
      </button>
    </div>
  )
}

const RESOLVED: Record<string, { color: string; muted?: boolean; icon: typeof Check; title: string }> = {
  approved: { color: 'var(--color-success)', icon: Check, title: 'Approved' },
  accepted: { color: 'var(--color-success)', icon: Check, title: 'Accepted' },
  declined: { color: 'var(--color-text-faint)', muted: true, icon: X, title: 'Declined' },
  expired: { color: 'var(--color-warning)', icon: Hourglass, title: 'Expired' },
}

export function ResolvedNote({ status, text }: { status: MatchRequest['status']; text: string }) {
  const r = RESOLVED[status] ?? RESOLVED.approved
  const Icon = r.icon
  return (
    <div
      className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-3"
      style={{
        background: r.muted ? 'rgba(26,26,26,0.06)' : `color-mix(in srgb, ${r.color} 8%, transparent)`,
        border: `1px solid ${r.muted ? 'rgba(26,26,26,0.08)' : `color-mix(in srgb, ${r.color} 20%, transparent)`}`,
      }}
    >
      <span
        className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
        style={{ background: r.muted ? 'rgba(26,26,26,0.10)' : r.color, color: r.muted ? 'var(--color-text-muted)' : '#fff' }}
      >
        <Icon size={15} strokeWidth={2.4} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-semibold" style={{ color: r.muted ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
          {r.title}
        </div>
        <div className="mt-px text-[11.5px] leading-[1.35]" style={{ color: 'var(--color-text-muted)' }}>
          {text}
        </div>
      </div>
    </div>
  )
}

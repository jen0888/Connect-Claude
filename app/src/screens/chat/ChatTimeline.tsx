import { forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Check,
  ChevronRight,
  CircleX,
  Clock,
  Flag,
  FlagTriangleRight,
  Lock,
  MailPlus,
  MapPin,
  Send,
  Trophy,
  UserMinus,
  UserPlus,
  X,
  Zap,
} from 'lucide-react'
import { SportArt } from '@/components/SportArt'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, useDB } from '@/lib/store'
import { artType, courtLabel, hm, initials, matchKind, skillLabel, whenLabel } from '@/lib/format'
import type { ChatMessage, Match, MatchRequest, SystemIcon, TimelineItem, User } from '@/lib/types'

/**
 * The one renderer, many message types (chat-room §1). Given a thread's
 * `TimelineItem[]` (from `threadTimeline`), it dispatches each item by `kind`:
 *   text → chat bubble · system → centred line · invite → §5 card · decision → §7 card
 * Every thread screen (match group · DM · group chat) renders through this, so
 * the bubble/line/card styling lives in exactly one place.
 */

const SYS_ICONS: Record<SystemIcon, typeof Flag> = {
  flag: Flag,
  userPlus: UserPlus,
  userMinus: UserMinus,
  lock: Lock,
  check: Check,
  bell: Bell,
  xCircle: CircleX,
  trophy: Trophy,
  flagFinish: FlagTriangleRight,
}

const TONES = {
  info: { fg: 'rgba(26,26,26,0.5)', bg: 'transparent', dashed: false },
  wait: { fg: 'var(--color-text-faint)', bg: 'transparent', dashed: true },
  pos: { fg: 'var(--color-success)', bg: 'color-mix(in srgb, var(--color-success) 8%, transparent)', dashed: false },
  warm: { fg: 'var(--color-brand)', bg: 'color-mix(in srgb, var(--color-brand) 9%, transparent)', dashed: false },
  alert: { fg: 'var(--color-danger)', bg: 'color-mix(in srgb, var(--color-danger) 8%, transparent)', dashed: false },
} as const

export function SystemLine({ item }: { item: ChatMessage }) {
  const s = TONES[item.tone ?? 'info']
  const pill = s.bg !== 'transparent'
  const Icon = SYS_ICONS[item.icon ?? 'flag']
  return (
    <div className="flex justify-center py-[3px]">
      <div
        className="inline-flex max-w-[88%] items-center gap-[7px] rounded-pill text-center text-[11.5px] leading-[1.3] tracking-[0.01em]"
        style={{
          padding: pill ? '6px 13px' : '2px 4px',
          background: s.bg,
          border: s.dashed ? '1px dashed rgba(26,26,26,0.18)' : 'none',
          color: s.fg,
          fontWeight: pill ? 600 : 500,
        }}
      >
        <Icon size={13} strokeWidth={2} className="shrink-0" />
        <span style={{ textWrap: 'pretty' }}>{item.body}</span>
        <span className="shrink-0 font-medium opacity-60 nums-tabular ltr-nums">· {hm(item.created_at)}</span>
      </div>
    </div>
  )
}

function TextBubble({ msg, mine, sender, showName }: { msg: ChatMessage; mine: boolean; sender: User | undefined; showName: boolean }) {
  return (
    <div className="flex items-end gap-2" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
      {!mine && (
        <div className="w-[26px] shrink-0 self-end">
          {showName && sender && (
            <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent font-display text-[12px] italic text-onbrand">
              {initials(sender)}
            </div>
          )}
        </div>
      )}
      <div className="flex max-w-[74%] flex-col" style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <div
          className="px-[13px] py-[9px] text-[14px] leading-[1.4]"
          style={{
            background: mine ? 'var(--color-brand)' : 'rgba(26,26,26,0.06)',
            color: mine ? 'var(--color-text-onbrand)' : 'var(--color-text)',
            borderRadius: 18,
            borderEndEndRadius: mine ? 5 : 18,
            borderEndStartRadius: mine ? 18 : 5,
            boxShadow: mine ? '0 10px 22px -16px var(--color-brand)' : 'none',
          }}
        >
          {showName && !mine && sender && <div className="mb-[3px] text-[11px] font-semibold tracking-[0.01em] text-accent">{sender.name.split(' ')[0]}</div>}
          {msg.body}
        </div>
        <span className="mx-1 mt-1 text-[10px] tracking-[0.03em] nums-tabular ltr-nums" style={{ color: 'rgba(26,26,26,0.4)' }}>
          {hm(msg.created_at)}
        </span>
      </div>
    </div>
  )
}

/** small match-summary strip reused by the invite + decision cards */
function MatchStrip({ match }: { match: Match }) {
  const openSpots = Math.max(0, match.spots_available)
  return (
    <div className="flex items-center gap-3 rounded-[14px] px-3 py-2.5" style={{ border: '1px solid rgba(26,26,26,0.08)', background: 'var(--surface-card)' }}>
      <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-[11px]">
        <SportArt type={artType(match)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[17px] leading-[1.15] text-ink" style={{ letterSpacing: '-0.01em' }}>
          {match.name || `${matchKind(match)} · ${courtLabel(match)}`}
        </div>
        <div className="mt-[3px] flex min-w-0 items-center gap-1.5 truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
          <Clock size={12} strokeWidth={1.9} className="shrink-0" />
          <span className="ltr-nums">{whenLabel(match.start_time)} · {hm(match.start_time)}</span>
          <span className="opacity-50">·</span>
          <MapPin size={12} strokeWidth={1.9} className="shrink-0" />
          <span className="truncate">{match.venue_name}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-center self-stretch justify-center ps-3 text-center" style={{ borderInlineStart: '1px solid rgba(26,26,26,0.08)' }}>
        <div className="font-display text-[22px] leading-none nums-tabular" style={{ color: 'var(--color-accent)' }}>{openSpots}</div>
        <div className="mt-0.5 text-[8.5px] font-bold uppercase" style={{ letterSpacing: '0.16em', color: 'var(--color-text-faint)' }}>Spots</div>
      </div>
    </div>
  )
}

/** compact resolved follow-up line for a settled invite/decision (§5/§7) */
function ResolvedLine({ color, icon: Icon, text }: { color: string; icon: typeof Check; text: string }) {
  const muted = color === 'muted'
  const c = muted ? 'var(--color-text-faint)' : color
  return (
    <div className="flex justify-center py-[3px]">
      <div
        className="inline-flex max-w-[88%] items-center gap-[7px] rounded-pill px-3 py-[6px] text-[11.5px] font-semibold leading-[1.3]"
        style={{ background: muted ? 'rgba(26,26,26,0.05)' : `color-mix(in srgb, ${c} 9%, transparent)`, color: c }}
      >
        <Icon size={13} strokeWidth={2.2} className="shrink-0" />
        <span style={{ textWrap: 'pretty' }}>{text}</span>
      </div>
    </div>
  )
}

/** §5 — host→player match invite, rendered inline in a DM. Actionable for the
 *  invited player; status pill + follow-up line for the host. */
function InviteCard({ request, match, host, player }: { request: MatchRequest; match: Match; host: User; player: User }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const iAmPlayer = player.id === currentUserId
  const first = (iAmPlayer ? host : player).name.split(' ')[0]

  if (request.status !== 'invited') {
    if (request.status === 'joined' || request.status === 'accepted' || request.status === 'promoted')
      return <ResolvedLine color="var(--color-success)" icon={Check} text={iAmPlayer ? `You joined ${matchKind(match)} · ${courtLabel(match)}` : `${first} accepted your invite`} />
    if (request.status === 'declined')
      return <ResolvedLine color="muted" icon={X} text={iAmPlayer ? 'You declined this invite' : `${first} declined the invite`} />
    return <ResolvedLine color="muted" icon={Clock} text="Invite expired — match no longer available" />
  }

  return (
    <div className="my-1 flex justify-center">
      <div
        className="w-full max-w-[88%] rounded-[18px] p-3"
        style={{ background: 'color-mix(in srgb, var(--color-brand) 5%, var(--surface-card))', border: '1px solid color-mix(in srgb, var(--color-brand) 25%, transparent)' }}
      >
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-brand" style={{ letterSpacing: '0.16em' }}>
          <Send size={11} strokeWidth={2} /> Match invite
        </div>
        <button type="button" onClick={() => navigate(`/matches/${match.id}`)} className="block w-full cursor-pointer border-none bg-transparent p-0 text-start">
          <MatchStrip match={match} />
        </button>
        {iAmPlayer ? (
          <div className="mt-2.5 flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                actions.declineInvite(request.id)
                showToast('Invite declined')
              }}
              className="inline-flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-transparent text-[13px] font-semibold"
              style={{ color: 'color-mix(in srgb, var(--color-danger) 80%, transparent)', border: '1.5px solid color-mix(in srgb, var(--color-danger) 24%, transparent)' }}
            >
              <X size={14} strokeWidth={2.2} /> Decline
            </button>
            <button
              type="button"
              onClick={() => {
                const res = actions.acceptInvite(request.id)
                if (res === 'expired') {
                  showToast('Match just filled')
                } else {
                  showToast("You're in")
                  navigate(`/chat/match/${match.id}`)
                }
              }}
              className="inline-flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill border-none text-[13px] font-semibold text-onbrand"
              style={{ background: 'var(--color-brand)', boxShadow: '0 10px 20px -10px var(--color-brand)' }}
            >
              <Check size={14} strokeWidth={2.4} /> Accept
            </button>
          </div>
        ) : (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[11.5px] font-semibold" style={{ background: 'rgba(26,26,26,0.05)', color: 'var(--color-text-muted)' }}>
            <MailPlus size={12} strokeWidth={2} /> Invite sent · awaiting {first}'s reply
          </div>
        )}
      </div>
    </div>
  )
}

/** §7 — host's inbound join request, rendered inline in the match thread.
 *  Approve / Decline; once settled it collapses to a follow-up line. */
function DecisionCard({ request, match, player }: { request: MatchRequest; match: Match; player: User }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const first = player.name.split(' ')[0]

  if (request.status === 'declined') return <ResolvedLine color="muted" icon={X} text={`You declined ${first}'s request`} />
  if (request.status === 'joined' || request.status === 'approved') return null // the "joined" system line is the follow-up
  // a sibling request won the last spot → this one is read-time expired (§5)
  if (request.status === 'expired') return <ResolvedLine color="muted" icon={Lock} text={`${first}'s request — match full, no longer available`} />
  if (request.status !== 'requested') return null
  const full = match.spots_available <= 0

  return (
    <div className="my-1 flex justify-center">
      <div
        className="w-full max-w-[88%] rounded-[18px] p-3"
        style={{ background: 'color-mix(in srgb, var(--color-info) 5%, var(--surface-card))', border: '1px solid color-mix(in srgb, var(--color-info) 25%, transparent)' }}
      >
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase" style={{ letterSpacing: '0.16em', color: 'var(--color-info)' }}>
          <UserPlus size={11} strokeWidth={2} /> Join request
        </div>
        <button type="button" onClick={() => navigate(`/players/${player.id}`)} className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-start">
          <span className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-[19px] italic text-onbrand">
            {initials(player)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[20px] leading-none" style={{ letterSpacing: '-0.012em' }}>{player.name}</span>
            <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
              <span className="inline-flex items-center gap-[5px]"><Zap size={12} strokeWidth={1.9} className="text-accent" /> {player.matches_played} played</span>
              <span className="inline-flex items-center gap-[5px]"><Check size={12} strokeWidth={2} className="text-accent" /> {player.attendance_rate}% attendance</span>
              <span className="capitalize">{skillLabel(player.skill_level)}</span>
            </span>
          </span>
          <ChevronRight size={16} strokeWidth={2} className="shrink-0 rtl:rotate-180" style={{ color: 'rgba(26,26,26,0.3)' }} />
        </button>
        {full ? (
          <div
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[11.5px] font-semibold"
            style={{ background: 'color-mix(in srgb, var(--color-neutral) 14%, transparent)', color: 'var(--color-neutral)' }}
          >
            <Lock size={12} strokeWidth={2} /> Match full · no longer available
          </div>
        ) : (
          <div className="mt-2.5 flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                actions.declineRequest(request.id)
                showToast('Request declined')
              }}
              className="inline-flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-transparent text-[13px] font-semibold"
              style={{ color: 'color-mix(in srgb, var(--color-danger) 80%, transparent)', border: '1.5px solid color-mix(in srgb, var(--color-danger) 24%, transparent)' }}
            >
              <X size={14} strokeWidth={2.2} /> Decline
            </button>
            <button
              type="button"
              onClick={() => {
                const res = actions.approveRequest(request.id)
                showToast(res === 'full' ? 'Match just filled' : `${first} approved`)
              }}
              className="inline-flex h-[42px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-pill border-none text-[13px] font-semibold text-onbrand"
              style={{ background: 'var(--color-success)', boxShadow: '0 10px 20px -10px var(--color-success)' }}
            >
              <Check size={14} strokeWidth={2.4} /> Approve
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export const ChatTimeline = forwardRef<HTMLDivElement, { items: TimelineItem[]; showSenderNames?: boolean }>(
  function ChatTimeline({ items, showSenderNames = true }, ref) {
    const db = useDB()
    return (
      <div ref={ref} className="scroll-area relative z-1 flex flex-1 flex-col gap-2 overflow-y-auto px-4 pt-2.5 pb-3.5">
        {items.map((item, i) => {
          if (item.kind === 'system') return <SystemLine key={item.id} item={item.msg} />
          if (item.kind === 'invite') return <InviteCard key={item.id} {...item} />
          if (item.kind === 'decision') return <DecisionCard key={item.id} {...item} />
          // text bubble — show the sender label on the first of a run (group/match only)
          const prev = items[i - 1]
          const mine = item.msg.sender_id === currentUserId
          const runStart = !prev || prev.kind !== 'text' || prev.msg.sender_id !== item.msg.sender_id
          return (
            <TextBubble
              key={item.id}
              msg={item.msg}
              mine={mine}
              sender={getUser(db, item.msg.sender_id)}
              showName={showSenderNames && runStart}
            />
          )
        })}
      </div>
    )
  },
)

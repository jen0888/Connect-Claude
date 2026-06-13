import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowUp, ChevronLeft, EllipsisVertical, Flag, ShieldAlert, UserRound } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, dmThreadWith, getUser, threadMessages, useDB } from '@/lib/store'
import { hm, initials, skillLabel } from '@/lib/format'

/** 1:1 DM (conversation.jsx) — open DMs (anyone → anyone) with guardrails:
 *  first-contact banner from strangers and in-thread report/block via the
 *  ⋯ menu. Block kills the thread both ways (CLAUDE.md §5). */
export function ConversationScreen() {
  const { userId } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [draft, setDraft] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const other = userId ? getUser(db, userId) : undefined
  const thread = userId ? dmThreadWith(db, userId) : undefined
  const msgs = thread ? threadMessages(db, thread.id) : []

  // first contact from a stranger: they messaged you, you've never replied,
  // and you've never shared a match with them
  const theirMsgs = msgs.filter((m) => m.sender_id !== currentUserId)
  const myMsgs = msgs.filter((m) => m.sender_id === currentUserId)
  const sharedMatch = other
    ? db.matchPlayers.some((a) => a.player_id === currentUserId && db.matchPlayers.some((b) => b.player_id === other.id && b.match_id === a.match_id))
    : false
  const firstContact = theirMsgs.length > 0 && myMsgs.length === 0 && !sharedMatch

  useEffect(() => {
    if (thread) actions.markThreadRead(thread.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, msgs.length])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length])

  if (!other) return null

  const send = async () => {
    if (!draft.trim()) return
    const id = thread?.id ?? (await actions.getOrCreateDM(other.id))
    if (id) actions.sendMessage(id, draft)
    setDraft('')
  }

  return (
    <Shell nav={false} blobs={false}>
      <div className="flex h-full flex-col">
        {/* header */}
        <div
          className="relative z-4 flex shrink-0 items-center gap-[11px] border-b px-3.5 pt-[52px] pb-3 backdrop-blur-[16px]"
          style={{ background: 'rgba(244,240,232,0.86)', borderColor: 'rgba(26,26,26,0.06)' }}
        >
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.06)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <button onClick={() => navigate(`/players/${other.id}`)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-[11px] border-none bg-transparent p-0 text-start">
            <div className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-[17px] italic text-onbrand">
              {initials(other)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15.5px] font-semibold text-ink" style={{ letterSpacing: '-0.01em' }}>
                {other.name}
              </div>
              <div className="mt-px truncate text-[11.5px] capitalize" style={{ color: 'var(--color-text-muted)' }}>
                {other.sport} · {skillLabel(other.skill_level)}
              </div>
            </div>
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="More"
              className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
              style={{ background: 'rgba(26,26,26,0.06)' }}
            >
              <EllipsisVertical size={17} strokeWidth={1.9} />
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30" />
                <div
                  className="absolute end-0 top-[calc(100%+8px)] z-31 w-[200px] overflow-hidden rounded-[16px] border bg-card py-1"
                  style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 18px 40px -14px rgba(26,26,26,0.45)' }}
                >
                  {[
                    { icon: UserRound, label: 'View profile', danger: false, fn: () => navigate(`/players/${other.id}`) },
                    { icon: Flag, label: 'Report', danger: true, fn: () => navigate(`/safety/report/${other.id}`) },
                    {
                      icon: ShieldAlert,
                      label: 'Block',
                      danger: true,
                      fn: () => {
                        actions.blockUser(other.id)
                        showToast(`${other.name.split(' ')[0]} blocked`)
                        navigate('/chat')
                      },
                    },
                  ].map((it) => (
                    <button
                      key={it.label}
                      onClick={() => {
                        setMenuOpen(false)
                        it.fn()
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 border-none bg-transparent px-3.5 py-2.5 text-start text-[13.5px] font-medium"
                      style={{ color: it.danger ? 'var(--color-danger)' : 'var(--color-text)' }}
                    >
                      <it.icon size={15} strokeWidth={1.9} />
                      {it.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* first-contact banner from strangers */}
        {firstContact && (
          <div
            className="relative z-2 mx-4 mt-2 flex shrink-0 items-center gap-[11px] rounded-[14px] px-[13px] py-2.5"
            style={{ background: 'color-mix(in srgb, var(--color-info) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--color-info) 20%, transparent)' }}
          >
            <ShieldAlert size={16} strokeWidth={1.9} className="shrink-0" style={{ color: 'var(--color-info)' }} />
            <div className="min-w-0 flex-1 text-[11.5px] leading-[1.45]" style={{ color: 'var(--color-text-muted)' }}>
              <span className="font-semibold text-ink">{other.name.split(' ')[0]} messaged you first.</span> You haven't played together yet — their profile and
              attendance record are public if you want a look.
            </div>
          </div>
        )}

        {/* messages */}
        <div ref={scrollRef} className="scroll-area relative z-1 flex flex-1 flex-col gap-2 overflow-y-auto px-4 pt-2.5 pb-3.5">
          {msgs.map((msg, i) => {
            const mine = msg.sender_id === currentUserId
            const prev = msgs[i - 1]
            const showAvatar = !mine && (!prev || prev.sender_id !== msg.sender_id)
            return (
              <div key={msg.id} className="flex items-end gap-2" style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                {!mine && (
                  <div className="w-[26px] shrink-0 self-end">
                    {showAvatar && (
                      <div className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-accent font-display text-[12px] italic text-onbrand">
                        {initials(other)}
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
                    {msg.body}
                  </div>
                  <span className="mx-1 mt-1 text-[10px] tracking-[0.03em] nums-tabular ltr-nums" style={{ color: 'rgba(26,26,26,0.4)' }}>
                    {hm(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* composer */}
        <div
          className="relative z-3 flex shrink-0 items-end gap-[9px] border-t px-4 pt-2.5 pb-[30px] backdrop-blur-[16px]"
          style={{ background: 'rgba(244,240,232,0.92)', borderColor: 'rgba(26,26,26,0.06)' }}
        >
          <div className="flex min-h-[42px] flex-1 items-center rounded-[22px] border bg-card pe-1.5 ps-4" style={{ borderColor: 'rgba(26,26,26,0.12)' }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Message"
              className="min-w-0 flex-1 border-none bg-transparent py-[11px] text-[14px] text-ink outline-none"
            />
            <button
              onClick={send}
              aria-label="Send"
              disabled={!draft.trim()}
              className="ms-1.5 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-none transition-colors"
              style={{
                cursor: draft.trim() ? 'pointer' : 'default',
                background: draft.trim() ? 'var(--color-brand)' : 'rgba(26,26,26,0.12)',
                color: draft.trim() ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.4)',
              }}
            >
              <ArrowUp size={16} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>
    </Shell>
  )
}

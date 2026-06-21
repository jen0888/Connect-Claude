import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Users } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { actions, getUser, threadById, threadOthers, threadTitle, threadTimeline, useDB } from '@/lib/store'
import { initials } from '@/lib/format'
import { ChatTimeline } from '@/screens/chat/ChatTimeline'
import { MentionInput } from '@/screens/chat/MentionInput'
import type { User } from '@/lib/types'

/** Group chat (§8) — a non-match thread with 3+ members, created from New
 *  Message multi-select. Thread-addressed (not pair-addressed like a DM) and
 *  renders through the shared ChatTimeline (§1). */
export function GroupChatScreen() {
  const { threadId } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const scrollRef = useRef<HTMLDivElement>(null)

  const thread = threadId ? threadById(db, threadId) : undefined
  const timeline = thread ? threadTimeline(db, thread.id) : []

  useEffect(() => {
    if (thread) actions.markThreadRead(thread.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.id, timeline.length])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [timeline.length])

  if (!thread) return null

  const others = threadOthers(db, thread)
  const title = threadTitle(db, thread)
  // mention roster = every thread member (MentionInput drops self)
  const roster = thread.participant_ids.map((id) => getUser(db, id)).filter((u): u is User => !!u)

  return (
    <Shell nav={false} blobs={false}>
      <div className="flex h-full flex-col">
        {/* header */}
        <div
          className="relative z-4 flex shrink-0 items-center gap-[11px] border-b px-3.5 pt-[52px] pb-3 backdrop-blur-[16px]"
          style={{ background: 'rgba(244,240,232,0.86)', borderColor: 'rgba(26,26,26,0.06)' }}
        >
          <button
            onClick={() => navigate('/chat')}
            aria-label="Back"
            className="inline-flex h-[38px] w-[38px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.06)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          {/* clustered avatars */}
          <div className="relative h-[38px] w-[44px] shrink-0">
            {others.slice(0, 2).map((u, i) => (
              <div
                key={u.id}
                className="absolute inline-flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent font-display text-[13px] italic text-onbrand"
                style={{ top: i === 0 ? 0 : 'auto', bottom: i === 1 ? 0 : 'auto', insetInlineStart: i === 0 ? 0 : 'auto', insetInlineEnd: i === 1 ? 0 : 'auto', border: '2px solid var(--surface-page)' }}
              >
                {initials(u)}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15.5px] font-semibold text-ink" style={{ letterSpacing: '-0.01em' }}>
              {title}
            </div>
            <div className="mt-px flex items-center gap-1 truncate text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              <Users size={12} strokeWidth={1.9} className="shrink-0" />
              <span className="nums-tabular">{thread.participant_ids.length}</span> people
            </div>
          </div>
        </div>

        {/* messages */}
        <ChatTimeline ref={scrollRef} items={timeline} />

        {/* composer — shared @mention input (members only) */}
        <MentionInput roster={roster} onSend={(body, ids) => actions.sendMessage(thread.id, body, ids)} />
      </div>
    </Shell>
  )
}

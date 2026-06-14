import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft, Search, Users } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { actions, currentUserId, useDB } from '@/lib/store'
import { initials, skillLabel } from '@/lib/format'

/** New Message — pick one player for a DM, or several for a group chat (§8).
 *  Multi-select: 1 selected → the one canonical DM (never forks); 2+ selected →
 *  a group thread (create_group_thread). Open DMs (anyone → anyone); new
 *  conversations are rate-limited server-side later — the caption sets it now. */
export function NewMessageScreen() {
  const db = useDB()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const players = useMemo(
    () =>
      db.users
        .filter((u) => u.id !== currentUserId && !db.blockedUserIds.includes(u.id))
        .filter((u) => !query.trim() || u.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [db, query],
  )

  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const start = async () => {
    if (picked.length === 0 || busy) return
    setBusy(true)
    if (picked.length === 1) {
      const id = await actions.getOrCreateDM(picked[0])
      navigate(id ? `/chat/dm/${picked[0]}` : '/chat')
    } else {
      const id = await actions.createGroupThread(picked)
      navigate(id ? `/chat/group/${id}` : '/chat')
    }
  }

  const isGroup = picked.length >= 2

  return (
    <Shell nav={false}>
      <div className="flex h-full flex-col">
        <div className="relative z-2 px-6 pt-[56px] pb-3.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="mb-3 inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.05)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <h1 className="m-0 font-display text-[34px] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
            New <span className="italic text-accent">{isGroup ? 'group' : 'message'}</span>.
          </h1>
          <p className="mt-2 mb-0 text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
            Pick one person to chat, or several to start a group. Anyone can message anyone — keep it friendly.
          </p>

          <div
            className="mt-4 flex items-center gap-2 rounded-pill border bg-card px-3.5 py-2.5"
            style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 1px 0 rgba(26,26,26,0.02), 0 10px 22px -18px rgba(26,26,26,0.18)' }}
          >
            <Search size={16} strokeWidth={2} style={{ color: 'rgba(26,26,26,0.5)' }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search players…"
              className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-ink outline-none"
            />
          </div>
        </div>

        <div className="scroll-area relative z-1 flex flex-1 flex-col gap-1.5 overflow-y-auto px-6 pb-[120px]">
          {players.map((p) => {
            const on = picked.includes(p.id)
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-[16px] border px-3.5 py-3 text-start transition-transform hover:-translate-y-px"
                style={{
                  background: on ? 'color-mix(in srgb, var(--color-brand) 6%, var(--surface-card))' : 'var(--surface-card)',
                  borderColor: on ? 'color-mix(in srgb, var(--color-brand) 45%, transparent)' : 'rgba(26,26,26,0.07)',
                }}
              >
                <div className="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-accent font-display text-[19px] italic text-onbrand">
                  {initials(p)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold text-ink">{p.name}</div>
                  <div className="mt-0.5 text-[11.5px] capitalize nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                    {p.sport} · {skillLabel(p.skill_level)} · {p.matches_played} matches
                  </div>
                </div>
                <span
                  className="inline-flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full text-onbrand"
                  style={{ border: on ? 'none' : '1.5px solid rgba(26,26,26,0.18)', background: on ? 'var(--color-brand)' : 'transparent' }}
                >
                  {on && <Check size={13} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
          {players.length === 0 && (
            <div className="mt-1.5 rounded-[18px] px-5 py-7 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                No players match “{query}”.
              </div>
            </div>
          )}
        </div>

        {/* sticky start-chat CTA — appears once at least one player is picked */}
        {picked.length > 0 && (
          <div
            className="relative z-3 shrink-0 border-t px-6 pt-3 pb-[26px] backdrop-blur-[16px]"
            style={{ background: 'rgba(244,240,232,0.92)', borderColor: 'rgba(26,26,26,0.06)' }}
          >
            <button
              type="button"
              onClick={start}
              disabled={busy}
              className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-pill border-none text-[15px] font-semibold tracking-[0.01em] text-onbrand"
              style={{ background: 'var(--color-brand)', boxShadow: '0 12px 28px -10px var(--color-brand)', opacity: busy ? 0.7 : 1, cursor: busy ? 'default' : 'pointer' }}
            >
              {isGroup ? (
                <>
                  <Users size={15} strokeWidth={2} /> Start group · <span className="nums-tabular">{picked.length}</span>
                </>
              ) : (
                <>
                  Message <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}

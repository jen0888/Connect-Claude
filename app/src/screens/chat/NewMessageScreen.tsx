import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { currentUserId, useDB } from '@/lib/store'
import { initials, skillLabel } from '@/lib/format'

/** New Message — pick a player, open the one canonical DM (new-chat.jsx).
 *  Open DMs with guardrails: new conversations are rate-limited (~10–15/day)
 *  server-side later; the caption sets the expectation now. */
export function NewMessageScreen() {
  const db = useDB()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const players = useMemo(
    () =>
      db.users
        .filter((u) => u.id !== currentUserId && !db.blockedUserIds.includes(u.id))
        .filter((u) => !query.trim() || u.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [db, query],
  )

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
            New <span className="italic text-accent">message</span>.
          </h1>
          <p className="mt-2 mb-0 text-[12.5px]" style={{ color: 'var(--color-text-muted)' }}>
            Anyone can message anyone — keep it friendly. New conversations are limited each day.
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

        <div className="relative z-1 flex flex-1 flex-col gap-1.5 overflow-y-auto px-6 pb-10">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/chat/dm/${p.id}`)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-[16px] border bg-card px-3.5 py-3 text-start transition-transform hover:-translate-y-px"
              style={{ borderColor: 'rgba(26,26,26,0.07)' }}
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
              <ChevronRight size={15} strokeWidth={2} className="shrink-0 rtl:rotate-180" style={{ color: 'rgba(26,26,26,0.3)' }} />
            </button>
          ))}
          {players.length === 0 && (
            <div className="mt-1.5 rounded-[18px] px-5 py-7 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                No players match “{query}”.
              </div>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

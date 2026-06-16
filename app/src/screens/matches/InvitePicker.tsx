import { useMemo, useState } from 'react'
import { ArrowRight, Check, Search, X } from 'lucide-react'
import { currentUserId, useDB } from '@/lib/store'
import { initials, skillLabel } from '@/lib/format'

/** Invite-players bottom sheet — the dropdown the host opens from the
 *  create/edit demo form when "Invite only" is the join mode. Multi-select
 *  from the player directory; selection is held on the localStorage
 *  HostedMatch (invitedPlayerIds), not the store, so the demo flow stays
 *  self-contained (CLAUDE.md §5/§7 — invite is host→player, holds no slot).
 *  Styled to match VenuePicker so create-match sheets feel like one family. */

const fieldCls = 'w-full rounded-md border bg-card px-3.5 py-[11px] text-[14px] text-ink outline-none'
const fieldStyle = { borderColor: 'rgba(26,26,26,0.18)' }

export function InvitePicker({
  excludeIds = [],
  femaleOnly = false,
  onClose,
  onConfirm,
}: {
  /** players already invited (or otherwise excluded) — hidden from the picker so
   *  the host can only ADD new invitees; removal happens via the inline list (§5) */
  excludeIds?: string[]
  /** restrict the directory to female players (a 'ladies' match — §6) */
  femaleOnly?: boolean
  onClose: () => void
  /** the newly-picked player ids to ADD to the invited list (never the full set) */
  onConfirm: (ids: string[]) => void
}) {
  const db = useDB()
  const [picked, setPicked] = useState<string[]>([])
  const [query, setQuery] = useState('')

  // Eligibility is filtered at the DATA layer, not by hiding rows: the host
  // (current user), already-invited players (excludeIds), and ineligible genders
  // are never selectable or searchable. A 'ladies' match shows only women (§5/§6).
  const people = useMemo(
    () => db.users.filter((u) => u.id !== currentUserId && !excludeIds.includes(u.id) && (!femaleOnly || u.gender === 'female')),
    [db.users, excludeIds, femaleOnly],
  )
  const list = useMemo(
    () => people.filter((u) => !query.trim() || u.name.toLowerCase().includes(query.toLowerCase())),
    [people, query],
  )

  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div onClick={onClose} className="absolute inset-0 z-45 flex items-end justify-center backdrop-blur-[2px]" style={{ background: 'rgba(26,26,26,0.45)' }}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90%] w-full flex-col rounded-t-xl bg-page"
        style={{ boxShadow: '0 -24px 60px -24px rgba(26,26,26,0.6)' }}
      >
        {/* grab handle */}
        <div className="flex justify-center pt-2.5">
          <div className="h-1 w-[38px] rounded-pill" style={{ background: 'rgba(26,26,26,0.18)' }} />
        </div>

        {/* header */}
        <div className="flex items-start gap-3 px-[22px] pt-3 pb-3.5">
          <div className="min-w-0 flex-1">
            <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-text-muted)' }}>
              Private match
            </div>
            <h2 className="m-0 font-display text-[28px] font-normal leading-none" style={{ letterSpacing: '-0.015em' }}>
              Invite <span className="italic text-brand">players</span>.
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

        {/* search */}
        <div className="px-[22px] pb-3">
          <div className="relative flex items-center">
            <Search size={16} strokeWidth={2} className="absolute start-[13px]" style={{ color: 'var(--color-text-muted)' }} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players…" className={`${fieldCls} ps-10`} style={fieldStyle} />
          </div>
        </div>

        {/* body — player rows */}
        <div className="scroll-area flex-1 overflow-y-auto px-3.5 pt-0.5 pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {list.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              No players match “{query}”.
            </div>
          )}
          <div className="flex flex-col">
            {list.map((u) => {
              const on = picked.includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u.id)}
                  className="mb-1 flex w-full cursor-pointer items-center gap-3 rounded-[16px] px-3.5 py-[11px] text-start"
                  style={{
                    background: on ? 'var(--surface-card)' : 'transparent',
                    border: `1.5px solid ${on ? 'var(--color-brand)' : 'transparent'}`,
                    boxShadow: on ? '0 8px 22px -14px rgba(26,26,26,0.5)' : 'none',
                  }}
                >
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[16px] italic text-onbrand">
                    {initials(u)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-ink">{u.name}</span>
                    <span className="mt-px block truncate text-[11.5px] nums-tabular" style={{ color: 'var(--color-text-muted)' }}>
                      {skillLabel(u.skill_level)} · {u.matches_played} played
                    </span>
                  </span>
                  <span
                    className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-onbrand"
                    style={{ border: on ? 'none' : '1.5px solid rgba(26,26,26,0.18)', background: on ? 'var(--color-brand)' : 'transparent' }}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* footer */}
        <div className="border-t bg-page px-[22px] pt-3 pb-[22px]" style={{ borderColor: 'rgba(26,26,26,0.10)' }}>
          <button
            type="button"
            onClick={() => onConfirm(picked)}
            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-pill border-none text-[15px] font-semibold tracking-[0.01em] text-onbrand"
            style={{ background: 'var(--color-brand)', boxShadow: '0 12px 28px -10px var(--color-brand)' }}
          >
            {picked.length > 0 ? (
              <>
                Invite <span className="nums-tabular">{picked.length}</span> {picked.length === 1 ? 'player' : 'players'}
                <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
              </>
            ) : (
              'Done'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

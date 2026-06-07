import { useMemo, useState, type ReactNode } from 'react'
import { ArrowLeftRight, ArrowRight, Check, Trophy, X } from 'lucide-react'
import { actions, currentUserId, matchPlayers, useDB } from '@/lib/store'
import { initials } from '@/lib/format'
import type { Match, User } from '@/lib/types'

/** ONE shared "record result" form (record-result.jsx) — rendered identically
 *  on the full Post-Match page and inline inside the chat pinned bar.
 *  Two questions only (CLAUDE.md §5): who played / who was a no-show, and
 *  which side won. No star ratings, no multi-person confirmation step. */

function PmAvatar({ p, size = 34, absent = false }: { p: User; size?: number; absent?: boolean }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-display italic text-onbrand"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: absent ? 'var(--color-neutral)' : 'var(--color-accent)',
        opacity: absent ? 0.6 : 1,
        boxShadow: '0 0 0 2px var(--surface-card)',
      }}
    >
      {initials(p)[0]}
    </span>
  )
}

function PmTag({ tone, icon, children }: { tone: 'pos' | 'alert' | 'accent'; icon?: ReactNode; children: ReactNode }) {
  const color = tone === 'pos' ? 'var(--color-success)' : tone === 'alert' ? 'var(--color-danger)' : 'var(--color-brand)'
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-pill px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em] nums-tabular"
      style={{ background: `color-mix(in srgb, ${color} 9%, transparent)`, color }}
    >
      {icon}
      {children}
    </span>
  )
}

export function RecordResultForm({ match, onSaved, savedSlot }: { match: Match; onSaved?: () => void; savedSlot?: ReactNode }) {
  const db = useDB()
  const roster = matchPlayers(db, match.id)
  const myResult = db.matchResults.find((r) => r.match_id === match.id && r.player_id === currentUserId)
  const [editing, setEditing] = useState(!myResult)
  const locked = !editing

  // who played — default everyone to Played; flag no-shows by tap
  const [absent, setAbsent] = useState<Set<string>>(
    () => new Set(db.matchPlayers.filter((mp) => mp.match_id === match.id && mp.attended === false).map((mp) => mp.player_id)),
  )
  // doubles pick teams on the day → capture sides here
  const [sideOf, setSideOf] = useState<Record<string, 'A' | 'B'>>(() =>
    Object.fromEntries(roster.map((p, i) => [p.id, i % 2 === 0 ? 'A' : 'B'])),
  )
  const [winner, setWinner] = useState<'A' | 'B' | null>(myResult ? (myResult.result === 'win' ? 'A' : 'B') : null)

  const present = roster.filter((p) => !absent.has(p.id))
  const absentList = roster.filter((p) => absent.has(p.id))
  const isDoubles = match.total_spots > 2

  const sideTeams = useMemo(
    () =>
      (['A', 'B'] as const).map((sid) => ({
        id: sid,
        label: sid === 'A' ? 'Side A' : 'Side B',
        players: isDoubles ? present.filter((p) => sideOf[p.id] === sid) : sid === 'A' ? present.filter((p) => p.id === currentUserId) : present.filter((p) => p.id !== currentUserId),
      })),
    [present, sideOf, isDoubles],
  )
  const sidesValid = sideTeams[0].players.length > 0 && sideTeams[1].players.length > 0
  const canSubmit = !!winner && sidesValid

  const toggleAbsent = (id: string) => {
    if (locked || id === currentUserId) return
    setAbsent((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const swapSide = (id: string) => {
    if (locked) return
    setSideOf((s) => ({ ...s, [id]: s[id] === 'A' ? 'B' : 'A' }))
  }

  const submit = () => {
    if (!canSubmit || !winner) return
    // attendance + corroborating no-show reports (threshold computed at read time)
    for (const p of roster) {
      const att = !absent.has(p.id)
      actions.setAttendance(match.id, p.id, att)
      if (!att) actions.reportNoShow(match.id, p.id)
    }
    // result is recorded for yourself; win if your side won
    const mySide = sideTeams.find((t) => t.players.some((p) => p.id === currentUserId))?.id
    actions.recordResult(match.id, currentUserId, mySide === winner ? 'win' : 'loss')
    setEditing(false)
    onSaved?.()
  }

  const sectionHead = (label: string, summary?: ReactNode) => (
    <div className="mb-2.5 flex items-center justify-between">
      <span className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--color-text-muted)' }}>
        <span className="h-[5px] w-[5px] rounded-full bg-brand" />
        {label}
      </span>
      {summary}
    </div>
  )

  const cardStyle = { background: 'var(--surface-card)', border: '1px solid rgba(26,26,26,0.10)', borderRadius: 18 }

  /* doubles side column — tap a name to move them across */
  const sideColumn = (team: (typeof sideTeams)[number]) => {
    const sel = winner === team.id
    const empty = team.players.length === 0
    return (
      <div
        key={team.id}
        className="flex min-w-0 flex-1 flex-col gap-2 rounded-[14px] px-[11px] pt-[11px] pb-3 transition-all"
        style={{
          border: sel ? '1.5px solid var(--color-brand)' : '1px solid rgba(26,26,26,0.10)',
          background: sel ? 'color-mix(in srgb, var(--color-brand) 5%, transparent)' : 'var(--surface-card)',
        }}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: sel ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
            {team.label}
          </span>
          <button
            type="button"
            disabled={empty || locked}
            onClick={() => setWinner(team.id)}
            className="inline-flex items-center gap-1 rounded-pill px-[9px] py-1 text-[9.5px] font-bold tracking-[0.02em]"
            style={{
              cursor: empty || locked ? 'default' : 'pointer',
              border: sel ? 'none' : '1px solid rgba(26,26,26,0.18)',
              background: sel ? 'var(--color-brand)' : 'transparent',
              color: sel ? 'var(--color-text-onbrand)' : empty ? 'rgba(26,26,26,0.3)' : 'var(--color-text-muted)',
            }}
          >
            {sel ? (
              <>
                <Trophy size={10} strokeWidth={2.2} /> Won
              </>
            ) : (
              'Mark won'
            )}
          </button>
        </div>
        <div className="flex flex-col gap-[5px]">
          {team.players.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={locked || !isDoubles}
              onClick={() => swapSide(p.id)}
              className="flex items-center gap-[7px] rounded-[10px] border-none px-[7px] py-[5px] text-start text-ink"
              style={{ cursor: locked || !isDoubles ? 'default' : 'pointer', background: 'rgba(26,26,26,0.06)' }}
            >
              <PmAvatar p={p} size={22} />
              <span className="truncate text-[12px] font-semibold">{p.id === currentUserId ? 'You' : p.name.split(' ')[0]}</span>
              {!locked && isDoubles && <ArrowLeftRight size={12} strokeWidth={2} className="ms-auto shrink-0" style={{ color: 'var(--color-text-muted)' }} />}
            </button>
          ))}
          {empty && (
            <div className="px-[7px] py-[5px] text-[11px] italic" style={{ color: 'var(--color-text-muted)' }}>
              No one here
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 text-ink">
      {/* Q1 · who played */}
      <div>
        {sectionHead('Who played', <PmTag tone={absentList.length ? 'alert' : 'pos'}>{present.length} of {roster.length} played</PmTag>)}
        <div className="px-3.5 py-0.5" style={cardStyle}>
          {roster.map((p, i) => {
            const isAbsent = absent.has(p.id)
            const you = p.id === currentUserId
            return (
              <div key={p.id} className="flex items-center gap-[11px] py-[9px]" style={{ borderBottom: i < roster.length - 1 ? '1px solid rgba(26,26,26,0.10)' : 'none' }}>
                <PmAvatar p={p} absent={isAbsent} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-semibold" style={{ color: isAbsent ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: isAbsent ? 'line-through' : 'none' }}>
                    {p.name}
                    {you && <span className="font-medium" style={{ color: 'var(--color-text-muted)' }}> · you</span>}
                  </div>
                </div>
                {locked ? (
                  <PmTag tone={isAbsent ? 'alert' : 'pos'} icon={isAbsent ? <X size={11} strokeWidth={2.4} /> : <Check size={11} strokeWidth={2.4} />}>
                    {isAbsent ? 'No-show' : 'Played'}
                  </PmTag>
                ) : you ? (
                  <PmTag tone="pos" icon={<Check size={11} strokeWidth={2.4} />}>
                    Played
                  </PmTag>
                ) : (
                  <div className="inline-flex rounded-pill p-[3px]" style={{ background: 'rgba(26,26,26,0.06)' }}>
                    {(
                      [
                        { on: !isAbsent, label: 'Played', color: 'var(--color-success)' },
                        { on: isAbsent, label: 'No-show', color: 'var(--color-danger)' },
                      ] as const
                    ).map((seg) => (
                      <button
                        key={seg.label}
                        type="button"
                        onClick={() => toggleAbsent(p.id)}
                        className="cursor-pointer rounded-pill border-none px-[11px] py-1.5 text-[11px] font-semibold transition-colors"
                        style={{ background: seg.on ? seg.color : 'transparent', color: seg.on ? 'var(--color-text-onbrand)' : 'var(--color-text-muted)' }}
                      >
                        {seg.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {absentList.length > 0 && (
          <div
            className="mt-[9px] px-3.5 py-3"
            style={{ ...cardStyle, background: 'color-mix(in srgb, var(--color-danger) 4%, transparent)', borderColor: 'color-mix(in srgb, var(--color-danger) 20%, transparent)' }}
          >
            <div className="text-[11.5px] leading-[1.45]" style={{ color: 'var(--color-text-muted)' }}>
              <span className="font-semibold text-ink">{absentList.map((p) => p.name.split(' ')[0]).join(' & ')}</span> will be marked as a no-show on their profile
              once enough players confirm. It's a reliability note, not a penalty — no one gets blocked.
            </div>
          </div>
        )}
      </div>

      {/* Q2 · who won */}
      <div className="mt-[18px]">
        {sectionHead('Who won', winner ? <PmTag tone="accent" icon={<Trophy size={11} strokeWidth={2.2} />}>{sideTeams.find((t) => t.id === winner)?.label}</PmTag> : null)}
        {isDoubles && !locked && (
          <div className="-mt-0.5 mb-2.5 text-[11.5px] leading-[1.45]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
            Casual doubles pick teams on the day. Set the sides — tap a name to move them across — then mark who won.
          </div>
        )}
        <div className="flex items-stretch gap-[9px]">{sideTeams.map(sideColumn)}</div>
        {!sidesValid && !locked && (
          <div className="mt-[9px] flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: 'var(--color-danger)' }}>
            <X size={12} strokeWidth={2.4} /> Put at least one player on each side.
          </div>
        )}
      </div>

      {/* seal */}
      <div className="mt-[18px]">
        {locked ? (
          <>
            <div
              className="flex items-center gap-3 rounded-[16px] px-[15px] py-[13px]"
              style={{ background: 'color-mix(in srgb, var(--color-success) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 20%, transparent)' }}
            >
              <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: 'var(--color-success)' }}>
                <Check size={15} strokeWidth={2.4} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold" style={{ color: 'var(--color-success)' }}>
                  Result saved
                </div>
                <div className="mt-px text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
                  Added to everyone's match history.
                </div>
              </div>
            </div>
            <div className="mt-2.5 flex gap-[9px]">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-[46px] flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-pill text-[13px] font-semibold text-ink"
                style={{ border: '1.5px solid rgba(26,26,26,0.18)', background: 'rgba(244,240,232,0.5)' }}
              >
                Edit result
              </button>
              {savedSlot}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-[9px]">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex h-[52px] w-full items-center justify-center gap-[9px] rounded-pill border-none text-[15px] font-semibold transition-colors"
              style={{
                cursor: canSubmit ? 'pointer' : 'default',
                background: canSubmit ? 'var(--color-brand)' : 'rgba(26,26,26,0.14)',
                color: canSubmit ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.4)',
                boxShadow: canSubmit ? '0 14px 28px -12px var(--color-brand)' : 'none',
              }}
            >
              Submit result <ArrowRight size={14} strokeWidth={2} className="rtl:rotate-180" />
            </button>
            <div className="text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
              {canSubmit ? 'You can change this until the match closes.' : 'Mark who won to submit.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { MatchCard } from '@/components/MatchCard'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, matchPlayers, savedMatches, thisWeekMatches, useDB } from '@/lib/store'

/** "See all" destinations for the capped Home sections (CLAUDE.md §4):
 *   • week  → /my-matches/week  — every upcoming joined match (This week)
 *   • saved → /saved            — every bookmarked, still-joinable match
 *  Both render the canonical card's BRIEF variant — never a per-page card.
 *  Stacked sub-screens under Home (no 4th tab). */
export function MatchListScreen({ kind }: { kind: 'week' | 'saved' }) {
  const db = useDB()
  const { showToast } = useToast()
  const matches = kind === 'week' ? thisWeekMatches(db) : savedMatches(db)

  const eyebrow = kind === 'week' ? 'Your week' : 'Bookmarked'
  const empty = kind === 'week'
    ? 'No other matches on your calendar this week.'
    : 'Nothing saved yet — bookmark a match from Discover to keep it here.'

  return (
    <Shell>
      <div className="flex h-full flex-col">
        {/* sticky header */}
        <div className="relative z-2 px-6 pt-[60px] pb-3.5" style={{ background: 'linear-gradient(180deg, var(--surface-page) 70%, transparent 100%)' }}>
          <div className="mb-[18px] flex items-center justify-between">
            <Link
              to="/home"
              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border text-ink no-underline backdrop-blur-[8px] rtl:rotate-180"
              style={{ borderColor: 'rgba(26,26,26,0.12)', background: 'rgba(255,255,255,0.7)' }}
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </Link>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
              {eyebrow}
            </div>
            <h1 className="m-0 font-display text-[38px] font-normal leading-none" style={{ letterSpacing: '-0.02em' }}>
              {kind === 'week' ? (
                <>
                  This <span className="italic text-accent">week</span>.
                </>
              ) : (
                <>
                  Saved for <span className="italic text-accent">later</span>.
                </>
              )}
            </h1>
          </div>
        </div>

        {/* list */}
        <div className="scroll-area relative z-1 flex flex-1 flex-col gap-3 overflow-y-auto px-6 pt-3 pb-[120px]">
          {matches.length === 0 ? (
            <div className="mt-1.5 rounded-[18px] px-5 py-7 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
              <div className="text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
                {empty}
              </div>
            </div>
          ) : (
            matches.map((m) => (
              <MatchCard
                key={m.id}
                variant="brief"
                match={m}
                host={m.host_id !== currentUserId ? getUser(db, m.host_id) : null}
                players={matchPlayers(db, m.id)}
                action={kind === 'saved' ? 'join' : 'view'}
                onAct={
                  kind === 'saved'
                    ? () => {
                        if (m.join_mode === 'approval') {
                          actions.requestToJoin(m.id)
                          showToast('Request sent')
                        } else {
                          actions.joinMatch(m.id)
                          showToast('Joined')
                        }
                      }
                    : undefined
                }
                saved={kind === 'saved' ? db.savedMatchIds.includes(m.id) : undefined}
                onToggleSave={kind === 'saved' ? () => actions.toggleSaveMatch(m.id) : undefined}
              />
            ))
          )}
        </div>
      </div>
    </Shell>
  )
}

import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Compass, House, MessageCircle } from 'lucide-react'
import { useI18n } from '@/i18n'
import { actions, notificationCount, useDB } from '@/lib/store'

/** Floating frosted pill bar — three tabs only, never a fourth (CLAUDE.md §4).
 *  Active tab raises into a filled CTA bubble (home-screens.jsx BottomNav). */
const TABS = [
  { id: 'discover', path: '/discover', labelKey: 'nav.discover', Icon: Compass },
  { id: 'home', path: '/home', labelKey: 'nav.home', Icon: House },
  { id: 'chat', path: '/chat', labelKey: 'nav.chat', Icon: MessageCircle },
] as const

/** small count badge anchored to a tab icon — notifications live in Chat, so
 *  incoming join requests (and other alerts) surface here, not a Home bell
 *  (CLAUDE.md §4). Numerals stay LTR + tabular; position mirrors in RTL (§7). */
function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      className="absolute -top-1.5 -end-2 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-pill px-[5px] text-[10px] font-semibold leading-none text-onbrand nums-tabular ltr-nums"
      style={{ background: 'var(--color-warning)', boxShadow: '0 0 0 2px var(--surface-page)' }}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

export function BottomNav({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const db = useDB()
  const onChat = pathname.startsWith('/chat')
  const notifCount = notificationCount(db)
  // The badge clears once Chat is open (mark everything seen) and only returns
  // when a genuinely NEW notification arrives. Clamp `seen` back down when the
  // live count drops so an actioned/expired alert can't suppress a later one.
  useEffect(() => {
    if (onChat) {
      if (db.notifSeenCount !== notifCount) actions.markNotificationsSeen(notifCount)
    } else if (db.notifSeenCount > notifCount) {
      actions.markNotificationsSeen(notifCount)
    }
  }, [onChat, notifCount, db.notifSeenCount])
  const chatBadge = onChat ? 0 : Math.max(0, notifCount - db.notifSeenCount)
  const bg = dark ? 'rgba(26,26,26,0.85)' : 'rgba(244,240,232,0.92)'
  const muted = dark ? 'rgba(244,240,232,0.45)' : 'rgba(26,26,26,0.45)'

  return (
    <nav
      className="absolute inset-x-5 bottom-[22px] z-5 flex items-end justify-around gap-2 rounded-pill px-[22px] pt-3 pb-3.5 backdrop-blur-[18px]"
      style={{
        background: bg,
        boxShadow: dark
          ? '0 16px 36px -14px rgba(0,0,0,0.55), 0 0 0 1px rgba(244,240,232,0.06)'
          : '0 16px 36px -14px rgba(26,26,26,0.28), 0 0 0 1px rgba(26,26,26,0.06)',
      }}
    >
      {TABS.map(({ id, path, labelKey, Icon }) => {
        const on = pathname.startsWith(path)
        const badge = id === 'chat' ? chatBadge : 0
        if (on) {
          return (
            <NavLink key={id} to={path} className="relative -mt-[22px] flex flex-col items-center gap-1.5 no-underline">
              <span
                className="relative inline-flex h-[54px] w-[54px] scale-105 items-center justify-center rounded-full bg-brand text-onbrand"
                style={{ boxShadow: `0 10px 24px -8px var(--color-brand), 0 0 0 4px ${bg}` }}
              >
                <Icon size={22} strokeWidth={1.7} />
                <TabBadge count={badge} />
              </span>
              <span className="text-[10.5px] font-semibold tracking-[0.04em]" style={{ color: muted }}>
                {t(labelKey)}
              </span>
            </NavLink>
          )
        }
        return (
          <NavLink key={id} to={path} className="relative flex flex-col items-center gap-1 pb-0.5 no-underline" style={{ color: muted }}>
            <span className="relative inline-flex">
              <Icon size={22} strokeWidth={1.7} />
              <TabBadge count={badge} />
            </span>
            <span className="text-[10.5px] font-medium tracking-[0.04em]">{t(labelKey)}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

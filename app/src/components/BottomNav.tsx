import { NavLink, useLocation } from 'react-router-dom'
import { Compass, House, MessageCircle } from 'lucide-react'
import { useI18n } from '@/i18n'

/** Floating frosted pill bar — three tabs only, never a fourth (CLAUDE.md §4).
 *  Active tab raises into a filled CTA bubble (home-screens.jsx BottomNav). */
const TABS = [
  { id: 'discover', path: '/discover', labelKey: 'nav.discover', Icon: Compass },
  { id: 'home', path: '/home', labelKey: 'nav.home', Icon: House },
  { id: 'chat', path: '/chat', labelKey: 'nav.chat', Icon: MessageCircle },
] as const

export function BottomNav({ dark = false }: { dark?: boolean }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
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
        if (on) {
          return (
            <NavLink key={id} to={path} className="relative -mt-[22px] flex flex-col items-center gap-1.5 no-underline">
              <span
                className="inline-flex h-[54px] w-[54px] scale-105 items-center justify-center rounded-full bg-brand text-onbrand"
                style={{ boxShadow: `0 10px 24px -8px var(--color-brand), 0 0 0 4px ${bg}` }}
              >
                <Icon size={22} strokeWidth={1.7} />
              </span>
              <span className="text-[10.5px] font-semibold tracking-[0.04em]" style={{ color: muted }}>
                {t(labelKey)}
              </span>
            </NavLink>
          )
        }
        return (
          <NavLink key={id} to={path} className="relative flex flex-col items-center gap-1 pb-0.5 no-underline" style={{ color: muted }}>
            <Icon size={22} strokeWidth={1.7} />
            <span className="text-[10.5px] font-medium tracking-[0.04em]">{t(labelKey)}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

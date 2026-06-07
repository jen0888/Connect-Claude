import type { ReactNode } from 'react'

/** Section eyebrow — overline label with an accent dot (home-screens.jsx). */
export function Eyebrow({ children, accent = 'var(--color-accent)', dark = false }: { children: ReactNode; accent?: string; dark?: boolean }) {
  return (
    <div
      className="inline-flex items-center gap-2 whitespace-nowrap text-[10.5px] font-medium uppercase tracking-[0.2em]"
      style={{ color: dark ? 'rgba(244,240,232,0.6)' : 'var(--color-text-muted)' }}
    >
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: accent }} />
      {children}
    </div>
  )
}

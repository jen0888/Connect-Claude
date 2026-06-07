/** Avatar + AvatarStack — ported from home-screens.jsx.
 *  Monogram initials stay Latin even in Arabic (design decision). */

export function Avatar({ name = 'A', dark = false, accent }: { name?: string; dark?: boolean; accent?: string }) {
  const init = (name || 'A').slice(0, 1).toUpperCase()
  return (
    <div
      className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-full font-display italic text-[20px] text-onbrand"
      style={{
        background: accent ?? (dark ? 'rgba(244,240,232,0.12)' : 'var(--color-text)'),
        boxShadow: dark ? 'none' : '0 2px 10px -2px rgba(26,26,26,0.18)',
      }}
    >
      {init}
    </div>
  )
}

export function AvatarStack({
  initials,
  filled,
  max,
  dark = false,
  accent = 'var(--color-brand)',
}: {
  /** monogram initials of joined players, in join order */
  initials: string[]
  /** joined count (may exceed initials length) */
  filled: number
  max: number
  dark?: boolean
  accent?: string
}) {
  const bg = dark ? 'rgba(244,240,232,0.18)' : 'rgba(26,26,26,0.08)'
  const fg = dark ? 'var(--surface-page)' : 'var(--color-text)'
  const ring = dark ? 'var(--color-text)' : '#fff'
  const shown = Math.min(filled, 3)
  const empty = max - filled
  return (
    <div className="inline-flex items-center">
      {Array.from({ length: shown }, (_, i) => (
        <div
          key={i}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold tracking-[0.04em]"
          style={{ background: bg, color: fg, marginInlineStart: i ? -8 : 0, boxShadow: `0 0 0 1.5px ${ring}` }}
        >
          {initials[i] ?? '·'}
        </div>
      ))}
      {empty > 0 && (
        <div
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium nums-tabular"
          style={{
            color: accent,
            marginInlineStart: shown ? -8 : 0,
            border: `1.5px dashed ${accent}`,
            boxShadow: `0 0 0 1.5px ${ring}`,
          }}
        >
          +{empty}
        </div>
      )}
    </div>
  )
}

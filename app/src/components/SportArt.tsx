import type { CSSProperties } from 'react'

/** Tiny SVG court/route illustrations — ported from home-screens.jsx.
 *  No raster images anywhere; these are the card art headers. */

interface ArtProps {
  bg?: string
  line?: string
  accent?: string
  style?: CSSProperties
}

export function PadelCourtArt({ bg = 'var(--surface-dark-2)', line = 'var(--surface-page)', accent = 'var(--color-brand)', style }: ArtProps) {
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: '100%', ...style }}>
      <rect width="200" height="100" fill={bg} />
      <g stroke={line} strokeOpacity=".55" strokeWidth="1" fill="none">
        <rect x="22" y="20" width="156" height="60" rx="0" />
        <line x1="100" y1="20" x2="100" y2="80" />
        <line x1="22" y1="32" x2="178" y2="32" />
        <line x1="22" y1="68" x2="178" y2="68" />
        <line x1="60" y1="32" x2="60" y2="68" />
        <line x1="140" y1="32" x2="140" y2="68" />
      </g>
      <circle cx="100" cy="50" r="2.5" fill={accent} />
    </svg>
  )
}

export function TennisCourtArt({ bg = '#2b3a52', line = 'var(--surface-page)', accent = 'var(--color-brand)', style }: ArtProps) {
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: '100%', ...style }}>
      <rect width="200" height="100" fill={bg} />
      <g stroke={line} strokeOpacity=".55" strokeWidth="1" fill="none">
        <rect x="22" y="22" width="156" height="56" />
        <line x1="100" y1="22" x2="100" y2="78" />
        <line x1="22" y1="50" x2="178" y2="50" />
        <line x1="44" y1="34" x2="44" y2="66" />
        <line x1="156" y1="34" x2="156" y2="66" />
        <line x1="44" y1="34" x2="156" y2="34" />
        <line x1="44" y1="66" x2="156" y2="66" />
      </g>
      <circle cx="100" cy="50" r="2.5" fill={accent} />
    </svg>
  )
}

export function RunPathArt({ bg = '#2a3a30', line = 'var(--surface-page)', accent = 'var(--color-brand)', style }: ArtProps) {
  return (
    <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMid slice" style={{ display: 'block', width: '100%', height: '100%', ...style }}>
      <rect width="200" height="100" fill={bg} />
      <path d="M10 80 Q40 30 70 55 T130 50 T195 25" stroke={line} strokeOpacity=".5" strokeWidth="1.2" fill="none" strokeDasharray="3 4" />
      <circle cx="10" cy="80" r="3" fill={line} opacity=".7" />
      <circle cx="195" cy="25" r="3.5" fill={accent} />
    </svg>
  )
}

/** Same fallback behaviour as the prototype's artFor(): run / tennis / padel-style default. */
export function SportArt({ type, accent }: { type: 'padel' | 'tennis' | 'run'; accent?: string }) {
  if (type === 'run') return <RunPathArt accent={accent} />
  if (type === 'tennis') return <TennisCourtArt accent={accent} />
  return <PadelCourtArt accent={accent} />
}

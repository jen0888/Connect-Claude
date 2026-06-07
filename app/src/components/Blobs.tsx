import type { CSSProperties } from 'react'

/**
 * Connect's signature three-blob ambient background
 * (peach top-right · sage top-left · soft pink bottom-right).
 * Port of the prototype's blobs-bg.js custom element.
 *
 * Place as the first child of a relatively-positioned,
 * overflow-hidden screen root; sibling content must sit at z-index ≥ 1.
 */
export function Blobs({
  accentA = 'var(--blob-peach)',
  accentB = 'var(--blob-sage)',
  accentC = 'var(--blob-pink)',
  opacity = 0.55,
  tint = false,
}: {
  accentA?: string
  accentB?: string
  accentC?: string
  opacity?: number
  tint?: boolean
}) {
  const blur = tint ? 60 : 50
  const op = tint ? Math.max(opacity, 0.7) : opacity
  const base: CSSProperties = {
    position: 'absolute',
    borderRadius: '50%',
    filter: `blur(${blur}px)`,
    pointerEvents: 'none',
    willChange: 'transform',
    animation: 'blob-drift 9s ease-in-out infinite alternate',
  }
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden motion-reduce:[&_*]:animate-none">
      <div
        style={{
          ...base,
          width: 280,
          height: 280,
          top: -80,
          right: -90,
          background: accentA,
          opacity: op,
        }}
      />
      <div
        style={{
          ...base,
          width: 240,
          height: 240,
          top: 320,
          left: -90,
          background: accentB,
          opacity: op,
          animationDelay: '-3s',
        }}
      />
      <div
        style={{
          ...base,
          width: 200,
          height: 200,
          bottom: 100,
          right: -70,
          background: accentC,
          opacity: op * 0.72,
          animationDelay: '-5s',
        }}
      />
    </div>
  )
}

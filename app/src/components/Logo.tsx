import logoUrl from '@/assets/connect-logo.png'

/** Brand logo — the single source for the Connect! mark; swap the asset
 *  import here to update it everywhere. Logos are never flipped in RTL
 *  (CLAUDE.md §7). The asset is a transparent PNG (background keyed out,
 *  art trimmed) and bakes in the EN tagline — needs an AR variant later.
 *  alt stays the brand name — locale-invariant, so it bypasses t(). */
export function Logo({ className = '' }: { className?: string }) {
  return <img src={logoUrl} alt="Connect!" className={`block h-auto ${className}`} />
}

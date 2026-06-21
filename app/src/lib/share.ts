/** Share helpers for the post-match share card (CLAUDE.md §5). Player-initiated,
 *  always optional. One-tap Web Share API with a copy-link fallback; the join
 *  link / QR point at the match deep link so a recipient lands on Match Details. */

/** Deep link a recipient opens to view / join the match. */
export function matchJoinUrl(matchId: string): string {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : ''
  return `${origin}/matches/${matchId}`
}

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable'

/** Try the native Web Share sheet; fall back to copying the link to the
 *  clipboard. Returns what actually happened so the caller can toast. */
export async function shareMatch(opts: { title: string; text: string; url: string }): Promise<ShareOutcome> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  if (nav?.share) {
    try {
      await nav.share({ title: opts.title, text: opts.text, url: opts.url })
      return 'shared'
    } catch (err) {
      // user dismissed the sheet — not an error, don't fall back to copy
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // otherwise fall through to the copy fallback
    }
  }
  if (nav?.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(opts.url)
      return 'copied'
    } catch {
      return 'unavailable'
    }
  }
  return 'unavailable'
}

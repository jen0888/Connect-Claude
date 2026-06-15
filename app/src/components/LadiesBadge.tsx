import { UserRound } from 'lucide-react'
import { useI18n } from '@/i18n'

/** "Ladies only" badge for matches with `gender_restriction = 'ladies'`.
 *  One canonical component, reused on the MatchCard (full + brief) and Match
 *  Details, shown inline with the sport/state badges. Accent-tinted pill —
 *  tokens only, no hardcoded hex (CLAUDE.md §3/§6). Label is bilingual; the
 *  icon stays upright in RTL (it isn't directional). */
export function LadiesBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { t } = useI18n()
  const md = size === 'md'
  return (
    <span
      className={`inline-flex items-center rounded-pill font-semibold tracking-[0.01em] ${
        md ? 'gap-1.5 px-[11px] py-1.5 text-[12px]' : 'gap-1 px-2 py-[3px] text-[10.5px]'
      }`}
      style={{ background: 'color-mix(in srgb, var(--color-accent) 13%, transparent)', color: 'var(--color-accent)' }}
    >
      <UserRound size={md ? 13 : 11} strokeWidth={2} />
      {t('match.ladiesOnly')}
    </span>
  )
}

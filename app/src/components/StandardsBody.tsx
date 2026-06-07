import { STANDARDS_INTRO, STANDARDS_SECTIONS, STANDARDS_UPDATED } from '@/content/communityStandards'

/** Full, unabridged Community Standards body — single renderer shared by the
 *  onboarding agree step and Settings → Legal (/safety/guidelines), so the
 *  text can never drift between the two. Content lives in
 *  content/communityStandards.ts. */
export function StandardsBody() {
  return (
    <>
      <div className="mb-5 text-[11px] font-medium nums-tabular ltr-nums" style={{ color: 'var(--color-text-faint)' }}>
        Last updated {STANDARDS_UPDATED} · Stage 1 draft
      </div>
      {STANDARDS_INTRO.map((p) => (
        <p key={p.slice(0, 24)} className="mt-0 mb-4 text-[13px] leading-[1.55]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
          {p}
        </p>
      ))}
      <div className="mt-2 flex flex-col gap-3">
        {STANDARDS_SECTIONS.map((s) => (
          <div key={s.title} className="rounded-[18px] border bg-card p-4 shadow-row" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
            <div className="mb-1.5 flex items-baseline gap-2.5">
              {s.n != null && <span className="font-display text-[18px] italic leading-none text-accent nums-tabular ltr-nums">{String(s.n).padStart(2, '0')}</span>}
              <span className="text-[14.5px] font-semibold text-ink">{s.title}</span>
            </div>
            {s.lead && (
              <p className="m-0 text-[12.5px] leading-[1.55]" style={{ color: 'rgba(26,26,26,0.65)', textWrap: 'pretty' }}>
                {s.lead}
              </p>
            )}
            {s.bullets && (
              <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
                {s.bullets.map((b) => (
                  <li key={b.slice(0, 24)} className="flex gap-2 text-[12.5px] leading-[1.55]" style={{ color: 'rgba(26,26,26,0.65)' }}>
                    <span className="mt-[7px] h-[4px] w-[4px] shrink-0 rounded-full" style={{ background: 'var(--color-accent)' }} />
                    <span style={{ textWrap: 'pretty' }}>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.outro && (
              <p className="m-0 mt-2 text-[12.5px] leading-[1.55]" style={{ color: 'rgba(26,26,26,0.65)', textWrap: 'pretty' }}>
                {s.outro}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

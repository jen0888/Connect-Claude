import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, ChevronLeft, Clock, X } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { useI18n } from '@/i18n'
import { onboarding } from '@/lib/onboarding'
import { STANDARDS_RED, STANDARDS_SCREEN as C, tint, type StandardCard } from '@/content/standardsScreen'

/** Onboarding Community Standards — last step before "All set". Layout per
 *  the screen spec (serif/sans contrast, per-card accents, watermark
 *  numerals, fixed agree footer); all copy + colors come from
 *  content/standardsScreen.ts. No agree, no finish. */

const CARD_SHADOW = '0 1px 0 rgba(26,26,26,0.04), 0 12px 28px -22px rgba(26,26,26,0.18)'
const HAIRLINE = 'rgba(26,26,26,0.08)'

/** small uppercase eyebrow + accent dot before each section */
function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
      <span className="h-[5px] w-[5px] rounded-full bg-brand" />
      {children}
    </div>
  )
}

function StandardCardView({ s }: { s: StandardCard }) {
  const Icon = s.icon
  return (
    <article className="relative overflow-hidden rounded-[22px] bg-card p-5" style={{ boxShadow: CARD_SHADOW }}>
      {/* huge faint italic serif watermark, bleeding off the top corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute font-display italic leading-none nums-tabular ltr-nums"
        style={{ top: -26, insetInlineEnd: -10, fontSize: 110, color: s.accent, opacity: 0.1 }}
      >
        {s.num}
      </span>
      <div className="relative flex flex-col gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: tint(s.accent), color: s.accent }}>
          <Icon size={20} strokeWidth={1.7} />
        </span>
        <div className="flex flex-col gap-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] nums-tabular" style={{ color: s.accent }}>
            {s.kicker}
          </div>
          <h3 className="m-0 font-display text-[24px] font-normal leading-[1.1]" style={{ letterSpacing: '-0.01em' }}>
            {s.title}
          </h3>
        </div>
        <p className="m-0 text-[13px] leading-[1.55]" style={{ color: 'rgba(26,26,26,0.6)', textWrap: 'pretty' }}>
          {s.lead}
        </p>
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {s.checklist.map((item) => (
            <li key={item.slice(0, 24)} className="flex gap-2.5">
              <span className="mt-px inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] text-white" style={{ background: s.accent }}>
                <Check size={11} strokeWidth={2.6} />
              </span>
              <span className="text-[12.5px] leading-[1.5]" style={{ color: 'rgba(26,26,26,0.66)', textWrap: 'pretty' }}>
                {item}
              </span>
            </li>
          ))}
        </ul>
        {s.penalties && (
          <div className="flex flex-col gap-2">
            {s.penalties.map((p) => (
              <div key={p.rule} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[12px] px-3 py-2.5" style={{ background: tint(STANDARDS_RED, 10) }}>
                <Clock size={15} strokeWidth={1.7} className="shrink-0" style={{ color: STANDARDS_RED }} />
                <span className="text-[12px] font-medium nums-tabular" style={{ color: 'rgba(26,26,26,0.82)' }}>
                  {p.rule}
                </span>
                {/* directional flow arrow — flips in RTL */}
                <ArrowRight size={13} strokeWidth={1.7} className="shrink-0 rtl:rotate-180" style={{ color: 'rgba(26,26,26,0.35)' }} />
                <span className="rounded-pill px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ background: tint(STANDARDS_RED, 22), color: STANDARDS_RED }}>
                  {p.result}
                </span>
                <span className="text-[11px]" style={{ color: 'rgba(26,26,26,0.55)' }}>
                  {p.note}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

export function CommunityStandardsScreen() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [agreed, setAgreed] = useState(onboarding.agreedGuidelines)

  const submit = () => {
    if (!agreed) return
    navigate('/onboarding/creating') // full-screen "Creating your account" hold, then All Set
  }

  return (
    <Shell nav={false}>
      <div className="relative z-1 flex h-full flex-col">
        {/* ── fixed top bar: back · progress · "Last step" ── */}
        <div className="flex items-center gap-3.5 px-6 pt-12 pb-3">
          <button
            onClick={() => navigate(-1)}
            aria-label={t('auth.back')}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none text-ink"
            style={{ background: 'rgba(26,26,26,0.06)' }}
          >
            <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
          </button>
          <div className="h-[6px] flex-1 overflow-hidden rounded-pill" style={{ background: 'rgba(26,26,26,0.08)' }}>
            <div className="h-full rounded-pill bg-brand transition-all" style={{ width: '92%' }} />
          </div>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(26,26,26,0.5)' }}>
            {t('onb.rules.lastStep')}
          </span>
        </div>

        {/* ── scrollable body with top fade mask + visible pill scrollbar ── */}
        <div
          className="scroll-area flex-1 overflow-y-auto px-6 pb-8"
          style={{
            maskImage: 'linear-gradient(180deg, transparent 0, #000 28px)',
            WebkitMaskImage: 'linear-gradient(180deg, transparent 0, #000 28px)',
          }}
        >
          <div className="flex flex-col gap-5 pt-4">
            {/* hero */}
            <header className="flex flex-col gap-3">
              <Divider>{C.hero.eyebrow}</Divider>
              <h1 className="m-0 font-display text-[38px] font-normal" style={{ lineHeight: 1.05, letterSpacing: '-0.022em' }}>
                {C.hero.headlineLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </h1>
              <div className="text-[10.5px] font-medium uppercase tracking-[0.16em] nums-tabular ltr-nums" style={{ color: 'rgba(26,26,26,0.5)' }}>
                {C.hero.meta}
              </div>
            </header>

            {/* spirit callout */}
            <section className="relative overflow-hidden rounded-[22px] bg-card p-5" style={{ boxShadow: CARD_SHADOW }}>
              <span aria-hidden className="pointer-events-none absolute font-display italic leading-none" style={{ top: 6, insetInlineEnd: 16, fontSize: 64, color: 'rgba(26,26,26,0.07)' }}>
                ”
              </span>
              <h2 className="m-0 mb-2 font-display text-[22px] font-normal leading-[1.15]" style={{ letterSpacing: '-0.01em' }}>
                {C.spirit.title}
              </h2>
              <p className="m-0 text-[13px] leading-[1.55]" style={{ color: 'rgba(26,26,26,0.6)', textWrap: 'pretty' }}>
                {C.spirit.body}
              </p>
            </section>

            {/* six standards */}
            <Divider>{C.dividers.standards}</Divider>
            {C.standards.map((s) => (
              <StandardCardView key={s.num} s={s} />
            ))}

            {/* what's not allowed */}
            <Divider>{C.dividers.notAllowed}</Divider>
            <section className="rounded-[22px] p-5" style={{ background: tint(STANDARDS_RED, 8), boxShadow: CARD_SHADOW }}>
              <h3 className="m-0 mb-1 font-display text-[22px] font-normal leading-[1.15]" style={{ letterSpacing: '-0.01em' }}>
                {C.notAllowed.title}
              </h3>
              <p className="m-0 mb-3 text-[12.5px]" style={{ color: 'rgba(26,26,26,0.6)' }}>
                {C.notAllowed.lead}
              </p>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {C.notAllowed.items.map((item) => (
                  <li key={item.slice(0, 24)} className="flex gap-2.5">
                    <span className="mt-px inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: STANDARDS_RED }}>
                      <X size={11} strokeWidth={2.6} />
                    </span>
                    <span className="text-[12.5px] leading-[1.5]" style={{ color: 'rgba(26,26,26,0.66)', textWrap: 'pretty' }}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* how we handle problems */}
            <Divider>{C.dividers.handling}</Divider>
            <section className="rounded-[22px] bg-card px-5 py-2" style={{ boxShadow: CARD_SHADOW }}>
              {C.handling.rows.map((row, i) => {
                const RowIcon = row.icon
                return (
                  <div key={row.title} className="flex items-start gap-3 py-3.5" style={{ borderTop: i > 0 ? `1px solid rgba(26,26,26,0.07)` : 'none' }}>
                    <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: tint(row.accent), color: row.accent }}>
                      <RowIcon size={20} strokeWidth={1.7} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13.5px] font-semibold text-ink">{row.title}</span>
                      <span className="text-[12.5px] leading-[1.5]" style={{ color: 'rgba(26,26,26,0.6)', textWrap: 'pretty' }}>
                        {row.desc}
                      </span>
                    </span>
                  </div>
                )
              })}
            </section>

            {/* reporting & blocking */}
            <Divider>{C.dividers.reporting}</Divider>
            <div className="flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-3">
                {C.reporting.cards.map((card) => {
                  const CardIcon = card.icon
                  return (
                    <div key={card.title} className="flex flex-col gap-2 rounded-[20px] bg-card p-4" style={{ boxShadow: CARD_SHADOW }}>
                      <CardIcon size={20} strokeWidth={1.7} className="text-brand" />
                      <span className="font-display text-[19px] font-normal leading-none" style={{ letterSpacing: '-0.01em' }}>
                        {card.title}
                      </span>
                      <span className="text-[12px] leading-[1.5]" style={{ color: 'rgba(26,26,26,0.6)', textWrap: 'pretty' }}>
                        {card.body}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="m-0 text-[12px] leading-[1.5]" style={{ color: 'rgba(26,26,26,0.5)', textWrap: 'pretty' }}>
                {C.reporting.note}
              </p>
            </div>

            {/* closing */}
            <section className="flex flex-col items-center gap-2 pt-6 text-center" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
              <h3 className="m-0 font-display text-[22px] font-normal leading-[1.15]" style={{ letterSpacing: '-0.01em' }}>
                {C.closing.title}
              </h3>
              <p className="m-0 max-w-[300px] text-[12.5px] leading-[1.55]" style={{ color: 'rgba(26,26,26,0.6)', textWrap: 'pretty' }}>
                {C.closing.body}
              </p>
              <div className="font-display text-[15px] italic text-brand">{C.closing.kicker}</div>
            </section>

          </div>
        </div>

        {/* ── fixed footer: agree row + CTA ── */}
        <div className="flex flex-col gap-3.5 px-6 pt-4 pb-7" style={{ background: 'var(--surface-page)', borderTop: `1px solid ${HAIRLINE}` }}>
          <button
            type="button"
            role="checkbox"
            aria-checked={agreed}
            onClick={() =>
              setAgreed((a) => {
                onboarding.agreedGuidelines = !a
                return !a
              })
            }
            className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-start"
          >
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-onbrand transition-colors"
              style={{ background: agreed ? 'var(--color-brand)' : 'transparent', border: agreed ? 'none' : '1.5px solid rgba(26,26,26,0.25)' }}
            >
              {agreed && <Check size={13} strokeWidth={3} />}
            </span>
            <span className="text-[13px] leading-[1.4]" style={{ color: 'rgba(26,26,26,0.66)' }}>
              {t('onb.rules.agreeA')}
              <b className="font-semibold text-ink">{t('onb.rules.agreeBold')}</b>
              {t('onb.rules.agreeB')}
            </span>
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!agreed}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-pill border-none text-[15.5px] font-semibold transition-colors ${
              agreed ? 'cursor-pointer bg-brand text-onbrand hover:bg-black' : 'cursor-not-allowed'
            }`}
            style={agreed ? undefined : { background: 'rgba(26,26,26,0.15)', color: 'rgba(26,26,26,0.4)' }}
          >
            {t('onb.rules.cta')}
          </button>
        </div>
      </div>
    </Shell>
  )
}

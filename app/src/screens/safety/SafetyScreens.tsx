import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, ShieldBan } from 'lucide-react'
import { Shell } from '@/components/Shell'
import { CTA } from '@/components/controls'
import { useToast } from '@/components/Toast'
import { actions, currentUserId, getUser, useDB } from '@/lib/store'
import { initials, skillLabel } from '@/lib/format'
import { StandardsBody } from '@/components/StandardsBody'

/** Safety screens (safety-screens.jsx, blocked-list.jsx, report-*.jsx).
 *  Block & report stay slightly hidden — entry via ⋯ menus; unblock lives
 *  only here (Settings → Safety → Blocked players). CLAUDE.md §5. */

function SafetyShell({ title, accent, eyebrow, children }: { title: string; accent: string; eyebrow?: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <Shell nav={false}>
      <div className="scroll-area relative z-1 h-full overflow-y-auto px-[22px] pt-14 pb-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="mb-2 inline-flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-full border-none text-ink"
          style={{ background: 'rgba(26,26,26,0.05)' }}
        >
          <ChevronLeft size={18} strokeWidth={2} className="rtl:rotate-180" />
        </button>
        <div className="pt-2 pb-5">
          {eyebrow && (
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: accent }}>
              {eyebrow}
            </div>
          )}
          <h1 className="m-0 font-display text-[34px] font-normal leading-[1.02]" style={{ letterSpacing: '-0.022em', textWrap: 'balance' }}>
            {title.split('*')[0]}
            <span className="italic" style={{ color: accent }}>
              {title.split('*')[1]}
            </span>
            {title.split('*')[2] ?? ''}
          </h1>
        </div>
        {children}
      </div>
    </Shell>
  )
}

export function BlockedListScreen() {
  const db = useDB()
  const { showToast } = useToast()
  const blocked = db.blockedUserIds.map((id) => getUser(db, id)).filter((u): u is NonNullable<typeof u> => !!u)

  return (
    <SafetyShell title="Blocked *players*." accent="var(--color-danger)">
      <p className="-mt-2 mb-5 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
        Blocked players can't join your matches, don't see you in Discover, and their messages in shared matches are hidden from you.
      </p>
      {blocked.length === 0 ? (
        <div className="rounded-[18px] px-5 py-8 text-center" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(26,26,26,0.18)' }}>
          <ShieldBan size={22} strokeWidth={1.8} className="mx-auto mb-2.5" style={{ color: 'var(--color-text-faint)' }} />
          <div className="font-display text-[20px]" style={{ letterSpacing: '-0.012em' }}>
            <span className="italic text-accent">No one</span> blocked.
          </div>
          <div className="mt-1.5 text-[12.5px] leading-normal" style={{ color: 'var(--color-text-muted)' }}>
            If someone crosses a line, block them from their profile's ⋯ menu.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {blocked.map((u) => (
            <div key={u.id} className="flex items-center gap-3 rounded-[16px] border bg-card px-3.5 py-3" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
              <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-[18px] italic text-onbrand" style={{ background: 'var(--color-neutral)' }}>
                {initials(u)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-ink">{u.name}</div>
                <div className="mt-0.5 text-[11.5px] capitalize" style={{ color: 'var(--color-text-muted)' }}>
                  {u.sport} · {skillLabel(u.skill_level)}
                </div>
              </div>
              <button
                onClick={() => {
                  actions.unblockUser(u.id)
                  showToast(`${u.name.split(' ')[0]} unblocked`)
                }}
                className="shrink-0 cursor-pointer rounded-pill bg-transparent px-3.5 py-2 text-[12px] font-semibold text-ink"
                style={{ border: '1.5px solid rgba(26,26,26,0.18)' }}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </SafetyShell>
  )
}

const REPORT_REASONS = ['No-show or chronic lateness', 'Unsportsmanlike behaviour', 'Harassment or abuse', 'Fake profile or spam', 'Safety concern', 'Something else']

export function ReportPlayerScreen() {
  const { userId } = useParams()
  const db = useDB()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const target = userId ? getUser(db, userId) : undefined
  const [reason, setReason] = useState<string | null>(null)
  const [detail, setDetail] = useState('')
  const [whoId, setWhoId] = useState<string | null>(userId ?? null)

  const submit = () => {
    if (!reason) return
    showToast('Report sent — we review within 24h')
    navigate(-1)
  }

  return (
    <SafetyShell title="Report a *player*." accent="var(--color-danger)">
      <p className="-mt-2 mb-5 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
        Reports are confidential. We review every one — usually within 24 hours.
      </p>

      {!target && (
        <div className="mb-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
            Who is this about?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {db.users
              .filter((u) => u.id !== currentUserId)
              .map((u) => (
                <button
                  key={u.id}
                  onClick={() => setWhoId(u.id)}
                  className="cursor-pointer rounded-pill px-3 py-2 text-[12.5px] font-medium"
                  style={{
                    border: `1.5px solid ${whoId === u.id ? 'var(--color-danger)' : 'rgba(26,26,26,0.16)'}`,
                    background: whoId === u.id ? 'color-mix(in srgb, var(--color-danger) 7%, transparent)' : 'transparent',
                    color: whoId === u.id ? 'var(--color-danger)' : 'var(--color-text)',
                  }}
                >
                  {u.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {target && (
        <div className="mb-5 flex items-center gap-3 rounded-[16px] border bg-card px-3.5 py-3" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[18px] italic text-onbrand">
            {initials(target)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--color-text-faint)' }}>
              Reporting
            </div>
            <div className="text-[14.5px] font-semibold text-ink">{target.name}</div>
          </div>
        </div>
      )}

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        What happened?
      </div>
      <div className="mb-5 overflow-hidden rounded-[18px] border bg-card [&>*+*]:border-t [&>*+*]:border-[rgba(26,26,26,0.06)]" style={{ borderColor: 'rgba(26,26,26,0.08)' }}>
        {REPORT_REASONS.map((r) => {
          const on = reason === r
          return (
            <button key={r} onClick={() => setReason(r)} className="flex w-full cursor-pointer items-center gap-3 border-none bg-transparent px-4 py-3 text-start">
              <span
                className="inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: on ? 'var(--color-danger)' : 'transparent', border: on ? 'none' : '1.5px solid rgba(26,26,26,0.22)' }}
              >
                {on && <Check size={11} strokeWidth={3} />}
              </span>
              <span className="text-[13.5px] font-medium" style={{ color: on ? 'var(--color-text)' : 'rgba(26,26,26,0.75)' }}>
                {r}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--color-text-muted)' }}>
        Anything else? <span className="font-normal normal-case tracking-normal">(optional)</span>
      </div>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={4}
        placeholder="Add any details that help us understand…"
        className="mb-6 w-full resize-none rounded-md border bg-card px-3.5 py-[11px] text-[14px] text-ink outline-none"
        style={{ borderColor: 'rgba(26,26,26,0.18)' }}
      />
      <CTA onClick={submit} disabled={!reason || (!target && !whoId)}>
        Send report
      </CTA>
      <p className="mt-3.5 mb-0 text-center text-[11.5px]" style={{ color: 'var(--color-text-muted)' }}>
        Thanks for looking out for the community.
      </p>
    </SafetyShell>
  )
}

const PROBLEM_KINDS = ['Something broke', 'Account or sign-in', 'Match or chat issue', 'Feedback or idea']

export function ReportProblemScreen() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [kind, setKind] = useState<string | null>(null)
  const [detail, setDetail] = useState('')

  const submit = () => {
    if (!kind || !detail.trim()) return
    showToast('Sent — we usually reply within 24h')
    navigate(-1)
  }

  return (
    <SafetyShell title="Report a *problem*." accent="var(--color-accent)">
      <p className="-mt-2 mb-5 text-[13px] leading-[1.5]" style={{ color: 'var(--color-text-muted)', textWrap: 'pretty' }}>
        Bugs, account trouble, or just feedback — it all lands with us. We usually reply within 24 hours.
      </p>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {PROBLEM_KINDS.map((k) => {
          const on = kind === k
          return (
            <button
              key={k}
              onClick={() => setKind(k)}
              className="cursor-pointer rounded-pill px-3.5 py-2 text-[12.5px] font-medium transition-colors"
              style={{
                border: `1.5px solid ${on ? 'var(--color-brand)' : 'rgba(26,26,26,0.16)'}`,
                background: on ? 'var(--color-brand)' : 'transparent',
                color: on ? 'var(--color-text-onbrand)' : 'var(--color-text)',
              }}
            >
              {k}
            </button>
          )
        })}
      </div>
      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        rows={5}
        placeholder="Tell us what happened — the more detail, the faster we can fix it…"
        className="mb-6 w-full resize-none rounded-md border bg-card px-3.5 py-[11px] text-[14px] text-ink outline-none"
        style={{ borderColor: 'rgba(26,26,26,0.18)' }}
      />
      <CTA onClick={submit} disabled={!kind || !detail.trim()}>
        Send
      </CTA>
    </SafetyShell>
  )
}

/** Community Standards — the full, unabridged text via the shared
 *  StandardsBody (same body the onboarding agree step renders). */
export function GuidelinesScreen() {
  return (
    <SafetyShell eyebrow="Community standards" title="Treat every player the way you'd *want* to be treated." accent="var(--color-accent)">
      <div className="-mt-2">
        <StandardsBody />
      </div>
    </SafetyShell>
  )
}

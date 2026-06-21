import { useMemo, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { currentUserId } from '@/lib/store'
import { initials } from '@/lib/format'
import type { User } from '@/lib/types'

/** Shared group-chat composer with @mention autocomplete (Stage 1.8, CLAUDE.md §5).
 *  Used by BOTH group surfaces (GroupChatScreen + MatchChatScreen) — never forked.
 *  DMs don't use this. Typing `@` opens an autocomplete of the thread roster
 *  (members ONLY — no free-text mentions); picking inserts `@FirstName` and tracks
 *  the user id; on send it emits the body + the resolved mention ids (those whose
 *  chip text is still present). */
const firstName = (u: User) => u.name.split(' ')[0]

/** the active `@token` immediately before the caret (no whitespace inside it) */
function activeToken(text: string, caret: number): { query: string; start: number } | null {
  const upto = text.slice(0, caret)
  const at = upto.lastIndexOf('@')
  if (at < 0) return null
  if (at > 0 && !/\s/.test(text[at - 1])) return null // must follow start or whitespace
  const between = upto.slice(at + 1)
  if (/\s/.test(between)) return null // token already terminated
  return { query: between, start: at }
}

export function MentionInput({
  roster,
  onSend,
  placeholder = 'Message',
}: {
  roster: User[]
  onSend: (body: string, mentionIds: string[]) => void
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [caret, setCaret] = useState(0)
  // tracked mentions: the user id + the exact chip text inserted (e.g. "@Marco")
  const [mentions, setMentions] = useState<{ id: string; token: string }[]>([])

  // only OTHER thread members are mentionable (you never @ yourself)
  const candidates = useMemo(() => roster.filter((u) => u.id !== currentUserId), [roster])
  const active = activeToken(draft, caret)
  const suggestions = useMemo(() => {
    if (!active) return []
    const q = active.query.toLowerCase()
    return candidates.filter((u) => !q || u.name.toLowerCase().includes(q)).slice(0, 6)
  }, [active, candidates])
  const open = suggestions.length > 0

  const sync = (el: HTMLInputElement) => setCaret(el.selectionStart ?? el.value.length)

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setDraft(text)
    setCaret(e.target.selectionStart ?? text.length)
    // drop any tracked mention whose chip text was edited away
    setMentions((prev) => prev.filter((m) => text.includes(m.token)))
  }

  const pick = (u: User) => {
    if (!active) return
    const token = `@${firstName(u)}`
    const next = draft.slice(0, active.start) + token + ' ' + draft.slice(caret)
    setDraft(next)
    setMentions((prev) => (prev.some((m) => m.id === u.id && m.token === token) ? prev : [...prev, { id: u.id, token }]))
    const pos = active.start + token.length + 1
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (el) {
        el.focus()
        el.setSelectionRange(pos, pos)
        setCaret(pos)
      }
    })
  }

  const send = () => {
    const text = draft.trim()
    if (!text) return
    const ids = [...new Set(mentions.filter((m) => text.includes(m.token)).map((m) => m.id))]
    onSend(text, ids)
    setDraft('')
    setMentions([])
    setCaret(0)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && open) {
      // collapse the popover by terminating the token (no pick)
      e.preventDefault()
      setMentions((m) => m) // no-op; popover closes once token loses focus
      ;(e.target as HTMLInputElement).setSelectionRange(caret, caret)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (open) pick(suggestions[0]) // Enter accepts the top suggestion
      else send()
    }
  }

  return (
    <div
      className="relative z-3 flex shrink-0 items-end gap-[9px] border-t px-4 pt-2.5 pb-[30px] backdrop-blur-[16px]"
      style={{ background: 'rgba(244,240,232,0.92)', borderColor: 'rgba(26,26,26,0.06)' }}
    >
      {/* @mention autocomplete — floats above the composer */}
      {open && (
        <div
          className="absolute inset-x-4 bottom-full mb-2 overflow-hidden rounded-[16px] border bg-card"
          style={{ borderColor: 'rgba(26,26,26,0.10)', boxShadow: '0 18px 40px -22px rgba(26,26,26,0.5)' }}
        >
          {suggestions.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault() // keep input focus
                pick(u)
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start"
              style={{ borderTop: i ? '1px solid rgba(26,26,26,0.07)' : 'none', background: 'transparent' }}
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-display text-[12px] italic text-onbrand">
                {initials(u)}
              </span>
              <span className="truncate text-[13.5px] font-medium text-ink" dir="auto">
                {u.name}
              </span>
              <span className="ms-auto text-[11px] font-semibold text-accent ltr-nums">@{firstName(u)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-[42px] flex-1 items-center rounded-[22px] border bg-card pe-1.5 ps-4" style={{ borderColor: 'rgba(26,26,26,0.12)' }}>
        <input
          ref={inputRef}
          value={draft}
          onChange={change}
          onKeyDown={onKeyDown}
          onKeyUp={(e) => sync(e.currentTarget)}
          onClick={(e) => sync(e.currentTarget)}
          placeholder={placeholder}
          className="min-w-0 flex-1 border-none bg-transparent py-[11px] text-[14px] text-ink outline-none"
        />
        <button
          onClick={send}
          aria-label="Send"
          disabled={!draft.trim()}
          className="ms-1.5 inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border-none transition-colors"
          style={{
            cursor: draft.trim() ? 'pointer' : 'default',
            background: draft.trim() ? 'var(--color-brand)' : 'rgba(26,26,26,0.12)',
            color: draft.trim() ? 'var(--color-text-onbrand)' : 'rgba(26,26,26,0.4)',
          }}
        >
          <ArrowUp size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}

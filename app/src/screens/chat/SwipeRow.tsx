import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** A swipe-left-to-reveal row (chat inbox). Drag the content left to expose a
 *  fixed panel of actions (Archive · Delete) behind its trailing edge; release
 *  past halfway snaps open, else closed.
 *
 *  Works across input types:
 *   - touch / mouse press-drag → pointer events (axis-locked so a vertical drag
 *     still scrolls the list; native link/image dragging is suppressed so the
 *     gesture isn't hijacked).
 *   - laptop trackpad two-finger horizontal swipe → a non-passive wheel listener
 *     (preventDefault stops the browser's back/forward swipe), snapping on idle.
 *
 *  A click while open (or right after a swipe) is swallowed so it doesn't
 *  navigate. Physical LTR for now (RTL gesture mirroring is a later pass). */

export interface SwipeAction {
  key: string
  label: string
  icon: LucideIcon
  bg: string
  fg: string
  onClick: () => void
}

const BTN_W = 76

export function SwipeRow({ children, actions }: { children: ReactNode; actions: SwipeAction[] }) {
  const panelW = actions.length * BTN_W
  const [dx, setDx] = useState(0)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; base: number; axis: null | 'x' | 'y' } | null>(null)
  const didSwipe = useRef(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    didSwipe.current = false
    start.current = { x: e.clientX, y: e.clientY, base: open ? -panelW : 0, axis: null }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const dX = e.clientX - s.x
    const dY = e.clientY - s.y
    if (s.axis === null) {
      if (Math.abs(dX) < 6 && Math.abs(dY) < 6) return
      s.axis = Math.abs(dX) > Math.abs(dY) ? 'x' : 'y'
      if (s.axis === 'x') {
        setDragging(true)
        ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
      }
    }
    if (s.axis !== 'x') return
    e.preventDefault()
    didSwipe.current = true
    setDx(Math.max(-panelW, Math.min(0, s.base + dX)))
  }

  const settle = () => {
    const s = start.current
    start.current = null
    setDragging(false)
    if (!s || s.axis !== 'x') return
    const shouldOpen = dx < -panelW / 2
    setOpen(shouldOpen)
    setDx(shouldOpen ? -panelW : 0)
  }

  const close = () => {
    setOpen(false)
    setDx(0)
  }

  // Trackpad two-finger horizontal swipe → reveal/close. Native (non-passive)
  // so preventDefault can stop the browser's horizontal back/forward gesture.
  useEffect(() => {
    const el = rowRef.current
    if (!el) return
    let accum = open ? -panelW : 0
    let idle: ReturnType<typeof setTimeout> | undefined
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return // vertical → let the list scroll
      e.preventDefault()
      accum = Math.max(-panelW, Math.min(0, accum - e.deltaX))
      didSwipe.current = true
      setDragging(true)
      setDx(accum)
      clearTimeout(idle)
      idle = setTimeout(() => {
        const shouldOpen = accum < -panelW / 2
        setDragging(false)
        setOpen(shouldOpen)
        setDx(shouldOpen ? -panelW : 0)
        setTimeout(() => {
          didSwipe.current = false
        }, 60)
      }, 110)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      clearTimeout(idle)
    }
  }, [open, panelW])

  const translate = dragging ? dx : open ? -panelW : 0

  return (
    <div className="relative shrink-0 overflow-hidden rounded-[16px]">
      {/* action panel, revealed behind the trailing edge */}
      <div className="absolute inset-y-0 end-0 flex" style={{ width: panelW }}>
        {actions.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => {
              a.onClick()
              close()
            }}
            className="flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 border-none text-[10.5px] font-semibold tracking-[0.01em]"
            style={{ background: a.bg, color: a.fg }}
          >
            <a.icon size={17} strokeWidth={2} />
            {a.label}
          </button>
        ))}
      </div>

      {/* sliding content (opaque page bg hides the panel when closed) */}
      <div
        ref={rowRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onDragStart={(e) => e.preventDefault()}
        draggable={false}
        onClickCapture={(e) => {
          if (open) {
            e.preventDefault()
            e.stopPropagation()
            close()
          } else if (didSwipe.current) {
            e.preventDefault()
            e.stopPropagation()
            didSwipe.current = false
          }
        }}
        style={{
          transform: `translateX(${translate}px)`,
          transition: dragging ? 'none' : 'transform 0.24s cubic-bezier(0.2,0.8,0.2,1)',
          background: 'var(--surface-page)',
          touchAction: 'pan-y',
          userSelect: dragging ? 'none' : undefined,
          WebkitUserSelect: dragging ? 'none' : undefined,
        }}
      >
        {children}
      </div>
    </div>
  )
}

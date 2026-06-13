import { useState, type ReactNode } from 'react'
import { Blobs } from './Blobs'
import { BottomNav } from './BottomNav'
import { OverlayHostContext } from './overlay'

/** Mobile-first screen shell — full viewport on phones, centered column on
 *  desktop. Owns the cream page surface, ambient blobs and (optionally)
 *  the floating bottom nav. */
export function Shell({ children, nav = true, blobs = true }: { children: ReactNode; nav?: boolean; blobs?: boolean }) {
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null)
  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-shell-dark">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-page text-ink">
        {blobs && <Blobs />}
        <OverlayHostContext.Provider value={overlayHost}>
          <div className="scroll-area relative z-1 flex-1 overflow-y-auto">{children}</div>
          {nav && <BottomNav />}
          {/* overlay layer — above the nav (z-5), transparent to taps until filled */}
          <div ref={setOverlayHost} className="pointer-events-none absolute inset-0 z-[60]" />
        </OverlayHostContext.Provider>
      </div>
    </div>
  )
}

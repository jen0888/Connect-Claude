import type { ReactNode } from 'react'
import { Blobs } from './Blobs'
import { BottomNav } from './BottomNav'

/** Mobile-first screen shell — full viewport on phones, centered column on
 *  desktop. Owns the cream page surface, ambient blobs and (optionally)
 *  the floating bottom nav. */
export function Shell({ children, nav = true, blobs = true }: { children: ReactNode; nav?: boolean; blobs?: boolean }) {
  return (
    <div className="flex h-dvh justify-center overflow-hidden bg-shell-dark">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-page text-ink">
        {blobs && <Blobs />}
        <div className="relative z-1 flex-1 overflow-y-auto">{children}</div>
        {nav && <BottomNav />}
      </div>
    </div>
  )
}

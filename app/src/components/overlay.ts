import { createContext } from 'react'

/** Portal target for frame-scoped overlays (bottom sheets, dialogs). `Shell`
 *  provides the element — a layer ABOVE the bottom nav but clipped to the
 *  430px phone frame — so an overlay can cover the tab bar without dimming the
 *  whole window on desktop. Consumers portal into it, falling back to
 *  document.body when used outside a Shell. */
export const OverlayHostContext = createContext<HTMLElement | null>(null)

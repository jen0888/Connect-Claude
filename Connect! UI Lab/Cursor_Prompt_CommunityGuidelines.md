# Cursor Prompt — Onboarding: Community Guidelines screen

A single-screen prompt for the Community Guidelines review step (between Q3 Skill level and "You're all set"). Grounded in `Connect_Community_Standards.md`. **EN-first, RTL-ready; tokens + shared components already exist; no backend wiring.**

---

## ▶️ PROMPT (copy from here)

Build the **Community Guidelines** onboarding screen for Connect! (React + TS + Vite, Tailwind + shadcn/ui, lucide-react). Read `CLAUDE.md` and follow it. **Consume design tokens and existing shared components — no hardcoded colors/sizes, no new card/button variants.** Content source: `Connect_Community_Standards.md`. This is a review-and-agree step, **not** the full legal text — keep it scannable; the full standards live in Settings → Legal later.

### Purpose & placement
Step that comes after Q3 (Skill level) and before "You're all set." The user reads a short, friendly summary of the community standards and must explicitly agree to continue. It is the last gate before finishing onboarding.

### Layout (top → bottom, single mobile column, full height)
1. **Header** — a short serif title (e.g. "A few house rules") and one calm subline: *"Connect! works when everyone shows up in good faith. The short version:"* Optional small back chevron to Q3 (directional icon — flips in RTL).
2. **Six standards as a vertical list of icon rows** — each row = a lucide icon + a bold one-line title + a one-line plain-English essence. Use these exact six (condensed from the standards doc), in order:
   - **Show up** — *Only join games you'll play; cancel at least 2 hours ahead. No-shows show on your profile.* (icon: `CalendarCheck`)
   - **Be honest about your level** — *Rate yourself fairly so matches stay fun for everyone.* (icon: `Gauge`)
   - **Respect every player** — *Everyone's welcome. No harassment, hate, or unwanted advances.* (icon: `Heart`)
   - **Play it safe** — *Meet at the booked public venue; if someone makes you uneasy, block and report.* (icon: `ShieldCheck`)
   - **Communicate well** — *Keep match chat relevant and respectful. No spam or scams.* (icon: `MessageCircle`)
   - **Respect venues & the game** — *Follow venue rules, arrive on time, and honor Qatar's local laws and customs.* (icon: `MapPin`)
   Rows use a consistent icon chip, tabular spacing, and the card/list styling from the design system (don't invent a new row component if one exists).
3. **"Read the full Community Standards" link** — `--color-accent`, opens the full text (route/sheet placeholder for now). Not the primary action.
4. **Primary CTA pinned at the bottom: "I agree & continue"** — agreeing is the consent action; on tap, route to "You're all set." A secondary/quiet way back is the header chevron. There is **no path to "All set" without agreeing.**

### Behavior & states
- **default / loading / disabled** for the CTA per tokens (no error state needed unless you add a checkbox — see below).
- Content is concise enough to fit most phones; if it overflows, the list scrolls while the **CTA stays pinned and tappable** above the bottom inset.
- Pressing the CTA is the agreement event — record consent in local onboarding state (no backend yet).

### Mobile / device fit (PWA now, native iOS + Android later)
- Full-height (`100dvh`/`100svh`), single column, sized for ~360–430px phones.
- Respect safe areas with `env(safe-area-inset-*)`; the pinned CTA must clear the iOS home indicator / Android gesture bar and never sit flush to the edge.
- Touch targets 44px+ (iOS) / 48dp (Android); clear pressed states; no hover-only affordances.

### EN-first, RTL-ready
- All strings via **i18n keys** — no hardcoded literals (the copy above is the EN value; Arabic from `Connect_Community_Standards.md` comes later).
- **Logical CSS** (`ms/me`, `ps/pe`, `start/end`, `text-start`) so the whole screen mirrors under `dir="rtl"`: icon sits at the start, text reads from the start, back chevron flips. **Don't flip** the standard icons themselves (shield, heart, pin, etc.) — only the layout direction.

### Visual
Instrument Serif for the title; Inter for everything else. Pilled primary button. Cream `--surface-page` background, white `--surface-card` rows. Spacing/radii/colors from tokens only. Accessible: real list semantics, labelled link/button, visible focus.

### Deliverable
The single screen wired into the onboarding route between Skill level and "You're all set," with the i18n keys added. Then list any tokens/components you expected but couldn't find, and stop.

## ◀️ END PROMPT

---

## One optional choice
Above, **tapping "I agree & continue" is the consent.** If you'd rather make agreement more explicit, add a checkbox *"I've read and agree to the Community Standards"* that must be ticked to enable the button (adds a disabled→enabled state). Tell Cursor which you want; the prompt above uses the simpler tap-to-agree pattern.

## Why your earlier attempt may have drifted
If Claude Code rendered the whole standards doc, it likely produced a long, dense scroll that doesn't match your other onboarding screens. The fix is the structure above: **six short icon rows + a link to the full text + a pinned agree button** — scannable, on-brand, and consistent with the rest of the flow. Attach `question 1-3 .png` and `you are all set screen.png` so Cursor matches their visual rhythm.

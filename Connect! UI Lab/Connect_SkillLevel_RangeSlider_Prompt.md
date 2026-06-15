# Cursor + Claude Code Prompt — Skill-level selector (tap-to-pick, range OR single)

Build the skill-level selector as a **discrete row/track of the existing ordered skill levels** (use the canonical skill-level set already defined for `skill_level` — do not invent new levels). Selection is **tap-only — no dragging, no double-tap.** Every interaction is a single tap on a level stop.

## Interaction — state machine (this is the whole behavior)

- **Nothing selected → tap a level** = that level becomes the **start** (single level selected, one stop highlighted).
- **One level selected → tap a *different* level** = makes a **range** between the two (`[min, max]`, auto-ordered regardless of tap order). The segment between them fills.
- **One level selected → tap the *same* level again** = no change (stays that single level). (Optionally allow it to deselect — but default to "stays single".)
- **Range selected → tap one of the two endpoints (start or end)** = **collapse to a single level = the endpoint that was tapped.** (Tap the start → single = start; tap the end → single = end.)
- **Range selected → tap a level that is NOT an endpoint** (inside or outside the range) = **reset**: that tapped level becomes the new **start** (single), and the next distinct tap makes a new range.

So the mental model the user learns is: *first tap sets a level, a second different tap makes a range, and tapping an end of a range drops it back to that one level.*

This single control expresses both a single skill level and a range, matching how matches advertise skill (`skill_level`). The card / Match Details render a range as "Low int. → High int." style and a single as one label (e.g. "Intermediate").

## Where it's used
- **Create-a-Match (`/matches/new`)** and **Match Edit (`/matches/:id/edit`)** — host sets the match's skill level / range.
- Pre-fill with current values on Edit and carry the draft across the create flow (CLAUDE.md §4 carry-forward — never blank on nav).
- If the sign-up skill step (`/signup`) reuses this control, constrain it to **single-level** (a player has one level), same component.

## Visual & feedback
- Discrete stops only; tapping snaps to that stop. Remove all drag/pointer-move and double-tap handlers from the old version.
- **Single state:** one filled stop.
- **Range state:** two highlighted endpoints with the segment between them filled.
- Show light helper microcopy so the gesture is discoverable, e.g. "Tap a level, tap another for a range." (localize EN/AR).
- Touch targets ≥44px; stops are keyboard-focusable and selectable with Enter/Space (document a11y).

## Tokens (CLAUDE.md §3 — consume, never hardcode)
- Track: neutral/faint; **selected segment** filled `--color-brand` (#C76A48); selected stops use `--radius-pill` (999); pressed `--color-brandstrong` (#A04A2C).
- Labels: `label` 12.5/600 or `caption` 11/500; selected `--color-text`, unselected `--color-text-muted`.
- Single-level state = one filled dot, not a zero-width range.
- Spacing/radius per form rhythm; tokens only.

## Bilingual / RTL (§7)
- Track **mirrors in Arabic** (start side flips). Since selection is tap-based, ordering is by level index, not by screen x — so RTL "just works" as long as min/max use the level's position in the ordered set, not pixel position.
- Level **labels** localize EN/AR; numerals stay LTR + `tabular-nums`. Don't flip numeric/scale elements, only track direction.

## Verify before done
- Tap one level → single selected.
- Tap a second different level → range, auto-ordered (tapping high-then-low gives the same range as low-then-high).
- With a range showing, tap the start endpoint → collapses to that single level; tap the end endpoint → collapses to that single level.
- With a range showing, tap a non-endpoint level → resets to a new single start.
- Re-open Create/Edit → control is **pre-filled** with the saved range/level (carry-forward).
- No drag and no double-tap anywhere; works with single taps on mobile and clicks on desktop.
- RTL: ordering correct, labels localized, numerals LTR.
- One shared component across Create-a-Match, Match Edit, and (if applicable) sign-up — no per-screen variant.

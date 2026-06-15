# Cursor + Claude Code Prompt — Restyle "Players needed" slider to match the Skill-level track (style only)

**Style change only. Do NOT change any interaction or behavior.** The "Players needed" control stays a single-value selector (1–7, currently 4) with its existing input behavior. We are only restyling it so it visually matches the **Skill-level** slider's discrete-dot track, and we are emphasizing the selected number on the track.

## What to change
On the Create-a-Match / Match Edit "Players needed" slider, adopt the same visual language as the skill-level track:

- **Discrete dot stops** for each value 1–7 along the track (like the skill slider's level dots), instead of a plain line.
- **Filled segment** from the start of the track up to the selected stop, using `--color-brand` (#C76A48); the remainder of the track is the faint/neutral unselected style.
- **Selected stop = the large ringed handle** — the same open-circle-with-brand-ring handle used for the skill endpoints (`--radius-pill`, brand ring, white fill). Unselected stops render as the small muted dots (`--color-neutral` / faint), matching skill.
- Keep it a **single handle** — do not add a second handle or any range/tap logic. This is the single-thumb version of the same visual system.

## Point out the selected number
- **Emphasize the active number** among the 1–7 labels: the selected number uses `--color-text` (and weight `600` / `label` style) with `tabular-nums`; all other numbers stay `--color-text-muted`. So the current value visually "pops" on the track (e.g. 4 is bold/inked, the rest dimmed) — mirroring how skill labels highlight the selected ends.
- Optional, only if it matches the skill slider treatment: a small value marker at the handle. Don't add it if skill doesn't have one — keep the two controls visually consistent.
- Leave the existing "4 players" readout (top-right) exactly as is.

## Consistency & tokens (CLAUDE.md §3 — consume, never hardcode)
- Reuse the **same track/handle/dot primitives** as the skill-level slider so both read as one component family — ideally share the styled track component, single-thumb mode for Players needed, two-thumb mode for Skill level.
- Brand fill `--color-brand`; pressed `--color-brandstrong` (#A04A2C); handles `--radius-pill` (999); selected label `--color-text`, unselected `--color-text-muted`; `tabular-nums` on all numerals.
- Spacing/radius per the existing form rhythm — don't change layout, only the slider's visual style.

## RTL (§7)
- Track mirrors in Arabic like the skill track; numerals stay LTR + `tabular-nums`; selected-number emphasis follows the value, not screen position.

## Verify before done
- "Players needed" now visually matches the Skill-level track (dot stops, brand fill, ringed selected handle) — they look like one system.
- The selected number (e.g. 4) is clearly emphasized/inked while the others are muted.
- **Behavior is unchanged** — same single-value selection and same interaction as before; no second handle, no new gestures.
- Tokens only; "N players" readout untouched.
- RTL renders correctly.

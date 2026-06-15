# Claude Code prompt — Skill level: range slider styled like "Players needed" (single OR range)

> Paste into Claude Code from repo root. Read `CLAUDE.md` first; obey §3 tokens (no hardcoded hex/size; tabular numerals), §4 carry-forward, §6 `matches` data model, §7 EN/AR + RTL. Reuse existing slider styling.

## Goal
Replace the current single-thumb skill slider. The new control should **look and feel like the "Players needed" slider above it** (same track, same discrete stops aligned to the labels, same brand fill), but it is a **two-handle range** over the 7 skill tiers:
- The host can set the **start point at ANY tier** (not forced to the leftmost), then set an **end point** at a higher tier.
- The **filled segment between the two handles = the eligible range** (inclusive).
- Setting both handles to the **same tier = a single level**.
- Fully **editable later** (opens pre-filled in Match Edit).

## Tiers (ordered)
**Baby · Beginner · Low Int · Int · High Int · Advance · Pro**
enum: `baby → beginner → low_int → int → high_int → advance → pro` (7 discrete stops, evenly spaced like the 1–7 players slider).

## Behavior
- Two handles: **low** and **high**, each snapping to one of the 7 stops. Both draggable; tapping a stop moves the nearest handle to it.
- **Fill semantics (note: differs from Players-needed):** Players-needed fills from the left up to the thumb. Skill fills **between the low and high handles** — the chosen start tier up to the chosen end tier. Outside the range is grey.
- **Start anywhere:** the low handle can sit on any tier (e.g. start at **Int**), independent of the leftmost tier.
- **Range example:** low = **Int**, high = **Advance** ⇒ eligible = **Int, High Int, Advance** (everyone in that band can join). Header reads "Int – Advance".
- **Single level:** drag/tap both handles onto the same tier (or tap one tier when collapsed) ⇒ `min == max`. Header reads e.g. "Int only".
- Enforce `low ≤ high` by tier order (dragging one past the other swaps/clamps).

## Visual / a11y
- Match the Players-needed slider's track thickness, colors, handle style, and the label row beneath (Baby…Pro replacing 1…7). Brand fill (`--color-brand`) for the in-range segment; grey for out-of-range.
- Live header summary on the right ("Int only" / "Int – Advance"), tabular numerals where relevant.
- Helper line, bilingual (EN/AR), e.g. EN: "Drag the two ends to set your range — or put both on one level for a single level." RTL-correct ordering; handles/labels mirror cleanly in Arabic, numerals stay LTR.
- Handles keyboard-accessible; min 44px touch targets.

## Data + carry-forward
- Persist to `matches.skill_min` / `matches.skill_max` (both the 7-tier enum; `min == max` for single; CHECK `min ≤ max` by ordinal).
- **Edit (§4):** `/matches/:id/edit` opens with both handles **pre-set** to the saved min/max so the host can change them; selection also persists through `/matches/new/review` and onto the created card.
- Match card / Details show "Int" (single) or "Int – Advance" (range); Discover skill filter includes a match when the filter tier is within `[skill_min, skill_max]`.

## Acceptance criteria
1. Control visually matches the Players-needed slider (track, stops, fill, handles), with Baby…Pro labels.
2. Host can place the **start handle on any tier** (e.g. start at Int) — not anchored to the leftmost.
3. low = Int, high = Advance ⇒ saved range covers Int + High Int + Advance; header shows "Int – Advance".
4. Both handles on one tier ⇒ single level ("Int only"); `min == max`.
5. Re-opening Match Edit shows both handles pre-set to the saved range and lets the host change them; review step + created card reflect the choice.
6. EN + AR/RTL correct for slider, labels, helper line, and header.

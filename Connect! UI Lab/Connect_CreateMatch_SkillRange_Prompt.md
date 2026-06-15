# Claude Code prompt — Create-a-Match skill level: free single-pick or range (7 tiers)

> Paste into Claude Code from the repo root. Read `CLAUDE.md` first; obey §3 tokens (no hardcoded hex/size; pills, tabular numerals), §4 carry-forward (draft persists across the create flow), §6 data model, §7 EN/AR + RTL. Reuse the canonical match card.

## Problem
On `/matches/new` the skill-level selector currently forces the range to **start at Beginner** and only go upward. That's wrong. The host should be able to pick **any** starting level and, optionally, an upper level to form a range — or just pick a single level.

## Skill scale (single ordered enum, shared app-wide)
Lowest → highest, exactly these 7 tiers and order:
`baby → beginner → low_int → int → high_int → advance → pro`
Display labels (EN): **Baby · Beginner · Low Int · Int · High Int · Advance · Pro**. Add AR translations to the i18n strings / glossary (§7). Store the enum value, render the label.

## Selector behavior
- Render the 7 tiers as an ordered row of pill/segmented options (horizontal, scrollable on small screens; RTL-mirrored).
- **First tap = the anchor (lower bound).** It can be **any** tier (Baby through Pro) — never auto-anchored to Beginner.
- **Optional range:** tapping a **higher** tier sets the upper bound; the tiers between anchor and upper highlight as the selected range (e.g. *Int – Advance*).
- Tapping a tier **below** the current anchor moves the anchor down (new lower bound).
- **Single level is valid:** if the host picks only one tier (or taps the same tier again to collapse the range), the match accepts exactly that level — `min == max`.
- Always enforce `min ≤ max` by tier order. No requirement to start at Beginner and no upward-only constraint.
- A short helper line states the result in plain language: single → "Int only"; range → "Int to Advance". Bilingual.

## Data model (§6 `matches`)
- Replace the single `skill_level` on `matches` with **`skill_min`** and **`skill_max`** (both the 7-tier enum). For a single-level match, `skill_min == skill_max`.
- Add a CHECK (or app-level guard) that `skill_min` ≤ `skill_max` by tier ordinal.
- Migration: map existing rows' old single value into both `skill_min` and `skill_max`.
- Keep the 7-tier enum defined once (DB enum + a TS constant with order) and reuse it for the profile skill field, Discover filter, and display — don't redefine per screen. (Note: this widens the old Beginner/Intermediate/Advanced scale; flag if the profile questionnaire should adopt the same 7 tiers.)

## Display + carry-forward
- **Match card / Match Details:** show "Int" for a single level, "Int – Advance" for a range (tabular numerals, RTL-safe).
- **Discover filter by skill** reads the same enum; a match matches a filter tier if that tier falls within `[skill_min, skill_max]`.
- **Carry-forward (§4):** the picked min/max persist into `/matches/new/review` and onto the created card; editing a match (`/matches/:id/edit`) opens **pre-filled** with the saved min/max.

## Acceptance criteria
1. Host can pick a single tier anywhere on the scale (e.g. **Pro only**, or **Baby only**) with no forced Beginner start.
2. Host can pick an anchor then a higher tier to form a range (e.g. **Low Int – High Int**); the in-between tiers show as selected.
3. Picking a lower tier moves the lower bound; `min ≤ max` always holds.
4. Review step and the created match card show the exact single/range chosen; Edit re-opens pre-filled.
5. Discover skill filter correctly includes matches whose range covers the filter tier.
6. EN + AR/RTL render correctly for the selector, helper line, and card.

# Connect! — Ideas & Reminders

Running backlog of small ideas and enhancements to pick up later. Not the spec — `CLAUDE.md` stays the single source of truth. Each entry notes enough to act on without re-explaining.

---

## Home — daily positive subtext under the "Hello, [name]" banner
**Added:** 2026-06-15 · **Status:** idea / not built · **Stage:** small UX polish

Under the Home greeting banner ("Hello, [name]"), show a short **positive sentence as subtext that changes each day** — a warm, encouraging line to set the tone (e.g. "Great day to get on court." / "Your next match is one tap away.").

Notes for whoever builds it:
- **Placement:** muted subtext line directly beneath the greeting on Home (`/home`), above the NEXT UP section. Use `--color-text-muted`; `body` (14) or `caption` type — quieter than the greeting.
- **Rotation:** one line per calendar day, deterministic so it stays stable all day (e.g. index a curated array by day-of-year, not random-per-render which would flicker on every reload). Cycle through the list and repeat.
- **Content:** keep a small curated array of on-brand, sporty, encouraging lines. Avoid anything that reads as a notification or a task. Keep it Stage-1 simple — a local array, no backend, no CMS.
- **Bilingual:** must have an Arabic set too (EN/AR + RTL from day one, §7). Don't machine-translate at runtime — author both lists; pick by `language`. Keep numerals/bidi rules in mind if any line includes a number.
- **Tokens only** (§3); reuse the existing greeting/banner component, don't fork a Home header variant.
- **Tone:** positive/encouraging, not streak-pressure or guilt ("you haven't played in 5 days" → no). Wellbeing-friendly.

When ready, I can turn this into a full Cursor + Claude Code prompt with the curated EN/AR line set.

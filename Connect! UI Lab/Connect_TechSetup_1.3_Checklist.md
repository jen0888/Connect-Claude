# Connect! — Tech Setup Checklist (Stage 1.3)

*Drafted 2026-05-30. Web-first PWA. Verdict: the whole Stage 1 web app is buildable with **Lovable + Supabase + Claude Code (open the repo)**. The items below are the external account/service setups that aren't "just code" — sequence these into 1.3 so nothing surprises you mid-build.*

## Feasibility verdict

- **Lovable** — generates + deploys the React web frontend, wires Supabase, handles UI and CRUD.
- **Claude Code** — takes the GitHub repo for heavier logic (no-show report thresholds, RLS policies, realtime chat tuning, RTL/bidi edge cases) and refactors Lovable's output.
- Together they cover **all of Stage 1**. Expect the balance to shift toward Claude Code as logic gets trickier.
- **Web only** — a true native app is a later stage and not Lovable's lane; the Supabase backend carries over when you get there.

## External services to set up (account/config, some paid)

- [ ] **Lovable** account + project.
- [ ] **Supabase** project — database, Row Level Security policies, Realtime (for chat + live match feed), email/SMTP.
- [ ] **GitHub** repo, connected to Lovable (so Claude Code can pick up the repo).
- [ ] **Hosting** — Vercel (or Lovable's own hosting).
- [ ] **Domain** — e.g. playdoha.qa-style domain.
- [ ] **Google sign-in** — Google Cloud OAuth credentials (free).
- [ ] **Apple sign-in** — requires an **Apple Developer account ($99/yr)**; fiddly to configure. *(Decide if Apple sign-in is needed for a web PWA at launch, or defer.)*
- [ ] **Phone OTP** — SMS provider (Twilio / MessageBird); **costs per message**. Configure Supabase phone auth.
- [ ] **Email (password reset + notifications)** — real SMTP sender (Resend / SendGrid); Supabase's built-in sender is test-only.
- [ ] **Google Maps API key** — for the venue location pin; needs billing enabled.

## Notes

- Apple sign-in and SMS OTP are the two that bite (cost + setup friction) — decide early whether each is launch-critical or deferrable for a free Stage 1 web app.
- Web push notifications (1.10) have caveats on iOS — a later concern, not 1.3.
- Reset-password config in Supabase: add the reset page to **URL Configuration → Redirect URLs**, customize the **Reset Password** email template (EN + AR), set custom SMTP.
- After accounts exist: define the DB schema (see `Connect_Lovable_Handoff.md`), then build foundation → components → pages → flows.

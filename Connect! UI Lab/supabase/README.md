# Connect! — Supabase backend (Stage 1)

Standard Supabase CLI structure. Same files reproduce the backend on **local** or **hosted** — switching is just an env change.

```
supabase/
├─ migrations/
│  ├─ 20260609000001_connect_stage1_schema.sql      # tables + RLS (§6)
│  └─ 20260609000002_connect_stage1_flow_functions.sql  # join/request/invite/waitlist RPCs (§5)
└─ seed.sql                                          # 6 dummy accounts + venues + 4 test matches
```

## Local development

```bash
supabase start          # boots local Postgres + Auth in Docker
supabase db reset        # applies migrations + runs seed.sql → clean known state
```

Point the app at local (`supabase status` prints the URL + anon key), e.g.:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from `supabase status`>
```

`supabase db reset` is the fast "clear my test queue" button locally — it rebuilds from scratch every time.

## Hosted project (ref `ybmvzhpcuwapayhjhmzd`)

Already has these migrations + seed applied. To use it instead, point the app at:

```
VITE_SUPABASE_URL=https://ybmvzhpcuwapayhjhmzd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_RFUnlQjtefQID-c5EQxYDA_aIJ5KZlK
```

To sync future schema changes hosted → local: `supabase link --project-ref ybmvzhpcuwapayhjhmzd && supabase db pull`.

## Dummy accounts (password `Test1234!`)

`alice@` (hosts the 4 test matches), `bob@`, `carol@`, `dave@`, `erin@`, `frank@` `connect.test`.

## Test matches

| Match | join_mode | state | use for |
|---|---|---|---|
| TEST: open join | open | 3 spots open | self-join |
| TEST: approval | approval | 3 spots open | request → host approve/decline |
| TEST: invite | invite | 3 spots open | host invite → accept/decline |
| TEST: full → waitlist | open | full | waitlist + FIFO auto-promote on cancel |

## Flow RPCs (call from the app via `supabase.rpc(...)`)

`join_match` · `request_to_join` / `approve_request` / `decline_request` · `invite_player` / `accept_invite` / `decline_invite` · `join_waitlist` · `cancel_participation` (cancel + FIFO auto-promote).

## Resetting test data without a full DB reset

Use `../dev-reset.sql` (hosted) for a targeted, user-safe cleanup. Locally, prefer `supabase db reset`.

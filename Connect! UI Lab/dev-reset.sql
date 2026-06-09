-- =====================================================================
-- Connect!  ·  DEV RESET  (CLAUDE.md §8)  ·  standalone, manual-trigger
-- ---------------------------------------------------------------------
-- Clears the test BUSINESS DATA (matches, players, requests/waitlist,
-- results, no-show reports, notifications) and restores a fresh, known
-- state so Join / Request / Invite / Waitlist flows can be re-tested
-- without manual cleanup.
--
-- NON-DESTRUCTIVE GUARANTEES (by construction):
--   1. NEVER deletes user records. It does NOT touch `public.users` or
--      `auth.users` at all — your test accounts persist untouched.
--      (It only deletes those users' *activity rows* in the business
--       tables — never the account itself.)
--   2. NEVER alters schema. No CREATE / DROP / ALTER / TRUNCATE. Pure
--      DML inside one DO block.
--   3. Only targeted DELETE + re-INSERT, hard-scoped to the 4 fixed-UUID
--      test matches and 6 @connect.test users via WHERE clauses.
--   4. Standalone. Run it by hand from the Supabase SQL Editor whenever
--      you want to clear the test queue. Nothing runs automatically.
--
-- Why DELETE…WHERE and not TRUNCATE: these tables can also hold real /
-- other data. TRUNCATE cannot be row-filtered, so it would wipe non-test
-- rows too. Scoped DELETEs keep the blast radius to test data only.
--
-- HOW TO RUN: paste the whole file into the Supabase SQL Editor, pick the
-- scenario on the `v_scenario` line, run. Safe to run repeatedly.
--
-- SCENARIOS:
--   'baseline'  → 4 matches, hosts seeded only. Build every flow yourself.
--   'preloaded' → same 4 matches PLUS mid-flow state already staged:
--                   • approval match has a PENDING request (Bob → host)
--                   • invite match has a PENDING invite (host → Carol)
--                   • full match has 2 people on the WAITLIST (Dave, Erin)
--
-- TEST USERS (password for all: Test1234!)  — NEVER deleted by this script
--   alice@connect.test  11111111-…  (host of all 4 test matches)
--   bob@connect.test    22222222-…    carol@connect.test  33333333-…
--   dave@connect.test   44444444-…    erin@connect.test   55555555-…
--   frank@connect.test  66666666-…
-- =====================================================================

do $$
declare
  -- ⬇️⬇️  EDIT THIS LINE TO CHOOSE A SCENARIO  ⬇️⬇️
  v_scenario text := 'baseline';      -- 'baseline' | 'preloaded'
  -- ⬆️⬆️ ----------------------------------------- ⬆️⬆️

  alice uuid := '11111111-1111-1111-1111-111111111111';
  bob   uuid := '22222222-2222-2222-2222-222222222222';
  carol uuid := '33333333-3333-3333-3333-333333333333';
  dave  uuid := '44444444-4444-4444-4444-444444444444';
  erin  uuid := '55555555-5555-5555-5555-555555555555';
  frank uuid := '66666666-6666-6666-6666-666666666666';

  m_open  uuid := '0a000001-0000-0000-0000-000000000001';
  m_appr  uuid := '0a000002-0000-0000-0000-000000000002';
  m_inv   uuid := '0a000003-0000-0000-0000-000000000003';
  m_full  uuid := '0a000004-0000-0000-0000-000000000004';

  test_users   uuid[] := array[alice,bob,carol,dave,erin,frank];
  test_matches uuid[] := array[m_open,m_appr,m_inv,m_full];
begin
  if v_scenario not in ('baseline','preloaded') then
    raise exception 'Unknown scenario %, use baseline or preloaded', v_scenario;
  end if;

  -- ---- SAFETY GATE: refuse to run if a test match id is owned by a non-test user ----
  if exists (select 1 from public.matches
             where id = any(test_matches) and not (host_id = any(test_users))) then
    raise exception 'SAFETY ABORT: a test match UUID is hosted by a NON-test user. Refusing to delete.';
  end if;

  -- ---- Confirm the dummy auth users exist (we rely on them; we never create or delete them here) ----
  if (select count(*) from auth.users where id = any(test_users)) < 6 then
    raise notice 'Only % of 6 dummy auth users exist. Run the SEED block at the bottom of this file first.',
      (select count(*) from auth.users where id = any(test_users));
  end if;

  -- =================================================================
  -- 1) CLEAR business-data rows only  (the "clear my test queue" step)
  --    Scoped to the test matches + test users' activity. USER ROWS
  --    (public.users / auth.users) ARE NOT TOUCHED.
  -- =================================================================
  delete from public.match_results   where match_id = any(test_matches) or player_id = any(test_users);
  delete from public.no_show_reports  where match_id = any(test_matches) or reporter_id = any(test_users) or reported_player = any(test_users);
  delete from public.match_requests   where match_id = any(test_matches) or player_id = any(test_users);
  delete from public.match_players    where match_id = any(test_matches) or player_id = any(test_users);
  delete from public.notifications    where user_id  = any(test_users);
  delete from public.matches          where id       = any(test_matches);
  -- NOTE: chat messages — no chat tables exist yet. When chat lands, add a
  --   scoped DELETE here too, e.g.:
  --   delete from public.chat_messages where match_id = any(test_matches) or sender_id = any(test_users);

  -- =================================================================
  -- 2) RESTORE a fresh state: venues (idempotent) + the 4 test matches
  --    Re-inserting business rows only. No user/profile writes.
  -- =================================================================
  insert into public.venues (id, name, area, location, sports) values
   ('0b000001-0000-0000-0000-000000000001','Aspire Padel','Aspire Zone','Doha', array['padel']),
   ('0b000002-0000-0000-0000-000000000002','Khalifa Tennis Complex','Al Waab','Doha', array['tennis','padel']),
   ('0b000003-0000-0000-0000-000000000003','Lusail Sports Arena','Lusail','Doha', array['padel','badminton'])
  on conflict (id) do nothing;

  insert into public.matches (id, host_id, sport, venue_id, venue_name, court_number,
    start_time, end_time, skill_level, total_spots, spots_available, fee_total, fee_per_player, join_mode, status, notes) values
   (m_open, alice,'padel','0b000001-0000-0000-0000-000000000001','Aspire Padel','3',
     now()+interval '2 days', now()+interval '2 days 1 hour','intermediate',4,3,100,25,'open','open','TEST: open join'),
   (m_appr, alice,'padel','0b000001-0000-0000-0000-000000000001','Aspire Padel','5',
     now()+interval '3 days', now()+interval '3 days 1 hour','intermediate',4,3,100,25,'approval','open','TEST: approval'),
   (m_inv,  alice,'padel','0b000003-0000-0000-0000-000000000003','Lusail Sports Arena','1',
     now()+interval '4 days', now()+interval '4 days 1 hour','intermediate',4,3,100,25,'invite','open','TEST: invite'),
   (m_full, alice,'padel','0b000002-0000-0000-0000-000000000002','Khalifa Tennis Complex','2',
     now()+interval '5 days', now()+interval '5 days 1 hour','beginner',2,0,50,25,'open','full','TEST: full -> waitlist');

  -- host occupies a spot in every match; m_full also has Bob so it is full
  insert into public.match_players (match_id, player_id) values
   (m_open, alice), (m_appr, alice), (m_inv, alice), (m_full, alice), (m_full, bob);

  -- =================================================================
  -- 3) Optional mid-flow state for the 'preloaded' scenario
  -- =================================================================
  if v_scenario = 'preloaded' then
    -- approval match: a pending request waiting for the host to approve/decline
    insert into public.match_requests (match_id, player_id, kind, status)
      values (m_appr, bob, 'request', 'requested');
    -- invite match: a pending invite waiting for Carol to accept/decline
    insert into public.match_requests (match_id, player_id, kind, status)
      values (m_inv, carol, 'invite', 'invited');
    -- full match: two people already queued (Dave is pos #1, Erin pos #2 by created_at)
    insert into public.match_requests (match_id, player_id, kind, status, created_at)
      values (m_full, dave, 'waitlist', 'waitlisted', now() - interval '2 min'),
             (m_full, erin, 'waitlist', 'waitlisted', now() - interval '1 min');
  end if;

  raise notice 'DEV RESET complete — scenario: %  (users untouched)', v_scenario;
end $$;

-- Quick state check (run alongside the reset)
select m.notes, m.join_mode, m.status, m.spots_available,
  (select count(*) from public.match_players  mp where mp.match_id = m.id) as players,
  (select count(*) from public.match_requests r  where r.match_id = m.id and r.status in ('requested','invited')) as pending_reqs,
  (select count(*) from public.match_requests r  where r.match_id = m.id and r.kind='waitlist' and r.status='waitlisted') as waiting
from public.matches m
where m.id in ('0a000001-0000-0000-0000-000000000001','0a000002-0000-0000-0000-000000000002',
               '0a000003-0000-0000-0000-000000000003','0a000004-0000-0000-0000-000000000004')
order by m.notes;


-- =====================================================================
-- CLIENT-SIDE RESET  (§8 requirement 3 — clear drafts / carry-forward)
-- ---------------------------------------------------------------------
-- SQL can't touch the browser. To wipe Create-a-Match drafts, sign-up
-- questionnaire carry-forward, and any cached session, run this in the
-- browser DevTools console on your dev origin (or wire it to a dev-only
-- "Reset" button that only renders when import.meta.env.DEV):
--
--   (() => {
--     // If your app namespaces keys (e.g. "connect:"), filter instead of nuking all:
--     // Object.keys(localStorage).filter(k => k.startsWith('connect:')).forEach(k => localStorage.removeItem(k));
--     localStorage.clear();
--     sessionStorage.clear();
--     // Optional: also sign out of Supabase so the next load hits /login → /signup
--     // await window.supabase?.auth.signOut();
--     location.reload();
--   })();
-- =====================================================================


-- =====================================================================
-- OPTIONAL — extra resets you can run BY HAND if ever needed.
-- These are NOT part of the main reset above and are left commented so
-- the standalone script never deletes a user by default.
-- ---------------------------------------------------------------------
-- (a) Re-test the /signup questionnaire WITHOUT deleting accounts —
--     blank the test profiles back to defaults (still does NOT delete users):
--
--   update public.users
--      set sport=null, skill_level=null, dob=null, language='en'
--    where id = any (array[
--      '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
--      '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444',
--      '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666']);
--
-- (b) Brand-new / wiped environment — (re)create the 6 dummy auth users
--     (idempotent; password Test1234!). Run this, then the main reset.
--
--   insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
--     email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
--   select '00000000-0000-0000-0000-000000000000', v.id, 'authenticated','authenticated', v.email,
--          extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(), now(), now(),
--          '{"provider":"email","providers":["email"]}', jsonb_build_object('name', v.name)
--   from (values
--     ('11111111-1111-1111-1111-111111111111'::uuid,'alice@connect.test','Alice'),
--     ('22222222-2222-2222-2222-222222222222','bob@connect.test','Bob'),
--     ('33333333-3333-3333-3333-333333333333','carol@connect.test','Carol'),
--     ('44444444-4444-4444-4444-444444444444','dave@connect.test','Dave'),
--     ('55555555-5555-5555-5555-555555555555','erin@connect.test','Erin'),
--     ('66666666-6666-6666-6666-666666666666','frank@connect.test','Frank')
--   ) as v(id,email,name)
--   where not exists (select 1 from auth.users au where au.id = v.id);
--   -- then the matching profiles (public.users) and auth.identities rows.
-- =====================================================================

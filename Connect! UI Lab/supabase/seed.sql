-- =====================================================================
-- Connect! · seed data  (runs automatically on `supabase db reset`)
-- 6 dummy accounts (password Test1234!) + venues + 4 test matches that
-- cover open / approval / invite / full-waitlist. Idempotent.
-- =====================================================================

-- ---------- 6 dummy auth users ----------
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
select '00000000-0000-0000-0000-000000000000', v.id, 'authenticated','authenticated', v.email,
       extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(), now(), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', v.name)
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid,'alice@connect.test','Alice'),
  ('22222222-2222-2222-2222-222222222222','bob@connect.test','Bob'),
  ('33333333-3333-3333-3333-333333333333','carol@connect.test','Carol'),
  ('44444444-4444-4444-4444-444444444444','dave@connect.test','Dave'),
  ('55555555-5555-5555-5555-555555555555','erin@connect.test','Erin'),
  ('66666666-6666-6666-6666-666666666666','frank@connect.test','Frank')
) as v(id,email,name)
where not exists (select 1 from auth.users au where au.id = v.id);

-- ---------- email identities (so password login works) ----------
insert into auth.identities (id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
from auth.users u
where u.email like '%@connect.test'
  and not exists (select 1 from auth.identities i where i.user_id = u.id and i.provider='email');

-- ---------- profiles ----------
insert into public.users (id, name, email, sport, skill_level, language, dob, attendance_rate) values
 ('11111111-1111-1111-1111-111111111111','Alice','alice@connect.test','padel','intermediate','en','1992-03-04',100),
 ('22222222-2222-2222-2222-222222222222','Bob',  'bob@connect.test',  'padel','beginner',   'en','1990-07-15',100),
 ('33333333-3333-3333-3333-333333333333','Carol','carol@connect.test','padel','intermediate','en','1995-11-02',100),
 ('44444444-4444-4444-4444-444444444444','Dave', 'dave@connect.test', 'tennis','advanced',   'en','1988-01-20',100),
 ('55555555-5555-5555-5555-555555555555','Erin', 'erin@connect.test', 'padel','beginner',    'en','1998-05-09',100),
 ('66666666-6666-6666-6666-666666666666','Frank','frank@connect.test','padel','intermediate','ar','1993-09-30',100)
on conflict (id) do nothing;

-- ---------- venues ----------
insert into public.venues (id, name, area, location, sports) values
 ('0b000001-0000-0000-0000-000000000001','Aspire Padel','Aspire Zone','Doha', array['padel']),
 ('0b000002-0000-0000-0000-000000000002','Khalifa Tennis Complex','Al Waab','Doha', array['tennis','padel']),
 ('0b000003-0000-0000-0000-000000000003','Lusail Sports Arena','Lusail','Doha', array['padel','badminton'])
on conflict (id) do nothing;

-- ---------- 4 test matches (Alice hosts all) ----------
insert into public.matches (id, host_id, sport, venue_id, venue_name, court_number,
  start_time, end_time, skill_level, total_spots, spots_available, fee_total, fee_per_player, join_mode, status, notes) values
 ('0a000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','padel','0b000001-0000-0000-0000-000000000001','Aspire Padel','3',
   now()+interval '2 days', now()+interval '2 days 1 hour','intermediate',4,3,100,25,'open','open','TEST: open join'),
 ('0a000002-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','padel','0b000001-0000-0000-0000-000000000001','Aspire Padel','5',
   now()+interval '3 days', now()+interval '3 days 1 hour','intermediate',4,3,100,25,'approval','open','TEST: approval'),
 ('0a000003-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','padel','0b000003-0000-0000-0000-000000000003','Lusail Sports Arena','1',
   now()+interval '4 days', now()+interval '4 days 1 hour','intermediate',4,3,100,25,'invite','open','TEST: invite'),
 ('0a000004-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','padel','0b000002-0000-0000-0000-000000000002','Khalifa Tennis Complex','2',
   now()+interval '5 days', now()+interval '5 days 1 hour','beginner',2,0,50,25,'open','full','TEST: full -> waitlist')
on conflict (id) do nothing;

-- ---------- host memberships (m_full also has Bob, so it is full) ----------
insert into public.match_players (match_id, player_id) values
 ('0a000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111'),
 ('0a000002-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111'),
 ('0a000003-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111'),
 ('0a000004-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111'),
 ('0a000004-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222')
on conflict (match_id, player_id) do nothing;

-- =====================================================================
-- Connect! · harden handle_new_user so signups never orphan
-- `public.users.gender` is NOT NULL (added by a later migration). The original
-- handle_new_user inserted only (id, name, email), so if gender had no default
-- the trigger could fail and leave an auth user with NO profile row — which
-- blanks Home and breaks Profile/hosting (FK-bound to users). This version
-- always supplies gender (from sign-up metadata, falling back to 'male') and is
-- idempotent. Run in the Supabase SQL Editor on the live project.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users(id, name, email, gender)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.email,
          coalesce(new.raw_user_meta_data->>'gender', 'male'))
  on conflict (id) do nothing;
  return new;
end; $$;

-- trigger already exists (on_auth_user_created); recreating the function is enough.

-- ---------- one-time backfill for any existing orphaned auth users ----------
insert into public.users (id, name, email, sport, skill_level, gender, language, dob)
select au.id,
       coalesce(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
       au.email,
       'padel', 'beginner',
       coalesce(au.raw_user_meta_data->>'gender', 'male'),
       'en', '1990-01-01'
from auth.users au
where not exists (select 1 from public.users pu where pu.id = au.id);

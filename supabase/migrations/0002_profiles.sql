-- 0002 — profiles
--
-- One row per auth user, created by trigger. Anonymous users are real auth
-- users with a real auth.uid(), so they get a profile from their first second.
-- That is what makes zero-friction onboarding possible: the app has somewhere
-- to store preferences before anyone has typed an email address.

create table if not exists hadid.profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  display_name         text,
  unit_system          text        not null default 'metric'
                                   check (unit_system in ('metric', 'imperial')),
  default_rest_seconds int         not null default 120
                                   check (default_rest_seconds between 0 and 900),
  theme                text        not null default 'system'
                                   check (theme in ('system', 'light', 'dark')),
  week_starts_on       int         not null default 1
                                   check (week_starts_on between 0 and 6),
  onboarded            boolean     not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists t_profiles_updated on hadid.profiles;
create trigger t_profiles_updated
  before update on hadid.profiles
  for each row execute function hadid.set_updated_at();

-- security definer: the trigger runs as the postgres role because the inserting
-- session (an anonymous signup) has no rights on this table. search_path is
-- pinned — without it the function resolves names using the caller's
-- search_path, which is a privilege escalation waiting to happen.
create or replace function hadid.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = hadid, pg_temp
as $$
begin
  insert into hadid.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- Named for this app. The shared database already carries another
-- on_auth_user_created trigger for the neighbouring app, and Postgres allows
-- several triggers on the same table — but only if the names differ.
drop trigger if exists on_auth_user_created_hadid on auth.users;
create trigger on_auth_user_created_hadid
  after insert on auth.users
  for each row execute function hadid.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table hadid.profiles enable row level security;

drop policy if exists "own profile" on hadid.profiles;
create policy "own profile" on hadid.profiles
  for all
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Backfill profiles for any auth users that already exist in this shared
-- project. Without this, an account created by the neighbouring app has no
-- hadid profile and every query for it returns zero rows.
insert into hadid.profiles (id)
select u.id from auth.users u
on conflict do nothing;

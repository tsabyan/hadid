-- 0001 — the hadid schema, extensions, helpers, grants
--
-- This Supabase project is shared with another app (which owns the `sukun`
-- schema), so `public` is not ours to take. Two apps that both create a table
-- called `profiles` or `achievements` in `public` will collide, and the
-- collision surfaces as a baffling RLS failure rather than an obvious error.
--
-- Three consequences of living outside `public`, all handled below:
--   1. PostgREST does not expose the schema until it is added under
--      Dashboard → Settings → API → Exposed schemas. Until then every
--      query returns 404.
--   2. Supabase's default grants only cover `public`. Usage and table
--      privileges must be granted explicitly — including default privileges,
--      or the next table added in a later migration is invisible to the API.
--   3. The client must be constructed with `db: { schema: 'hadid' }`.
--      Already done in lib/supabase/*.ts.

create schema if not exists hadid;

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fuzzy exercise search

-- Shared updated_at trigger. Pinned search_path for the same reason it is
-- pinned in every security definer function below.
create or replace function hadid.set_updated_at()
returns trigger
language plpgsql
set search_path = hadid, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Joins a text[] for full-text indexing.
--
-- `array_to_string` cannot be used directly in a generated column: Postgres
-- marks it STABLE rather than IMMUTABLE, because for a generic anyarray the
-- element type's output function might not be immutable. For text[] it always
-- is, so this wrapper asserts what the generic signature cannot.
create or replace function hadid.array_to_text(arr text[])
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(array_to_string(arr, ' '), '');
$$;

-- ---------------------------------------------------------------------------
-- Grants
--
-- Deliberately broad. RLS is what restricts rows; a GRANT without RLS would be
-- the actual mistake. Every table created in later migrations enables RLS.
-- ---------------------------------------------------------------------------

grant usage on schema hadid to anon, authenticated, service_role;

grant all on all tables    in schema hadid to anon, authenticated, service_role;
grant all on all routines  in schema hadid to anon, authenticated, service_role;
grant all on all sequences in schema hadid to anon, authenticated, service_role;

-- Without these, every future migration needs the grants above re-run by hand.
alter default privileges in schema hadid
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema hadid
  grant all on routines to anon, authenticated, service_role;
alter default privileges in schema hadid
  grant all on sequences to anon, authenticated, service_role;

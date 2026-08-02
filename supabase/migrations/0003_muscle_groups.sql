-- 0003 — muscle groups
--
-- Reference data with no owner. IDs are stable strings, not UUIDs, because
-- `svg_group` is joined to a `<g id>` in the anatomy diagram — a renamed
-- muscle would silently stop tinting rather than raising an error.

create table if not exists hadid.muscle_groups (
  id         text primary key,
  name       text not null,
  region     text not null check (region in ('upper', 'lower', 'core')),
  body_side  text not null check (body_side in ('front', 'back', 'both')),
  svg_group  text not null,
  sort_order int  not null default 0
);

-- Rows come from supabase/seed/reference.sql, generated from data/*.ts so the
-- bundled client copy and the database copy cannot drift.

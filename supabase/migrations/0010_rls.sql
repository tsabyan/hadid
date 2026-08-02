-- 0010 — row level security
--
-- Every policy in the app lives in this one file on purpose. RLS *is* the
-- authorization model here: there is no privileged server path, the anon key
-- ships in the browser bundle, and the service role key is only ever used by
-- the keepalive cron. Policies scattered across ten migrations cannot be
-- reviewed as a whole, and a boundary you cannot read in one sitting is a
-- boundary nobody checks.
--
-- Ownership is expressed two ways:
--   * direct    — the table has a user_id
--   * inherited — the table reaches a user_id through its parent

alter table hadid.muscle_groups      enable row level security;
alter table hadid.exercises          enable row level security;
alter table hadid.exercise_muscles   enable row level security;
alter table hadid.routines           enable row level security;
alter table hadid.routine_versions   enable row level security;
alter table hadid.routine_exercises  enable row level security;
alter table hadid.routine_sets       enable row level security;
alter table hadid.workouts           enable row level security;
alter table hadid.workout_exercises  enable row level security;
alter table hadid.sets               enable row level security;
alter table hadid.personal_records   enable row level security;
alter table hadid.achievements       enable row level security;
alter table hadid.user_achievements  enable row level security;

-- ---------------------------------------------------------------------------
-- Reference data — readable by everyone, writable by nobody.
-- No insert/update/delete policy exists, so those are denied by default.
-- ---------------------------------------------------------------------------

drop policy if exists "read muscle groups" on hadid.muscle_groups;
create policy "read muscle groups" on hadid.muscle_groups
  for select to anon, authenticated using (true);

drop policy if exists "read achievements" on hadid.achievements;
create policy "read achievements" on hadid.achievements
  for select to anon, authenticated using (true);

drop policy if exists "read exercise muscles" on hadid.exercise_muscles;
create policy "read exercise muscles" on hadid.exercise_muscles
  for select to anon, authenticated using (true);

-- Custom exercises need their mapping written too, so ownership is inherited
-- from the exercise. Built-ins have a null user_id and fail this check, which
-- is what keeps the shared library read-only.
drop policy if exists "write own exercise muscles" on hadid.exercise_muscles;
create policy "write own exercise muscles" on hadid.exercise_muscles
  for all to authenticated
  using (exists (select 1 from hadid.exercises e
                 where e.id = exercise_muscles.exercise_id and e.user_id = auth.uid()))
  with check (exists (select 1 from hadid.exercises e
                      where e.id = exercise_muscles.exercise_id and e.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Exercises — built-ins are public, custom ones are private.
-- ---------------------------------------------------------------------------

drop policy if exists "read builtin or own exercises" on hadid.exercises;
create policy "read builtin or own exercises" on hadid.exercises
  for select to anon, authenticated
  using (user_id is null or user_id = auth.uid());

drop policy if exists "insert own exercises" on hadid.exercises;
create policy "insert own exercises" on hadid.exercises
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "update own exercises" on hadid.exercises;
create policy "update own exercises" on hadid.exercises
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "delete own exercises" on hadid.exercises;
create policy "delete own exercises" on hadid.exercises
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Directly owned tables
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['routines', 'workouts'] loop
    execute format('drop policy if exists "own rows" on hadid.%I', t);
    execute format($f$
      create policy "own rows" on hadid.%I
        for all to authenticated
        using (auth.uid() = user_id)
        with check (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Inherited ownership
--
-- Each policy walks up to the row that carries user_id. The joins are indexed
-- on both sides, so this costs a lookup rather than a scan.
-- ---------------------------------------------------------------------------

drop policy if exists "own routine versions" on hadid.routine_versions;
create policy "own routine versions" on hadid.routine_versions
  for all to authenticated
  using (exists (select 1 from hadid.routines r
                 where r.id = routine_versions.routine_id and r.user_id = auth.uid()))
  with check (exists (select 1 from hadid.routines r
                      where r.id = routine_versions.routine_id and r.user_id = auth.uid()));

drop policy if exists "own routine exercises" on hadid.routine_exercises;
create policy "own routine exercises" on hadid.routine_exercises
  for all to authenticated
  using (exists (select 1 from hadid.routine_versions rv
                 join hadid.routines r on r.id = rv.routine_id
                 where rv.id = routine_exercises.routine_version_id
                   and r.user_id = auth.uid()))
  with check (exists (select 1 from hadid.routine_versions rv
                      join hadid.routines r on r.id = rv.routine_id
                      where rv.id = routine_exercises.routine_version_id
                        and r.user_id = auth.uid()));

drop policy if exists "own routine sets" on hadid.routine_sets;
create policy "own routine sets" on hadid.routine_sets
  for all to authenticated
  using (exists (select 1 from hadid.routine_exercises re
                 join hadid.routine_versions rv on rv.id = re.routine_version_id
                 join hadid.routines r on r.id = rv.routine_id
                 where re.id = routine_sets.routine_exercise_id
                   and r.user_id = auth.uid()))
  with check (exists (select 1 from hadid.routine_exercises re
                      join hadid.routine_versions rv on rv.id = re.routine_version_id
                      join hadid.routines r on r.id = rv.routine_id
                      where re.id = routine_sets.routine_exercise_id
                        and r.user_id = auth.uid()));

drop policy if exists "own workout exercises" on hadid.workout_exercises;
create policy "own workout exercises" on hadid.workout_exercises
  for all to authenticated
  using (exists (select 1 from hadid.workouts w
                 where w.id = workout_exercises.workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from hadid.workouts w
                      where w.id = workout_exercises.workout_id and w.user_id = auth.uid()));

drop policy if exists "own sets" on hadid.sets;
create policy "own sets" on hadid.sets
  for all to authenticated
  using (exists (select 1 from hadid.workout_exercises we
                 join hadid.workouts w on w.id = we.workout_id
                 where we.id = sets.workout_exercise_id and w.user_id = auth.uid()))
  with check (exists (select 1 from hadid.workout_exercises we
                      join hadid.workouts w on w.id = we.workout_id
                      where we.id = sets.workout_exercise_id and w.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- Earned data — readable by its owner, writable by nobody.
--
-- There is deliberately no insert or update policy on either table. Both are
-- written exclusively by security definer functions, which is what makes a PR
-- and a badge mean something: the client cannot fabricate them.
-- ---------------------------------------------------------------------------

drop policy if exists "read own prs" on hadid.personal_records;
create policy "read own prs" on hadid.personal_records
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "read own achievements" on hadid.user_achievements;
create policy "read own achievements" on hadid.user_achievements
  for select to authenticated using (user_id = auth.uid());

-- Deleting a workout should take its records with it, so a delete policy is
-- the one write the owner does get.
drop policy if exists "delete own prs" on hadid.personal_records;
create policy "delete own prs" on hadid.personal_records
  for delete to authenticated using (user_id = auth.uid());

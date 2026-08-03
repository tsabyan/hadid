-- 0009 — aggregate views
--
-- Plain views, not materialized. A materialized view needs a refresh strategy,
-- and a stale chart is a worse failure than a slightly slower query. Promote
-- these only if the free-tier instance actually shows a problem.
--
-- Views inherit the RLS of their underlying tables when created with
-- security_invoker, which is why it is set explicitly here. Without it a view
-- runs as its owner and quietly hands every user everyone else's history.

-- Reps are aggregated from `sets` rather than derived from set_count, because
-- "reps this week" is a headline metric and set count is not a stand-in for
-- it: three sets of five and three sets of fifteen are not the same week.
--
-- Written as a join rather than a correlated subquery — a subquery referencing
-- p.timezone inside a grouped select would need it in the GROUP BY, and that
-- is the kind of thing that works until someone adds a column.
create or replace view hadid.v_daily_volume
with (security_invoker = true) as
with sessions as (
  select w.id,
         w.user_id,
         (w.started_at at time zone coalesce(p.timezone, 'UTC'))::date as day,
         w.total_volume_kg,
         w.total_sets,
         w.duration_seconds
  from hadid.workouts w
  left join hadid.profiles p on p.id = w.user_id
  where w.ended_at is not null
),
reps as (
  select we.workout_id, sum(s.reps) as reps
  from hadid.sets s
  join hadid.workout_exercises we on we.id = s.workout_exercise_id
  where s.is_warmup = false
  group by we.workout_id
)
select s.user_id,
       s.day,
       count(distinct s.id)                 as workout_count,
       coalesce(sum(s.total_volume_kg), 0)  as volume_kg,
       coalesce(sum(s.total_sets), 0)       as set_count,
       coalesce(sum(s.duration_seconds), 0) as duration_seconds,
       coalesce(sum(r.reps), 0)             as rep_count
from sessions s
left join reps r on r.workout_id = s.id
group by s.user_id, s.day;

create or replace view hadid.v_muscle_load
with (security_invoker = true) as
select w.user_id,
       (w.started_at at time zone coalesce(p.timezone, 'UTC'))::date as day,
       em.muscle_group_id,
       -- Volume weighted by how much the muscle actually contributes. Without
       -- the activation factor every assisting muscle would score as heavily
       -- as the target, and the heat map would be a uniform smear.
       sum(s.volume_kg * em.activation) as load_kg
from hadid.sets s
join hadid.workout_exercises we on we.id = s.workout_exercise_id
join hadid.workouts w          on w.id = we.workout_id
join hadid.exercise_muscles em on em.exercise_id = we.exercise_id
left join hadid.profiles p     on p.id = w.user_id
where w.ended_at is not null
  and s.is_warmup = false
group by w.user_id, 2, em.muscle_group_id;

create or replace view hadid.v_workout_summary
with (security_invoker = true) as
select w.id            as workout_id,
       w.user_id,
       w.name,
       w.started_at,
       w.ended_at,
       w.duration_seconds,
       w.total_volume_kg,
       w.total_sets,
       count(distinct we.exercise_id) as exercise_count,
       array_agg(distinct e.name order by e.name)
         filter (where e.name is not null) as exercise_names
from hadid.workouts w
left join hadid.workout_exercises we on we.workout_id = w.id
left join hadid.exercises e          on e.id = we.exercise_id
group by w.id;

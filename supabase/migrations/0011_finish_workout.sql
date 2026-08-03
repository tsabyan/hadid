-- 0011 — finish_workout
--
-- The single call the client makes when a session ends. Stamps the end time,
-- detects records, re-evaluates badges, and returns everything the summary
-- sheet needs, in one transaction.
--
-- One round trip rather than three, because the alternative is a half-finished
-- workout: connection drops after the end stamp but before PR detection, and
-- the user has a completed session that never awarded anything. In a gym
-- basement that is not a rare case.

create or replace function hadid.finish_workout(p_workout_id uuid)
returns jsonb
language plpgsql
security definer set search_path = hadid, pg_temp
as $$
declare
  v_user    uuid;
  v_summary jsonb;
  v_prs     jsonb;
  v_badges  jsonb;
begin
  -- security definer bypasses RLS, so ownership is checked by hand. Without
  -- this, any authenticated user could finish anyone's workout by guessing an
  -- id — the one hole a definer function opens if you let it.
  select w.user_id into v_user
  from hadid.workouts w
  where w.id = p_workout_id;

  if v_user is null then
    raise exception 'workout not found';
  end if;

  if v_user <> auth.uid() then
    raise exception 'not your workout';
  end if;

  update hadid.workouts w
  set ended_at = coalesce(w.ended_at, now()),
      duration_seconds = coalesce(
        w.duration_seconds,
        greatest(0, extract(epoch from (now() - w.started_at))::int)
      )
  where w.id = p_workout_id;

  select coalesce(jsonb_agg(to_jsonb(pr)), '[]'::jsonb)
    into v_prs
  from hadid.detect_prs(p_workout_id) pr;

  select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
    into v_badges
  from hadid.evaluate_achievements(v_user) b;

  select to_jsonb(s) into v_summary
  from hadid.v_workout_summary s
  where s.workout_id = p_workout_id;

  return jsonb_build_object(
    'summary',    coalesce(v_summary, '{}'::jsonb),
    'new_prs',    v_prs,
    'new_badges', v_badges
  );
end;
$$;

-- Postgres grants EXECUTE on every new function to PUBLIC, and PUBLIC
-- includes anon and authenticated. Revoking from those two roles by name
-- looks right and does nothing — the grant that actually matters is the
-- implicit one. Revoke from PUBLIC first, then hand execute back explicitly.
revoke execute on function hadid.detect_prs(uuid) from public, anon, authenticated;
revoke execute on function hadid.evaluate_achievements(uuid) from public, anon, authenticated;
revoke execute on function hadid.finish_workout(uuid) from public, anon, authenticated;

-- The client calls this instead of writing ended_at itself. detect_prs stays
-- unreachable: it is called only from inside finish_workout, which runs as
-- the definer and therefore does not need the caller to hold the grant.
grant execute on function hadid.finish_workout(uuid) to authenticated;
grant execute on function hadid.evaluate_achievements(uuid) to authenticated;

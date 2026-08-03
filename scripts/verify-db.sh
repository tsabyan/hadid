#!/usr/bin/env bash
#
# End-to-end verification against the live Supabase project.
#
# Run: npm run verify:db
#
# Covers what unit tests cannot: that RLS, the security definer functions, the
# totals trigger, and anonymous auth all behave against a real Postgres. Every
# one of the three bugs found in this schema so far was invisible to
# typecheck, lint, and vitest, and visible here on the first run.
#
# Creates two throwaway anonymous users and one workout, then deletes the
# workout. The two auth users remain — clear them from Authentication -> Users
# if they accumulate.
set -uo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a

U=$NEXT_PUBLIC_SUPABASE_URL
K=$NEXT_PUBLIC_SUPABASE_ANON_KEY
J() { python3 -c "import sys,json;d=json.load(sys.stdin);print($1)" 2>/dev/null; }
pass() { printf "  \033[32mPASS\033[0m %s\n" "$1"; }
fail() { printf "  \033[31mFAIL\033[0m %s\n" "$1"; FAILED=1; }
FAILED=0

anon() { curl -s -X POST "$U/auth/v1/signup" -H "apikey: $K" -H "Content-Type: application/json" -d '{}'; }

echo "== auth =="
A=$(anon); T1=$(echo "$A" | J "d['access_token']"); UID1=$(echo "$A" | J "d['user']['id']")
[ -n "$T1" ] && pass "anonymous sign-in (user 1)" || { fail "anonymous sign-in: $(echo "$A"|head -c 200)"; exit 1; }

B=$(anon); T2=$(echo "$B" | J "d['access_token']"); UID2=$(echo "$B" | J "d['user']['id']")
[ -n "$T2" ] && pass "anonymous sign-in (user 2)" || fail "second sign-in"

as1=(-H "apikey: $K" -H "Authorization: Bearer $T1" -H "Accept-Profile: hadid" -H "Content-Profile: hadid" -H "Content-Type: application/json")
as2=(-H "apikey: $K" -H "Authorization: Bearer $T2" -H "Accept-Profile: hadid" -H "Content-Profile: hadid" -H "Content-Type: application/json")

echo "== profile trigger =="
P=$(curl -s "$U/rest/v1/profiles?select=id,timezone,unit_system" "${as1[@]}")
[ "$(echo "$P" | J "len(d)")" = "1" ] && pass "profile auto-created by trigger" || fail "profile row: $P"

echo "== workout write path =="
EX=$(curl -s "$U/rest/v1/exercises?slug=eq.barbell-bench-press&select=id" "${as1[@]}" | J "d[0]['id']")
[ -n "$EX" ] && pass "exercise lookup by slug" || fail "exercise lookup"

WID=$(python3 -c "import uuid;print(uuid.uuid4())")
W=$(curl -s -X POST "$U/rest/v1/workouts" "${as1[@]}" -H "Prefer: return=representation" \
  -d "{\"id\":\"$WID\",\"user_id\":\"$UID1\",\"name\":\"E2E Test\"}")
echo "$W" | grep -q "$WID" && pass "workout insert (client-generated id)" || fail "workout insert: $W"

WE=$(curl -s -X POST "$U/rest/v1/workout_exercises" "${as1[@]}" -H "Prefer: return=representation" \
  -d "{\"workout_id\":\"$WID\",\"exercise_id\":\"$EX\",\"position\":0}" | J "d[0]['id']")
[ -n "$WE" ] && pass "workout_exercise insert" || fail "workout_exercise insert"

for i in 1 2 3; do
  curl -s -X POST "$U/rest/v1/sets" "${as1[@]}" \
    -d "{\"id\":\"$(python3 -c 'import uuid;print(uuid.uuid4())')\",\"workout_exercise_id\":\"$WE\",\"set_number\":$i,\"weight_kg\":100,\"reps\":5}" >/dev/null
done
curl -s -X POST "$U/rest/v1/sets" "${as1[@]}" \
  -d "{\"id\":\"$(python3 -c 'import uuid;print(uuid.uuid4())')\",\"workout_exercise_id\":\"$WE\",\"set_number\":4,\"weight_kg\":20,\"reps\":10,\"is_warmup\":true}" >/dev/null

TOT=$(curl -s "$U/rest/v1/workouts?id=eq.$WID&select=total_volume_kg,total_sets" "${as1[@]}")
V=$(echo "$TOT" | J "float(d[0]['total_volume_kg'])"); S=$(echo "$TOT" | J "d[0]['total_sets']")
[ "$V" = "1500.0" ] && pass "totals trigger: 1500kg (warm-up excluded)" || fail "totals trigger got volume=$V sets=$S (expected 1500.0 / 3)"
[ "$S" = "3" ] && pass "set count excludes warm-up" || fail "set count = $S"

echo "== finish_workout =="
R=$(curl -s -X POST "$U/rest/v1/rpc/finish_workout" "${as1[@]}" -d "{\"p_workout_id\":\"$WID\"}")
NPR=$(echo "$R" | J "len(d['new_prs'])"); NB=$(echo "$R" | J "len(d['new_badges'])")
[ "$NPR" = "4" ] && pass "detect_prs: 4 baseline records" || fail "new_prs=$NPR :: $(echo "$R"|head -c 300)"
[ "$NB" = "1" ] && pass "evaluate_achievements: 1 unlock (first_rep)" || fail "new_badges=$NB :: $(echo "$R" | J "d['new_badges']")"
echo "$R" | grep -q '"name": *"First Rep"' && pass "correct badge unlocked" || printf "       badges: %s\n" "$(echo "$R" | J "d['new_badges']")"

PRC=$(curl -s "$U/rest/v1/personal_records?select=record_type,value,previous_value" "${as1[@]}")
echo "$PRC" | grep -q '"previous_value":null' && pass "baselines marked previous_value=null" || fail "pr shape: $PRC"

UA=$(curl -s "$U/rest/v1/user_achievements?select=achievement_id,progress,unlocked_at&unlocked_at=not.is.null" "${as1[@]}")
[ "$(echo "$UA" | J "len(d)")" = "1" ] && pass "user_achievements row written" || fail "user_achievements: $UA"

echo "== earned data is read-only to clients =="
FR=$(curl -s -X POST "$U/rest/v1/personal_records" "${as1[@]}" \
  -d "{\"user_id\":\"$UID1\",\"exercise_id\":\"$EX\",\"record_type\":\"max_weight\",\"value\":999}")
echo "$FR" | grep -q "42501\|violates" && pass "cannot fabricate a PR" || fail "PR insert allowed: $FR"

echo "== RLS isolation =="
X=$(curl -s "$U/rest/v1/workouts?select=id" "${as2[@]}")
[ "$X" = "[]" ] && pass "user 2 cannot see user 1's workouts" || fail "LEAK: $X"

XS=$(curl -s "$U/rest/v1/sets?select=id" "${as2[@]}")
[ "$XS" = "[]" ] && pass "user 2 cannot see user 1's sets" || fail "LEAK: $XS"

XP=$(curl -s "$U/rest/v1/personal_records?select=id" "${as2[@]}")
[ "$XP" = "[]" ] && pass "user 2 cannot see user 1's records" || fail "LEAK: $XP"

XF=$(curl -s -X POST "$U/rest/v1/rpc/finish_workout" "${as2[@]}" -d "{\"p_workout_id\":\"$WID\"}")
echo "$XF" | grep -qi "not your workout" && pass "cannot finish another user's workout" || fail "definer guard: $XF"

XE=$(curl -s -X POST "$U/rest/v1/rpc/evaluate_achievements" "${as2[@]}" -d "{\"p_user_id\":\"$UID1\"}")
echo "$XE" | grep -qi "not your achievements" && pass "cannot evaluate another user's badges" || fail "definer guard: $XE"

XD=$(curl -s -X POST "$U/rest/v1/rpc/detect_prs" "${as2[@]}" -d "{\"p_workout_id\":\"$WID\"}")
echo "$XD" | grep -qi "not find\|permission\|denied\|PGRST202" && pass "detect_prs not callable by clients" || fail "detect_prs reachable: $XD"

echo "== cleanup =="
curl -s -X DELETE "$U/rest/v1/workouts?id=eq.$WID" "${as1[@]}" >/dev/null
LEFT=$(curl -s "$U/rest/v1/workouts?select=id" "${as1[@]}")
[ "$LEFT" = "[]" ] && pass "test workout deleted (cascade)" || fail "cleanup left: $LEFT"

echo
[ "$FAILED" = "0" ] && echo "ALL PASS" || echo "SOME FAILURES"
echo "note: 2 anonymous auth users remain (uid1=$UID1 uid2=$UID2)"

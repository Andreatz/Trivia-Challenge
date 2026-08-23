-- Keep aliases in each question's answer_rules and calculate common typing errors
-- at submission time. This avoids storing every possible misspelling.
create or replace function public.audience_typo_distance(
  source_value text,
  target_value text
)
returns integer
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_source text := coalesce(source_value, '');
  v_target text := coalesce(target_value, '');
  v_source_length integer := char_length(v_source);
  v_target_length integer := char_length(v_target);
  v_previous_previous integer[];
  v_previous integer[];
  v_current integer[];
  v_i integer;
  v_j integer;
  v_cost integer;
begin
  if v_source_length = 0 then
    return v_target_length;
  end if;
  if v_target_length = 0 then
    return v_source_length;
  end if;

  v_previous := pg_catalog.array_fill(0, array[v_target_length + 1], array[0]);
  for v_j in 0..v_target_length loop
    v_previous[v_j] := v_j;
  end loop;

  for v_i in 1..v_source_length loop
    v_current := pg_catalog.array_fill(0, array[v_target_length + 1], array[0]);
    v_current[0] := v_i;

    for v_j in 1..v_target_length loop
      v_cost := case
        when pg_catalog.substr(v_source, v_i, 1) = pg_catalog.substr(v_target, v_j, 1) then 0
        else 1
      end;
      v_current[v_j] := least(
        v_current[v_j - 1] + 1,
        v_previous[v_j] + 1,
        v_previous[v_j - 1] + v_cost
      );

      -- Treat two adjacent, inverted characters as one typo (Damerau/OSA).
      if v_i > 1
         and v_j > 1
         and pg_catalog.substr(v_source, v_i, 1) = pg_catalog.substr(v_target, v_j - 1, 1)
         and pg_catalog.substr(v_source, v_i - 1, 1) = pg_catalog.substr(v_target, v_j, 1) then
        v_current[v_j] := least(v_current[v_j], v_previous_previous[v_j - 2] + 1);
      end if;
    end loop;

    v_previous_previous := v_previous;
    v_previous := v_current;
  end loop;

  return v_previous[v_target_length];
end;
$$;

create or replace function public.audience_answer_matches(
  submitted_value text,
  accepted_value text
)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_submitted text := public.audience_normalize_answer(submitted_value);
  v_accepted text := public.audience_normalize_answer(accepted_value);
  v_longest integer;
  v_tolerance integer;
begin
  if v_submitted = '' or v_accepted = '' then
    return false;
  end if;
  if v_submitted = v_accepted then
    return true;
  end if;

  v_longest := greatest(char_length(v_submitted), char_length(v_accepted));
  v_tolerance := case
    when v_longest <= 3 then 0
    when v_longest <= 7 then 1
    else 2
  end;

  if abs(char_length(v_submitted) - char_length(v_accepted)) > v_tolerance then
    return false;
  end if;

  return public.audience_typo_distance(v_submitted, v_accepted) <= v_tolerance;
end;
$$;

create or replace function public.submit_audience_answer(
  p_code text,
  p_participant_secret text,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.audience_sessions%rowtype;
  v_participant public.audience_participants%rowtype;
  v_rule jsonb;
  v_awarded integer := 0;
  v_correct boolean := false;
begin
  if char_length(btrim(coalesce(p_answer, ''))) < 1
     or char_length(btrim(coalesce(p_answer, ''))) > 160 then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'invalid_answer');
  end if;

  select *
    into v_session
    from public.audience_sessions
   where code = pg_catalog.upper(btrim(coalesce(p_code, '')));

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'room_not_found');
  end if;

  select *
    into v_participant
    from public.audience_participants
   where session_id = v_session.id
     and participant_secret_hash = public.audience_hash_secret(p_participant_secret)
   for update;

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'participant_not_found');
  end if;
  if v_session.status <> 'live' or not v_session.accepting then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'answers_closed');
  end if;
  if v_session.question_key = '' then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'no_question');
  end if;

  if exists (
    select 1
      from public.audience_attempts
     where participant_id = v_participant.id
       and question_key = v_session.question_key
       and is_correct
  ) then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'reason', 'already_correct',
      'score', v_participant.score
    );
  end if;

  if exists (
    select 1
      from public.audience_attempts
     where participant_id = v_participant.id
       and question_key = v_session.question_key
       and reveal_step = v_session.reveal_step
  ) then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'reason', 'already_answered',
      'score', v_participant.score
    );
  end if;

  for v_rule in
    select value
      from pg_catalog.jsonb_array_elements(v_session.answer_rules)
  loop
    if public.audience_answer_matches(p_answer, v_rule ->> 'answer') then
      v_correct := true;
      v_awarded := greatest(
        v_awarded,
        least(greatest(coalesce((v_rule ->> 'points')::integer, v_session.points), 0), 100000)
      );
    end if;
  end loop;

  insert into public.audience_attempts (
    session_id,
    participant_id,
    question_key,
    reveal_step,
    answer_text,
    is_correct,
    points_awarded
  )
  values (
    v_session.id,
    v_participant.id,
    v_session.question_key,
    v_session.reveal_step,
    btrim(p_answer),
    v_correct,
    v_awarded
  );

  update public.audience_participants
     set score = score + v_awarded,
         submitted_answers = submitted_answers + 1,
         correct_answers = correct_answers + case when v_correct then 1 else 0 end,
         last_seen_at = now()
   where id = v_participant.id
  returning * into v_participant;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'result', case when v_correct then 'correct' else 'wrong' end,
    'pointsAwarded', v_awarded,
    'score', v_participant.score,
    'correctAnswers', v_participant.correct_answers
  );
end;
$$;

comment on function public.audience_answer_matches(text, text) is
  'Matches normalized audience answers with a conservative 0/1/2 typo tolerance.';

revoke execute on function public.audience_typo_distance(text, text)
  from public, anon, authenticated;
revoke execute on function public.audience_answer_matches(text, text)
  from public, anon, authenticated;
revoke execute on function public.submit_audience_answer(text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_audience_answer(text, text, text)
  to anon, authenticated;

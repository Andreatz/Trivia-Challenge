create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

create table public.audience_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_secret_hash bytea not null,
  status text not null default 'waiting' check (status in ('waiting', 'live', 'finished')),
  title text not null default 'Trivia Challenge' check (char_length(title) between 1 and 80),
  game_title text not null default '' check (char_length(game_title) <= 120),
  question_key text not null default '' check (char_length(question_key) <= 180),
  question_version bigint not null default 0 check (question_version >= 0),
  question_type text not null default '' check (char_length(question_type) <= 40),
  prompt text not null default '' check (char_length(prompt) <= 500),
  points integer not null default 0 check (points between 0 and 100000),
  reveal_step smallint not null default 0 check (reveal_step between 0 and 20),
  accepting boolean not null default false,
  answer_rules jsonb not null default '[]'::jsonb check (
    jsonb_typeof(answer_rules) = 'array'
    and octet_length(answer_rules::text) <= 20000
  ),
  participant_count integer not null default 0 check (participant_count between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.audience_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.audience_sessions(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 2 and 24),
  participant_secret_hash bytea not null,
  score bigint not null default 0 check (score between 0 and 1000000000),
  submitted_answers integer not null default 0 check (submitted_answers >= 0),
  correct_answers integer not null default 0 check (correct_answers >= 0),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index audience_participants_session_nickname_key
  on public.audience_participants (session_id, lower(nickname));

create unique index audience_participants_session_secret_key
  on public.audience_participants (session_id, participant_secret_hash);

create index audience_participants_leaderboard_idx
  on public.audience_participants (
    session_id,
    score desc,
    correct_answers desc,
    joined_at,
    id
  );

create table public.audience_attempts (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.audience_sessions(id) on delete cascade,
  participant_id uuid not null references public.audience_participants(id) on delete cascade,
  question_key text not null check (char_length(question_key) between 1 and 180),
  reveal_step smallint not null check (reveal_step between 0 and 20),
  answer_text text not null check (char_length(answer_text) between 1 and 160),
  is_correct boolean not null,
  points_awarded integer not null default 0 check (points_awarded between 0 and 100000),
  created_at timestamptz not null default now(),
  unique (participant_id, question_key, reveal_step)
);

create index audience_attempts_session_question_idx
  on public.audience_attempts (session_id, question_key, created_at);

alter table public.audience_sessions enable row level security;
alter table public.audience_participants enable row level security;
alter table public.audience_attempts enable row level security;

create policy audience_sessions_no_direct_access
  on public.audience_sessions
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy audience_participants_no_direct_access
  on public.audience_participants
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy audience_attempts_no_direct_access
  on public.audience_attempts
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.audience_sessions from anon, authenticated;
revoke all on table public.audience_participants from anon, authenticated;
revoke all on table public.audience_attempts from anon, authenticated;
revoke all on sequence public.audience_attempts_id_seq from anon, authenticated;

create or replace function public.audience_hash_secret(value text)
returns bytea
language sql
immutable
security invoker
set search_path = ''
as $$
  select extensions.digest(pg_catalog.convert_to(coalesce(value, ''), 'UTF8'), 'sha256')
$$;

create or replace function public.audience_normalize_answer(value text)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select btrim(
    pg_catalog.regexp_replace(
      pg_catalog.lower(extensions.unaccent(coalesce(value, ''))),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  )
$$;

create or replace function public.audience_public_state(value public.audience_sessions)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'found', true,
    'code', value.code,
    'status', value.status,
    'title', value.title,
    'gameTitle', value.game_title,
    'questionKey', value.question_key,
    'questionVersion', value.question_version,
    'questionType', value.question_type,
    'prompt', value.prompt,
    'points', value.points,
    'revealStep', value.reveal_step,
    'accepting', value.accepting,
    'participantCount', value.participant_count,
    'updatedAt', value.updated_at
  )
$$;

create or replace function public.create_audience_session(
  p_host_secret text,
  p_title text default 'Trivia Challenge'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.audience_sessions%rowtype;
  v_code text;
begin
  if char_length(coalesce(p_host_secret, '')) < 24 then
    raise exception 'invalid_host_secret' using errcode = '22023';
  end if;

  for v_attempt in 1..20 loop
    v_code := pg_catalog.upper(
      pg_catalog.substr(
        pg_catalog.encode(extensions.gen_random_bytes(8), 'hex'),
        1,
        6
      )
    );
    begin
      insert into public.audience_sessions (code, host_secret_hash, title)
      values (
        v_code,
        public.audience_hash_secret(p_host_secret),
        left(coalesce(nullif(btrim(p_title), ''), 'Trivia Challenge'), 80)
      )
      returning * into v_session;

      return public.audience_public_state(v_session)
        || pg_catalog.jsonb_build_object('sessionId', v_session.id);
    exception
      when unique_violation then
        null;
    end;
  end loop;

  raise exception 'room_code_generation_failed';
end;
$$;

create or replace function public.get_audience_session(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.audience_sessions%rowtype;
begin
  select *
    into v_session
    from public.audience_sessions
   where code = pg_catalog.upper(btrim(coalesce(p_code, '')));

  if not found then
    return '{"found":false}'::jsonb;
  end if;

  return public.audience_public_state(v_session);
end;
$$;

create or replace function public.sync_audience_session(
  p_code text,
  p_host_secret text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.audience_sessions%rowtype;
  v_rules jsonb;
  v_status text;
begin
  if jsonb_typeof(coalesce(p_state, '{}'::jsonb)) <> 'object' then
    raise exception 'invalid_state' using errcode = '22023';
  end if;

  v_rules := coalesce(p_state -> 'answerRules', '[]'::jsonb);
  if jsonb_typeof(v_rules) <> 'array' or jsonb_array_length(v_rules) > 30 then
    raise exception 'invalid_answer_rules' using errcode = '22023';
  end if;
  if exists (
    select 1
      from pg_catalog.jsonb_array_elements(v_rules) rule
     where pg_catalog.jsonb_typeof(rule) <> 'object'
        or char_length(coalesce(rule ->> 'answer', '')) not between 1 and 160
        or coalesce(rule ->> 'points', '') !~ '^[0-9]{1,6}$'
  ) then
    raise exception 'invalid_answer_rules' using errcode = '22023';
  end if;

  v_status := coalesce(nullif(p_state ->> 'status', ''), 'waiting');
  if v_status not in ('waiting', 'live', 'finished') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.audience_sessions
     set status = v_status,
         game_title = left(coalesce(p_state ->> 'gameTitle', ''), 120),
         question_key = left(coalesce(p_state ->> 'questionKey', ''), 180),
         question_version = question_version + 1,
         question_type = left(coalesce(p_state ->> 'questionType', ''), 40),
         prompt = left(coalesce(p_state ->> 'prompt', ''), 500),
         points = least(greatest(coalesce((p_state ->> 'points')::integer, 0), 0), 100000),
         reveal_step = least(greatest(coalesce((p_state ->> 'revealStep')::smallint, 0), 0), 20),
         accepting = coalesce((p_state ->> 'accepting')::boolean, false)
           and v_status = 'live'
           and coalesce(p_state ->> 'questionKey', '') <> ''
           and jsonb_array_length(v_rules) > 0,
         answer_rules = v_rules,
         updated_at = now(),
         finished_at = case when v_status = 'finished' then coalesce(finished_at, now()) else null end
   where code = pg_catalog.upper(btrim(coalesce(p_code, '')))
     and host_secret_hash = public.audience_hash_secret(p_host_secret)
  returning * into v_session;

  if not found then
    raise exception 'invalid_host_credentials' using errcode = '28000';
  end if;

  perform realtime.send(
    public.audience_public_state(v_session),
    'state',
    'audience:' || v_session.code,
    false
  );

  return public.audience_public_state(v_session);
end;
$$;

create or replace function public.join_audience_session(
  p_code text,
  p_nickname text,
  p_participant_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.audience_sessions%rowtype;
  v_participant public.audience_participants%rowtype;
  v_nickname text;
begin
  v_nickname := btrim(pg_catalog.regexp_replace(coalesce(p_nickname, ''), '\s+', ' ', 'g'));

  if char_length(v_nickname) < 2 or char_length(v_nickname) > 24 then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'invalid_nickname');
  end if;
  if v_nickname !~ '^[[:alnum:]][[:alnum:] _.-]*$' then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'invalid_nickname');
  end if;
  if char_length(coalesce(p_participant_secret, '')) < 24 then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'invalid_participant_secret');
  end if;

  select *
    into v_session
    from public.audience_sessions
   where code = pg_catalog.upper(btrim(coalesce(p_code, '')))
     and status <> 'finished';

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'room_not_found');
  end if;
  if v_session.participant_count >= 5000 then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'room_full');
  end if;

  begin
    insert into public.audience_participants (
      session_id,
      nickname,
      participant_secret_hash
    )
    values (
      v_session.id,
      v_nickname,
      public.audience_hash_secret(p_participant_secret)
    )
    returning * into v_participant;
  exception
    when unique_violation then
      return pg_catalog.jsonb_build_object('ok', false, 'reason', 'nickname_taken');
  end;

  update public.audience_sessions
     set participant_count = participant_count + 1,
         updated_at = now()
   where id = v_session.id
  returning * into v_session;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'participant', pg_catalog.jsonb_build_object(
      'id', v_participant.id,
      'nickname', v_participant.nickname,
      'score', v_participant.score,
      'correctAnswers', v_participant.correct_answers
    ),
    'session', public.audience_public_state(v_session)
  );
end;
$$;

create or replace function public.get_audience_participant(
  p_code text,
  p_participant_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.audience_sessions%rowtype;
  v_participant public.audience_participants%rowtype;
begin
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
     and participant_secret_hash = public.audience_hash_secret(p_participant_secret);

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'participant_not_found');
  end if;

  update public.audience_participants
     set last_seen_at = now()
   where id = v_participant.id;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'participant', pg_catalog.jsonb_build_object(
      'id', v_participant.id,
      'nickname', v_participant.nickname,
      'score', v_participant.score,
      'correctAnswers', v_participant.correct_answers
    ),
    'session', public.audience_public_state(v_session)
  );
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
  v_normalized_answer text;
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

  v_normalized_answer := public.audience_normalize_answer(p_answer);
  for v_rule in
    select value
      from pg_catalog.jsonb_array_elements(v_session.answer_rules)
  loop
    if public.audience_normalize_answer(v_rule ->> 'answer') = v_normalized_answer then
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

create or replace function public.get_audience_leaderboard(
  p_code text,
  p_limit integer default 2000
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_session public.audience_sessions%rowtype;
  v_limit integer;
  v_rows jsonb;
begin
  select *
    into v_session
    from public.audience_sessions
   where code = pg_catalog.upper(btrim(coalesce(p_code, '')));

  if not found then
    return pg_catalog.jsonb_build_object('ok', false, 'reason', 'room_not_found');
  end if;

  v_limit := least(greatest(coalesce(p_limit, 2000), 1), 5000);

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'rank', ranked.rank,
        'nickname', ranked.nickname,
        'score', ranked.score,
        'correctAnswers', ranked.correct_answers
      )
      order by ranked.rank
    ),
    '[]'::jsonb
  )
    into v_rows
    from (
      select
        row_number() over (
          order by score desc, correct_answers desc, joined_at, id
        ) as rank,
        nickname,
        score,
        correct_answers
      from public.audience_participants
      where session_id = v_session.id
      order by score desc, correct_answers desc, joined_at, id
      limit v_limit
    ) ranked;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'session', public.audience_public_state(v_session),
    'leaderboard', v_rows
  );
end;
$$;

revoke execute on function public.audience_hash_secret(text) from public, anon, authenticated;
revoke execute on function public.audience_normalize_answer(text) from public, anon, authenticated;
revoke execute on function public.audience_public_state(public.audience_sessions) from public, anon, authenticated;
revoke execute on function public.create_audience_session(text, text) from public, anon, authenticated;
revoke execute on function public.get_audience_session(text) from public, anon, authenticated;
revoke execute on function public.sync_audience_session(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.join_audience_session(text, text, text) from public, anon, authenticated;
revoke execute on function public.get_audience_participant(text, text) from public, anon, authenticated;
revoke execute on function public.submit_audience_answer(text, text, text) from public, anon, authenticated;
revoke execute on function public.get_audience_leaderboard(text, integer) from public, anon, authenticated;

grant execute on function public.create_audience_session(text, text) to anon, authenticated;
grant execute on function public.get_audience_session(text) to anon, authenticated;
grant execute on function public.sync_audience_session(text, text, jsonb) to anon, authenticated;
grant execute on function public.join_audience_session(text, text, text) to anon, authenticated;
grant execute on function public.get_audience_participant(text, text) to anon, authenticated;
grant execute on function public.submit_audience_answer(text, text, text) to anon, authenticated;
grant execute on function public.get_audience_leaderboard(text, integer) to anon, authenticated;

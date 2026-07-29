create or replace function public.is_audience_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.uid()) = 'a9860645-c039-448e-940f-b14e94b4d22f'::uuid
    and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) is false,
    false
  )
$$;

revoke execute on function public.is_audience_admin()
  from public, anon, authenticated;
grant execute on function public.is_audience_admin()
  to authenticated;

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
  if not public.is_audience_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

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
  if not public.is_audience_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;

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

  return public.audience_public_state(v_session);
end;
$$;

revoke execute on function public.create_audience_session(text, text)
  from public, anon, authenticated;
revoke execute on function public.sync_audience_session(text, text, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_audience_session(text, text)
  to authenticated;
grant execute on function public.sync_audience_session(text, text, jsonb)
  to authenticated;

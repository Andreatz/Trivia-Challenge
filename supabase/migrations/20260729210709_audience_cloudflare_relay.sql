-- Supabase rimane il sistema autorevole per stato e punteggi, mentre il
-- broadcast pubblico viene affidato al relay Cloudflare.
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

  return public.audience_public_state(v_session);
end;
$$;

create or replace function public.get_audience_relay_snapshot(
  p_code text,
  p_host_secret text
)
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
   where code = pg_catalog.upper(btrim(coalesce(p_code, '')))
     and host_secret_hash = public.audience_hash_secret(p_host_secret);

  if not found then
    raise exception 'invalid_host_credentials' using errcode = '28000';
  end if;

  return public.audience_public_state(v_session);
end;
$$;

revoke execute on function public.get_audience_relay_snapshot(text, text)
  from public, anon, authenticated;
grant execute on function public.get_audience_relay_snapshot(text, text)
  to anon, authenticated;

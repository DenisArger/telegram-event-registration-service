create table if not exists event_registration_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  prompt text not null check (char_length(prompt) between 1 and 500),
  is_required boolean not null default false,
  position integer not null check (position > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_questions_event_active_pos
  on event_registration_questions(event_id, is_active, position);
create index if not exists idx_event_questions_event_version
  on event_registration_questions(event_id, version);

create table if not exists registration_question_answers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references event_registration_questions(id) on delete restrict,
  question_version integer not null check (question_version > 0),
  answer_text text,
  is_skipped boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id, question_id, question_version),
  check (not (is_skipped = true and answer_text is not null)),
  check (char_length(answer_text) <= 500 or answer_text is null)
);

create index if not exists idx_registration_question_answers_event_user
  on registration_question_answers(event_id, user_id);

create table if not exists registration_question_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  current_index integer not null default 1 check (current_index > 0),
  answers_json jsonb not null default '[]'::jsonb,
  status text not null check (status in ('active', 'cancelled', 'completed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_registration_question_sessions_active
  on registration_question_sessions(event_id, user_id)
  where status = 'active';

create index if not exists idx_registration_question_sessions_status_exp
  on registration_question_sessions(status, expires_at);

alter table event_registration_questions enable row level security;
alter table registration_question_answers enable row level security;
alter table registration_question_sessions enable row level security;

drop policy if exists event_registration_questions_select_authenticated on event_registration_questions;
create policy event_registration_questions_select_authenticated on event_registration_questions
for select to authenticated
using (true);

drop policy if exists registration_question_answers_select_authenticated on registration_question_answers;
create policy registration_question_answers_select_authenticated on registration_question_answers
for select to authenticated
using (true);

drop policy if exists registration_question_sessions_select_authenticated on registration_question_sessions;
create policy registration_question_sessions_select_authenticated on registration_question_sessions
for select to authenticated
using (true);

create or replace function list_active_event_questions(p_event_id uuid)
returns setof event_registration_questions
language sql
stable
as $$
  select *
  from event_registration_questions
  where event_id = p_event_id
    and is_active = true
  order by position asc;
$$;

create or replace function upsert_event_questions(p_event_id uuid, p_questions jsonb)
returns setof event_registration_questions
language plpgsql
as $$
declare
  v_item jsonb;
  v_count integer;
  v_position integer;
  v_prompt text;
  v_required boolean;
  v_id uuid;
  v_prev event_registration_questions%rowtype;
  v_ids uuid[] := '{}';
  v_positions integer[] := '{}';
  i integer;
begin
  if p_questions is null or jsonb_typeof(p_questions) <> 'array' then
    raise exception 'invalid_questions_payload';
  end if;

  v_count := jsonb_array_length(p_questions);
  if v_count > 10 then
    raise exception 'too_many_questions';
  end if;

  for v_item in select * from jsonb_array_elements(p_questions)
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'invalid_question_item';
    end if;

    v_position := (v_item->>'position')::integer;
    v_prompt := btrim(coalesce(v_item->>'prompt', ''));
    v_required := coalesce((v_item->>'isRequired')::boolean, false);
    v_id := nullif(v_item->>'id', '')::uuid;

    if v_position is null or v_position <= 0 then
      raise exception 'invalid_question_position';
    end if;

    if char_length(v_prompt) < 1 or char_length(v_prompt) > 500 then
      raise exception 'invalid_question_prompt';
    end if;

    if v_position = any(v_positions) then
      raise exception 'duplicate_question_position';
    end if;

    v_positions := array_append(v_positions, v_position);

    if v_id is not null then
      select *
      into v_prev
      from event_registration_questions
      where id = v_id
        and event_id = p_event_id
        and is_active = true
      limit 1;

      if v_prev.id is null then
        raise exception 'question_not_found';
      end if;

      if v_prev.prompt = v_prompt and v_prev.is_required = v_required and v_prev.position = v_position then
        v_ids := array_append(v_ids, v_prev.id);
      else
        update event_registration_questions
        set is_active = false,
            updated_at = now()
        where id = v_prev.id;

        insert into event_registration_questions(event_id, version, prompt, is_required, position, is_active)
        values (p_event_id, v_prev.version + 1, v_prompt, v_required, v_position, true)
        returning id into v_id;

        v_ids := array_append(v_ids, v_id);
      end if;
    else
      insert into event_registration_questions(event_id, version, prompt, is_required, position, is_active)
      values (p_event_id, 1, v_prompt, v_required, v_position, true)
      returning id into v_id;

      v_ids := array_append(v_ids, v_id);
    end if;
  end loop;

  for i in 1..v_count loop
    if not (i = any(v_positions)) then
      raise exception 'question_positions_must_be_sequential';
    end if;
  end loop;

  update event_registration_questions
  set is_active = false,
      updated_at = now()
  where event_id = p_event_id
    and is_active = true
    and not (id = any(v_ids));

  return query
  select *
  from event_registration_questions
  where event_id = p_event_id
    and is_active = true
  order by position asc;
end;
$$;

create or replace function save_registration_answers_and_register(
  p_event_id uuid,
  p_user_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
as $$
declare
  v_question event_registration_questions%rowtype;
  v_answer jsonb;
  v_answer_text text;
  v_is_skipped boolean;
  v_result jsonb;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'invalid_answers_payload';
  end if;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    if jsonb_typeof(v_answer) <> 'object' then
      raise exception 'invalid_answer_item';
    end if;

    if (v_answer->>'questionId') is null then
      raise exception 'answer_question_id_required';
    end if;
  end loop;

  for v_question in
    select *
    from event_registration_questions
    where event_id = p_event_id
      and is_active = true
    order by position asc
  loop
    select value
    into v_answer
    from jsonb_array_elements(p_answers) value
    where (value->>'questionId')::uuid = v_question.id
    limit 1;

    v_answer_text := null;
    v_is_skipped := false;

    if v_answer is null then
      if v_question.is_required then
        raise exception 'required_answer_missing';
      end if;
      v_is_skipped := true;
    else
      v_is_skipped := coalesce((v_answer->>'isSkipped')::boolean, false);
      v_answer_text := nullif(btrim(coalesce(v_answer->>'answerText', '')), '');

      if v_is_skipped then
        v_answer_text := null;
      end if;

      if v_question.is_required and (v_is_skipped or v_answer_text is null) then
        raise exception 'required_answer_missing';
      end if;

      if v_answer_text is not null and char_length(v_answer_text) > 500 then
        raise exception 'answer_too_long';
      end if;
    end if;

    insert into registration_question_answers(
      event_id,
      user_id,
      question_id,
      question_version,
      answer_text,
      is_skipped,
      created_at,
      updated_at
    )
    values (
      p_event_id,
      p_user_id,
      v_question.id,
      v_question.version,
      v_answer_text,
      v_is_skipped,
      now(),
      now()
    )
    on conflict (event_id, user_id, question_id, question_version)
    do update set
      answer_text = excluded.answer_text,
      is_skipped = excluded.is_skipped,
      updated_at = now();
  end loop;

  v_result := register_for_event(p_event_id, p_user_id);
  return v_result;
end;
$$;

create or replace function clear_active_question_session(p_event_id uuid, p_user_id uuid)
returns void
language sql
as $$
  update registration_question_sessions
  set status = 'completed',
      updated_at = now()
  where event_id = p_event_id
    and user_id = p_user_id
    and status = 'active';
$$;

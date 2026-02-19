alter table events
  alter column starts_at drop not null;

alter table events
  alter column capacity drop not null;

alter table events
  drop constraint if exists events_capacity_check;

alter table events
  add constraint events_capacity_optional_positive
  check (capacity is null or capacity > 0);

create or replace function register_for_event(p_event_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_capacity integer;
  v_status text;
  v_registered_count integer;
  v_next_position integer;
begin
  select capacity, status
  into v_capacity, v_status
  from events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'event_not_found';
  end if;

  if v_status <> 'published' then
    raise exception 'event_not_open';
  end if;

  if exists (
    select 1
    from registrations
    where event_id = p_event_id
      and user_id = p_user_id
      and status = 'registered'
  ) then
    return jsonb_build_object('status', 'already_registered');
  end if;

  if exists (
    select 1
    from waitlist
    where event_id = p_event_id
      and user_id = p_user_id
  ) then
    return jsonb_build_object('status', 'already_waitlisted');
  end if;

  if v_capacity is null then
    insert into registrations(event_id, user_id, status, payment_status)
    values (p_event_id, p_user_id, 'registered', 'mock_paid')
    on conflict (event_id, user_id)
    do update set status = 'registered', payment_status = 'mock_paid';

    return jsonb_build_object('status', 'registered');
  end if;

  select count(*)
  into v_registered_count
  from registrations
  where event_id = p_event_id
    and status = 'registered';

  if v_registered_count < v_capacity then
    insert into registrations(event_id, user_id, status, payment_status)
    values (p_event_id, p_user_id, 'registered', 'mock_paid')
    on conflict (event_id, user_id)
    do update set status = 'registered', payment_status = 'mock_paid';

    return jsonb_build_object('status', 'registered');
  end if;

  select coalesce(max(position), 0) + 1
  into v_next_position
  from waitlist
  where event_id = p_event_id;

  insert into waitlist(event_id, user_id, position)
  values (p_event_id, p_user_id, v_next_position)
  on conflict (event_id, user_id) do nothing;

  return jsonb_build_object('status', 'waitlisted', 'position', v_next_position);
end;
$$;

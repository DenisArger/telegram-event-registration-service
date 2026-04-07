create or replace function upsert_event_attendee_order(p_event_id uuid, p_user_ids uuid[])
returns void
language plpgsql
as $$
declare
  v_count integer;
  v_distinct_count integer;
  v_registered_count integer;
  i integer;
  v_offset integer := 1000000;
begin
  v_count := coalesce(array_length(p_user_ids, 1), 0);
  if v_count <= 0 then
    raise exception 'ordered_user_ids_required';
  end if;

  select count(*), count(distinct user_id)
  into v_count, v_distinct_count
  from unnest(p_user_ids) as t(user_id);

  if v_count <> v_distinct_count then
    raise exception 'duplicate_user_ids';
  end if;

  select count(*)
  into v_registered_count
  from registrations
  where event_id = p_event_id
    and status = 'registered'
    and user_id = any(p_user_ids);

  if v_registered_count <> v_count then
    raise exception 'invalid_attendee_set';
  end if;

  -- Move every attendee order row out of the target range first so active rows can
  -- be rewritten safely without unique(event_id, display_order) conflicts.
  update event_attendee_order
  set display_order = display_order + v_offset,
      updated_at = now()
  where event_id = p_event_id;

  for i in 1..v_count loop
    insert into event_attendee_order(event_id, user_id, display_order, updated_at)
    values (p_event_id, p_user_ids[i], i, now())
    on conflict (event_id, user_id)
    do update set
      display_order = excluded.display_order,
      updated_at = now();
  end loop;
end;
$$;

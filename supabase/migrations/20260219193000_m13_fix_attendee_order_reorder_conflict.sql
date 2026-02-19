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
    and user_id = any(p_user_ids);

  if v_registered_count <> v_count then
    raise exception 'invalid_attendee_set';
  end if;

  -- Move existing rows away from target range to avoid unique(event_id, display_order)
  -- collisions during reordering (e.g., swapping positions).
  update event_attendee_order
  set display_order = display_order + v_offset,
      updated_at = now()
  where event_id = p_event_id
    and user_id = any(p_user_ids);

  for i in 1..v_count loop
    insert into event_attendee_order(event_id, user_id, display_order, updated_at)
    values (p_event_id, p_user_ids[i], i, now())
    on conflict (event_id, user_id)
    do update set
      display_order = excluded.display_order,
      updated_at = now();
  end loop;

  delete from event_attendee_order
  where event_id = p_event_id
    and not (user_id = any(p_user_ids));
end;
$$;

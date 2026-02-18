create or replace function promote_next_waitlist(p_event_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_promoted_user uuid;
begin
  delete from waitlist
  where id = (
    select id
    from waitlist
    where event_id = p_event_id
    order by position asc
    limit 1
    for update skip locked
  )
  returning user_id into v_promoted_user;

  if v_promoted_user is null then
    return jsonb_build_object('status', 'empty_waitlist');
  end if;

  insert into registrations(event_id, user_id, status, payment_status)
  values (p_event_id, v_promoted_user, 'registered', 'mock_paid')
  on conflict (event_id, user_id)
  do update set status = 'registered', payment_status = 'mock_paid';

  with ordered as (
    select id, row_number() over (order by created_at asc) as rn
    from waitlist
    where event_id = p_event_id
  )
  update waitlist w
  set position = o.rn
  from ordered o
  where w.id = o.id;

  return jsonb_build_object(
    'status', 'promoted',
    'user_id', v_promoted_user
  );
end;
$$;

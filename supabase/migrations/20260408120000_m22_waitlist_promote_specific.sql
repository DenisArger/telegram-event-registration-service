create or replace function promote_waitlist_user(p_event_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_promoted_user uuid;
begin
  delete from waitlist
  where event_id = p_event_id
    and user_id = p_user_id
  returning user_id into v_promoted_user;

  if v_promoted_user is null then
    return jsonb_build_object('status', 'not_found');
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

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  full_name text not null,
  username text,
  role text not null default 'participant' check (role in ('participant', 'organizer', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_by uuid not null references users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled')),
  payment_status text not null default 'mock_pending' check (payment_status in ('mock_pending', 'mock_paid')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (event_id, user_id),
  unique (event_id, position)
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null default 'manual' check (method in ('qr', 'manual')),
  unique (event_id, user_id)
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('t24h', 't1h')),
  sent_at timestamptz,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  unique (event_id, user_id, type)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id) on delete set null,
  entity text not null,
  entity_id uuid,
  action text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_status_starts_at on events(status, starts_at);
create index if not exists idx_registrations_event_status on registrations(event_id, status);
create index if not exists idx_waitlist_event_position on waitlist(event_id, position);
create index if not exists idx_checkins_event on checkins(event_id);
create index if not exists idx_notifications_status on notifications(status);

alter table users enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table waitlist enable row level security;
alter table checkins enable row level security;
alter table notifications enable row level security;
alter table audit_logs enable row level security;

drop policy if exists users_select_authenticated on users;
create policy users_select_authenticated on users
for select to authenticated
using (true);

drop policy if exists events_select_authenticated on events;
create policy events_select_authenticated on events
for select to authenticated
using (true);

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

  if v_capacity is null then
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

create or replace function cancel_registration(p_event_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_promoted_user uuid;
begin
  update registrations
  set status = 'cancelled'
  where event_id = p_event_id
    and user_id = p_user_id
    and status = 'registered';

  if not found then
    return jsonb_build_object('status', 'not_registered');
  end if;

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

  if v_promoted_user is not null then
    insert into registrations(event_id, user_id, status, payment_status)
    values (p_event_id, v_promoted_user, 'registered', 'mock_paid')
    on conflict (event_id, user_id)
    do update set status = 'registered', payment_status = 'mock_paid';
  end if;

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
    'status', 'cancelled',
    'promoted_user_id', v_promoted_user
  );
end;
$$;

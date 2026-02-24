create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references users(id) on delete restrict,
  telegram_bot_token_encrypted text,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists idx_organization_members_user_id on organization_members(user_id);

alter table events add column if not exists organization_id uuid references organizations(id) on delete restrict;

with owner_orgs as (
  insert into organizations(name, owner_user_id)
  select concat('Default org ', u.id::text), u.id
  from users u
  where exists (select 1 from events e where e.created_by = u.id)
    and not exists (select 1 from organizations o where o.owner_user_id = u.id)
  returning id, owner_user_id
)
insert into organization_members(organization_id, user_id, role)
select id, owner_user_id, 'owner'
from owner_orgs
on conflict (organization_id, user_id) do nothing;

insert into organization_members(organization_id, user_id, role)
select o.id, o.owner_user_id, 'owner'
from organizations o
on conflict (organization_id, user_id) do nothing;

update events e
set organization_id = o.id
from organizations o
where e.organization_id is null
  and o.owner_user_id = e.created_by;

alter table events alter column organization_id set not null;

create unique index if not exists idx_events_org_title_starts
on events (organization_id, title, starts_at);

create index if not exists idx_events_org_status_starts
on events (organization_id, status, starts_at);

create or replace function set_event_organization_from_creator()
returns trigger
language plpgsql
as $$
begin
  if new.organization_id is null then
    select o.id
      into new.organization_id
    from organizations o
    where o.owner_user_id = new.created_by
    order by o.created_at asc
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_events_set_org_on_insert on events;
create trigger trg_events_set_org_on_insert
before insert on events
for each row
execute function set_event_organization_from_creator();

alter table organizations enable row level security;
alter table organization_members enable row level security;

drop policy if exists organizations_select_authenticated on organizations;
create policy organizations_select_authenticated on organizations
for select to authenticated
using (true);

drop policy if exists organization_members_select_authenticated on organization_members;
create policy organization_members_select_authenticated on organization_members
for select to authenticated
using (true);

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table events enable row level security;

drop policy if exists organizations_select_authenticated on organizations;
drop policy if exists organizations_insert_authenticated on organizations;
drop policy if exists organizations_update_authenticated on organizations;
drop policy if exists organizations_delete_authenticated on organizations;

create policy organizations_select_authenticated on organizations
for select to authenticated
using (
  exists (
    select 1
    from organization_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy organizations_insert_authenticated on organizations
for insert to authenticated
with check (
  owner_user_id = auth.uid()
);

create policy organizations_update_authenticated on organizations
for update to authenticated
using (
  exists (
    select 1
    from organization_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from organization_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
);

create policy organizations_delete_authenticated on organizations
for delete to authenticated
using (
  exists (
    select 1
    from organization_members m
    where m.organization_id = organizations.id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  )
);

drop policy if exists organization_members_select_authenticated on organization_members;
drop policy if exists organization_members_insert_authenticated on organization_members;
drop policy if exists organization_members_update_authenticated on organization_members;
drop policy if exists organization_members_delete_authenticated on organization_members;

create policy organization_members_select_authenticated on organization_members
for select to authenticated
using (
  exists (
    select 1
    from organization_members self_m
    where self_m.organization_id = organization_members.organization_id
      and self_m.user_id = auth.uid()
      and self_m.role in ('owner', 'admin')
  )
);

create policy organization_members_insert_authenticated on organization_members
for insert to authenticated
with check (
  exists (
    select 1
    from organization_members self_m
    where self_m.organization_id = organization_members.organization_id
      and self_m.user_id = auth.uid()
      and self_m.role = 'owner'
  )
  and role in ('owner', 'admin')
);

create policy organization_members_update_authenticated on organization_members
for update to authenticated
using (
  exists (
    select 1
    from organization_members self_m
    where self_m.organization_id = organization_members.organization_id
      and self_m.user_id = auth.uid()
      and self_m.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from organization_members self_m
    where self_m.organization_id = organization_members.organization_id
      and self_m.user_id = auth.uid()
      and self_m.role = 'owner'
  )
  and role in ('owner', 'admin')
);

create policy organization_members_delete_authenticated on organization_members
for delete to authenticated
using (
  exists (
    select 1
    from organization_members self_m
    where self_m.organization_id = organization_members.organization_id
      and self_m.user_id = auth.uid()
      and self_m.role = 'owner'
  )
);

drop policy if exists events_select_authenticated on events;
drop policy if exists events_insert_authenticated on events;
drop policy if exists events_update_authenticated on events;
drop policy if exists events_delete_authenticated on events;

create policy events_select_authenticated on events
for select to authenticated
using (
  exists (
    select 1
    from organization_members m
    where m.organization_id = events.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy events_insert_authenticated on events
for insert to authenticated
with check (
  exists (
    select 1
    from organization_members m
    where m.organization_id = events.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy events_update_authenticated on events
for update to authenticated
using (
  exists (
    select 1
    from organization_members m
    where m.organization_id = events.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from organization_members m
    where m.organization_id = events.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

create policy events_delete_authenticated on events
for delete to authenticated
using (
  exists (
    select 1
    from organization_members m
    where m.organization_id = events.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

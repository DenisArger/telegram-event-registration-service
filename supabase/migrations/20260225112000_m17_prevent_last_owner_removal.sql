create or replace function prevent_last_owner_removal()
returns trigger
language plpgsql
as $$
declare
  v_other_owner_exists boolean;
begin
  if tg_op = 'DELETE' then
    if old.role <> 'owner' then
      return old;
    end if;

    select exists (
      select 1
      from organization_members om
      where om.organization_id = old.organization_id
        and om.user_id <> old.user_id
        and om.role = 'owner'
    )
    into v_other_owner_exists;

    if not v_other_owner_exists then
      raise exception 'last_owner_violation';
    end if;

    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.role = 'owner' and new.role <> 'owner' then
      select exists (
        select 1
        from organization_members om
        where om.organization_id = old.organization_id
          and om.user_id <> old.user_id
          and om.role = 'owner'
      )
      into v_other_owner_exists;

      if not v_other_owner_exists then
        raise exception 'last_owner_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_organization_members_prevent_last_owner on organization_members;
create trigger trg_organization_members_prevent_last_owner
before update or delete on organization_members
for each row
execute function prevent_last_owner_removal();

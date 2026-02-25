create or replace function transfer_organization_ownership(
  p_organization_id uuid,
  p_current_owner_user_id uuid,
  p_new_owner_user_id uuid
)
returns jsonb
language plpgsql
as $$
begin
  if p_current_owner_user_id = p_new_owner_user_id then
    raise exception 'owner_transfer_same_user';
  end if;

  if not exists (
    select 1
    from organization_members
    where organization_id = p_organization_id
      and user_id = p_current_owner_user_id
      and role = 'owner'
  ) then
    raise exception 'owner_transfer_forbidden';
  end if;

  if not exists (
    select 1
    from organization_members
    where organization_id = p_organization_id
      and user_id = p_new_owner_user_id
      and role in ('owner', 'admin')
  ) then
    raise exception 'owner_transfer_target_not_member';
  end if;

  update organization_members
  set role = 'admin'
  where organization_id = p_organization_id
    and user_id = p_current_owner_user_id
    and role = 'owner';

  update organization_members
  set role = 'owner'
  where organization_id = p_organization_id
    and user_id = p_new_owner_user_id;

  update organizations
  set owner_user_id = p_new_owner_user_id
  where id = p_organization_id;

  return jsonb_build_object(
    'organization_id', p_organization_id,
    'previous_owner_user_id', p_current_owner_user_id,
    'new_owner_user_id', p_new_owner_user_id
  );
end;
$$;

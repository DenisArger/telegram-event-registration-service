-- Bootstrap email auth for existing admin/organizer users.
-- Run in Supabase SQL editor as project admin (postgres role).
-- Idempotent: safe to run multiple times.

create extension if not exists pgcrypto;

create schema if not exists ops;

create table if not exists ops.admin_auth_seed (
  email text primary key
);

-- Fill this list before running the bootstrap.
-- Keep emails in lowercase.
insert into ops.admin_auth_seed(email)
values
  ('den.arger@gmail.com')
on conflict (email) do nothing;

do $$
declare
  v_email text;
  v_user_id uuid;
begin
  for v_email in
    select lower(btrim(email))
    from ops.admin_auth_seed
    where email is not null and btrim(email) <> ''
  loop
    select u.id
      into v_user_id
    from auth.users u
    where lower(u.email) = v_email
    limit 1;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      )
      values (
        v_user_id,
        'authenticated',
        'authenticated',
        v_email,
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now()
      );
    end if;

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      created_at,
      updated_at,
      last_sign_in_at
    )
    values (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    )
    on conflict (provider, provider_id) do nothing;

    update public.users pu
       set auth_user_id = v_user_id,
           email = v_email
     where lower(pu.email) = v_email
       and pu.role in ('admin', 'organizer');
  end loop;
end $$;

-- Verify linked users in public schema.
select id, role, email, auth_user_id
from public.users
where role in ('admin', 'organizer')
order by role, email nulls last, id;

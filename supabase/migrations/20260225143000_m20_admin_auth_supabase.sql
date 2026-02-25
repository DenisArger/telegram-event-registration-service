alter table users
  add column if not exists auth_user_id uuid,
  add column if not exists email text;

create unique index if not exists users_auth_user_id_unique_idx
  on users(auth_user_id)
  where auth_user_id is not null;

create unique index if not exists users_email_lower_unique_idx
  on users(lower(email))
  where email is not null and btrim(email) <> '';


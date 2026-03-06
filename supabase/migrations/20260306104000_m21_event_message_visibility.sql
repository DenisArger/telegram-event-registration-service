alter table public.events
  add column if not exists show_title boolean not null default true,
  add column if not exists show_schedule boolean not null default true,
  add column if not exists show_location boolean not null default true,
  add column if not exists show_description boolean not null default true,
  add column if not exists show_registration_success_message boolean not null default true;

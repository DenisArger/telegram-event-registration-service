alter table events
  add column if not exists ends_at timestamptz;

alter table events
  drop constraint if exists events_ends_at_after_starts_at;

alter table events
  add constraint events_ends_at_after_starts_at
  check (ends_at is null or ends_at > starts_at);

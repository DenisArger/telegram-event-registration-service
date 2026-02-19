alter table events
  add column if not exists registration_success_message text;

alter table events
  drop constraint if exists events_registration_success_message_len;

alter table events
  add constraint events_registration_success_message_len
  check (
    registration_success_message is null
    or char_length(registration_success_message) <= 4000
  );

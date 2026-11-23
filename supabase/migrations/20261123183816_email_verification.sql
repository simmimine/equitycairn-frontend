-- Email verification: token/state columns, sign-up throttle table and atomic throttle function.

alter table public.beta_signups
  add column verify_token_hash text,
  add column verify_expires_at timestamptz,
  add column verified_at timestamptz,
  add column manage_token_hash text,
  add column last_email_sent_at timestamptz;

create unique index beta_signups_verify_token_hash_key
  on public.beta_signups (verify_token_hash)
  where verify_token_hash is not null;

create unique index beta_signups_manage_token_hash_key
  on public.beta_signups (manage_token_hash)
  where manage_token_hash is not null;

create table public.signup_rate_limits (
  key text primary key,
  last_attempt_at timestamptz not null
);

alter table public.signup_rate_limits enable row level security;
revoke all on table public.signup_rate_limits from public, anon, authenticated;

-- Returns 0 and records the attempt when the key has no attempt within the last
-- p_window_seconds; otherwise returns the whole seconds remaining (>= 1) without
-- recording. A single statement, so concurrent callers cannot both pass.
create function public.check_signup_rate_limit(p_key text, p_window_seconds integer)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with attempt as (
    insert into public.signup_rate_limits as r (key, last_attempt_at)
    values (p_key, now())
    on conflict (key) do update
      set last_attempt_at = now()
      where r.last_attempt_at <= now() - make_interval(secs => p_window_seconds)
    returning 1
  )
  select case
    when exists (select 1 from attempt) then 0
    else greatest(
      1,
      ceil(extract(epoch from (
        (select s.last_attempt_at from public.signup_rate_limits s where s.key = p_key)
        + make_interval(secs => p_window_seconds) - now()
      )))::integer
    )
  end;
$$;

revoke all on function public.check_signup_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.check_signup_rate_limit(text, integer) to service_role;

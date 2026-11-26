-- Settings page: one-time account links, bug reports, account deletion, session end, and no
-- email changes.

-- 1. One-time links for password change and account deletion. Server (service role) only.
create table public.account_action_tokens (
  user_id uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('password_change', 'account_delete')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- One live link per user per purpose: a new request replaces the old.
  primary key (user_id, purpose)
);

alter table public.account_action_tokens enable row level security;
revoke all on table public.account_action_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.account_action_tokens to service_role;

-- 2. Bug reports. Written by the server; status is edited in the dashboard.
create table public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  what_happened text not null check (char_length(what_happened) between 1 and 2000),
  expected text check (char_length(expected) <= 2000),
  page_path text check (char_length(page_path) <= 200),
  browser text check (char_length(browser) <= 500),
  screen text check (char_length(screen) <= 11),
  status text not null default 'new' check (status in ('new', 'looking', 'fixed')),
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;
revoke all on table public.bug_reports from public, anon, authenticated;
grant select, insert, update, delete on table public.bug_reports to service_role;

-- 3. End every session of a user (used after a password change by emailed link).
create function public.end_user_sessions(p_user_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = p_user_id;
$$;

revoke all on function public.end_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.end_user_sessions(uuid) to service_role;

-- 4. Delete an account together with its beta sign-up, in one transaction. Deliberately not a
-- delete trigger: re-sending an account confirmation deletes the unconfirmed user and must
-- keep their beta sign-up. Profile, watchlist, links and bug reports cascade.
create function public.delete_account(p_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  delete from public.beta_signups b
  using auth.users u
  where u.id = p_user_id and lower(b.email) = lower(u.email);
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.delete_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_account(uuid) to service_role;

-- 5. Email addresses cannot change: the beta list is only checked when an account is created,
-- and the emailed links must keep going to the address the user signed up with.
create function public.refuse_email_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'email address cannot be changed';
  end if;
  return new;
end;
$$;

revoke all on function public.refuse_email_change() from public, anon, authenticated;

create trigger refuse_email_change
  before update of email on auth.users
  for each row execute function public.refuse_email_change();

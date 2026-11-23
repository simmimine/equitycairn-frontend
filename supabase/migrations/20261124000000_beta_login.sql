-- Beta login: membership gate on auth.users, account-state lookup, attempts throttle,
-- profiles and watchlist (owner-only RLS).

-- 1. Only verified beta members may ever get an account (second gate behind the server check).
create function public.enforce_beta_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.beta_signups b
    where lower(b.email) = lower(new.email) and b.verified_at is not null
  ) then
    raise exception 'email is not a verified beta member';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_beta_membership() from public, anon, authenticated;

create trigger enforce_beta_membership
  before insert on auth.users
  for each row execute function public.enforce_beta_membership();

-- 2. Account state lookup by email (no rows = no account).
create function public.auth_user_state(p_email text)
returns table (id uuid, confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email_confirmed_at is not null
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.auth_user_state(text) from public, anon, authenticated;
grant execute on function public.auth_user_state(text) to service_role;

-- 3. Fixed-window attempt counter. Returns 0 and counts the attempt when under p_max in the
-- current window; otherwise whole seconds until the window resets (>= 1). One statement, so
-- concurrent callers cannot both pass.
create table public.auth_attempts (
  key text primary key,
  window_start timestamptz not null,
  count integer not null
);

alter table public.auth_attempts enable row level security;
revoke all on table public.auth_attempts from public, anon, authenticated;

create function public.bump_attempts(p_key text, p_window_seconds integer, p_max integer)
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with attempt as (
    insert into public.auth_attempts as a (key, window_start, count)
    values (p_key, now(), 1)
    on conflict (key) do update
      set window_start = case
            when a.window_start <= now() - make_interval(secs => p_window_seconds) then now()
            else a.window_start end,
          count = case
            when a.window_start <= now() - make_interval(secs => p_window_seconds) then 1
            else a.count + 1 end
      where a.window_start <= now() - make_interval(secs => p_window_seconds)
         or a.count < p_max
    returning 1
  )
  select case
    when exists (select 1 from attempt) then 0
    else greatest(
      1,
      ceil(extract(epoch from (
        (select s.window_start from public.auth_attempts s where s.key = p_key)
        + make_interval(secs => p_window_seconds) - now()
      )))::integer
    )
  end;
$$;

revoke all on function public.bump_attempts(text, integer, integer) from public, anon, authenticated;
grant execute on function public.bump_attempts(text, integer, integer) to service_role;

-- 4. Profiles.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  first_name text check (char_length(first_name) between 1 and 60),
  last_name text check (char_length(last_name) between 1 and 60),
  role text check (role in (
    'retail_investor', 'institutional_investor', 'researcher_analyst', 'financial_adviser', 'other'
  )),
  experience text check (experience in ('beginner', 'intermediate', 'experienced')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated;
grant select, insert, update on table public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 5. Watchlist.
create table public.watchlist_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  ticker text not null check (ticker ~ '^[A-Z.]{1,6}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, ticker)
);

alter table public.watchlist_items enable row level security;
revoke all on table public.watchlist_items from public, anon, authenticated;
grant select, insert, delete on table public.watchlist_items to authenticated;

create policy watchlist_select_own on public.watchlist_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy watchlist_insert_own on public.watchlist_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy watchlist_delete_own on public.watchlist_items
  for delete to authenticated using (user_id = (select auth.uid()));

create function public.cap_watchlist()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select count(*) from public.watchlist_items w where w.user_id = new.user_id) >= 50 then
    raise exception 'watchlist is limited to 50 companies';
  end if;
  return new;
end;
$$;

create trigger cap_watchlist
  before insert on public.watchlist_items
  for each row execute function public.cap_watchlist();

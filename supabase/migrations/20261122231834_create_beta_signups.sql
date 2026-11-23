create table public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  created_at timestamptz not null default now(),
  source text
);

create unique index beta_signups_email_lower_key
  on public.beta_signups (lower(email));

alter table public.beta_signups enable row level security;

revoke all on public.beta_signups from public, anon, authenticated;

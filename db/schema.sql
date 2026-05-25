create extension if not exists pgcrypto;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  title text not null check (char_length(title) between 6 and 90),
  source text not null,
  description text not null check (char_length(description) between 40 and 12000),
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'failed')),
  severity text not null default 'low' check (severity in ('low', 'medium', 'high', 'critical')),
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  stage text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists incidents_user_created_idx on public.incidents (clerk_user_id, created_at desc);
create index if not exists agent_runs_incident_idx on public.agent_runs (incident_id, created_at asc);

create table if not exists public.connector_configs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  connector_id text not null,
  name text not null,
  category text not null,
  description text not null,
  connected boolean not null default false,
  token_configured boolean not null default false,
  webhook_url text,
  updated_at timestamptz not null default now(),
  unique (clerk_user_id, connector_id)
);

create table if not exists public.user_settings (
  clerk_user_id text primary key,
  full_name text not null,
  email text not null,
  company text not null,
  role text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  clerk_user_id text primary key,
  critical boolean not null default true,
  high boolean not null default true,
  digest boolean not null default false,
  remediation boolean not null default true,
  connectors boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  clerk_user_id text primary key,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  renews_at timestamptz,
  usage jsonb not null default '{"analyses":0,"apiCalls":0}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  name text not null,
  email text not null,
  role text not null check (role in ('Owner', 'Admin', 'Member')),
  initials text not null,
  active boolean not null default false,
  invited_at timestamptz not null default now()
);

create index if not exists connector_configs_user_idx on public.connector_configs (clerk_user_id);
create index if not exists team_members_user_idx on public.team_members (clerk_user_id, invited_at asc);

alter table public.incidents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.connector_configs enable row level security;
alter table public.user_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.subscriptions enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "Users can read their incidents" on public.incidents;
create policy "Users can read their incidents"
  on public.incidents for select
  using (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Users can create their incidents" on public.incidents;
create policy "Users can create their incidents"
  on public.incidents for insert
  with check (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Users can read runs for their incidents" on public.agent_runs;
create policy "Users can read runs for their incidents"
  on public.agent_runs for select
  using (
    exists (
      select 1
      from public.incidents
      where incidents.id = agent_runs.incident_id
        and incidents.clerk_user_id = auth.jwt() ->> 'sub'
    )
  );

drop policy if exists "Users can manage their connector configs" on public.connector_configs;
create policy "Users can manage their connector configs"
  on public.connector_configs for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Users can manage their settings" on public.user_settings;
create policy "Users can manage their settings"
  on public.user_settings for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Users can manage their notification preferences" on public.notification_preferences;
create policy "Users can manage their notification preferences"
  on public.notification_preferences for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Users can manage their subscription state" on public.subscriptions;
create policy "Users can manage their subscription state"
  on public.subscriptions for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

drop policy if exists "Users can manage their team members" on public.team_members;
create policy "Users can manage their team members"
  on public.team_members for all
  using (clerk_user_id = auth.jwt() ->> 'sub')
  with check (clerk_user_id = auth.jwt() ->> 'sub');

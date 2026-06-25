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

create table if not exists public.incident_chat_messages (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  incident_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  provider text,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists incidents_user_created_idx on public.incidents (clerk_user_id, created_at desc);
create index if not exists agent_runs_incident_idx on public.agent_runs (incident_id, created_at asc);
create index if not exists incident_chat_messages_incident_idx on public.incident_chat_messages (clerk_user_id, incident_id, created_at asc);

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

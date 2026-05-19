create extension if not exists pgcrypto;

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  title text not null check (char_length(title) between 6 and 90),
  source text not null,
  description text not null check (char_length(description) between 40 and 12000),
  status text not null default 'draft' check (status in ('draft', 'running', 'completed', 'failed')),
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

alter table public.incidents enable row level security;
alter table public.agent_runs enable row level security;

create policy "Users can read their incidents"
  on public.incidents for select
  using (clerk_user_id = auth.jwt() ->> 'sub');

create policy "Users can create their incidents"
  on public.incidents for insert
  with check (clerk_user_id = auth.jwt() ->> 'sub');

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

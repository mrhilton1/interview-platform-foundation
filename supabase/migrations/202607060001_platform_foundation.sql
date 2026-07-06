create schema if not exists platform;
create extension if not exists pgcrypto with schema extensions;

create type platform.member_role as enum ('owner', 'admin', 'consultant', 'participant', 'viewer');
create type platform.capability_kind as enum ('program', 'agent', 'deliverable', 'feature', 'limit');
create type platform.grant_source as enum ('sku', 'trial', 'addon', 'manual_grant', 'internal');
create type platform.program_status as enum ('draft', 'active', 'locked', 'archived');
create type platform.session_status as enum ('scheduled', 'in_progress', 'complete', 'canceled');
create type platform.message_role as enum ('agent', 'participant', 'system');

create table platform.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platform.editions (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  name text not null,
  positioning text not null default '',
  manifest jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platform.skus (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  edition_id uuid references platform.editions(id) on delete set null,
  name text not null,
  billing_lookup_key text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table platform.capabilities (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  kind platform.capability_kind not null,
  name text not null,
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table platform.sku_entitlements (
  id uuid primary key default extensions.gen_random_uuid(),
  sku_id uuid not null references platform.skus(id) on delete cascade,
  capability_id uuid not null references platform.capabilities(id) on delete cascade,
  enabled boolean not null default true,
  limit_value integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (sku_id, capability_id)
);

create table platform.workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  edition_id uuid references platform.editions(id) on delete set null,
  sku_id uuid references platform.skus(id) on delete set null,
  owner_user_id uuid not null references platform.profiles(id) on delete restrict,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platform.workspace_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references platform.workspaces(id) on delete cascade,
  user_id uuid not null references platform.profiles(id) on delete cascade,
  role platform.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table platform.workspace_entitlement_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references platform.workspaces(id) on delete cascade,
  capability_id uuid not null references platform.capabilities(id) on delete cascade,
  source platform.grant_source not null,
  enabled boolean not null default true,
  limit_value integer,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, capability_id, source)
);

create table platform.workspace_programs (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references platform.workspaces(id) on delete cascade,
  base_edition_id uuid references platform.editions(id) on delete set null,
  program_key text not null,
  name text not null,
  status platform.program_status not null default 'draft',
  label_overrides jsonb not null default '{}'::jsonb,
  manifest_overrides jsonb not null default '{}'::jsonb,
  created_by uuid references platform.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, program_key)
);

create table platform.program_agents (
  program_id uuid not null references platform.workspace_programs(id) on delete cascade,
  capability_id uuid not null references platform.capabilities(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  primary key (program_id, capability_id)
);

create table platform.participants (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references platform.workspaces(id) on delete cascade,
  program_id uuid references platform.workspace_programs(id) on delete set null,
  display_name text not null,
  email text,
  role_label text not null default 'Participant',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table platform.interview_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references platform.workspaces(id) on delete cascade,
  program_id uuid not null references platform.workspace_programs(id) on delete cascade,
  participant_id uuid references platform.participants(id) on delete set null,
  track_key text not null,
  status platform.session_status not null default 'scheduled',
  title text not null,
  summary text,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platform.interview_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references platform.interview_sessions(id) on delete cascade,
  role platform.message_role not null,
  content text not null,
  sequence integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);

create table platform.artifacts (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references platform.workspaces(id) on delete cascade,
  program_id uuid references platform.workspace_programs(id) on delete cascade,
  session_id uuid references platform.interview_sessions(id) on delete set null,
  artifact_type text not null,
  title text not null,
  body text not null default '',
  tags text[] not null default '{}',
  evidence jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platform.deliverables (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid not null references platform.workspaces(id) on delete cascade,
  program_id uuid references platform.workspace_programs(id) on delete set null,
  deliverable_type text not null,
  title text not null,
  body text not null default '',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table platform.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  workspace_id uuid references platform.workspaces(id) on delete cascade,
  actor_user_id uuid references platform.profiles(id) on delete set null,
  event_type text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index on platform.workspace_memberships (user_id, workspace_id);
create index on platform.workspace_entitlement_grants (workspace_id, capability_id);
create index on platform.workspace_programs (workspace_id, status);
create index on platform.participants (workspace_id, program_id);
create index on platform.interview_sessions (workspace_id, program_id, status);
create index on platform.interview_messages (session_id, sequence);
create index on platform.artifacts (workspace_id, program_id);
create index on platform.deliverables (workspace_id, program_id);

create or replace function platform.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = platform, public
stable
as $$
  select exists (
    select 1
    from platform.workspace_memberships wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function platform.has_workspace_role(
  target_workspace_id uuid,
  allowed_roles platform.member_role[]
)
returns boolean
language sql
security definer
set search_path = platform, public
stable
as $$
  select exists (
    select 1
    from platform.workspace_memberships wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role = any(allowed_roles)
  );
$$;

create or replace function platform.workspace_has_capability(
  target_workspace_id uuid,
  capability_key text
)
returns boolean
language sql
security definer
set search_path = platform, public
stable
as $$
  select exists (
    select 1
    from platform.workspace_entitlement_grants weg
    join platform.capabilities c on c.id = weg.capability_id
    where weg.workspace_id = target_workspace_id
      and c.key = capability_key
      and weg.enabled = true
      and (weg.expires_at is null or weg.expires_at > now())
  )
  or exists (
    select 1
    from platform.workspaces w
    join platform.sku_entitlements se on se.sku_id = w.sku_id
    join platform.capabilities c on c.id = se.capability_id
    where w.id = target_workspace_id
      and c.key = capability_key
      and se.enabled = true
  );
$$;

alter table platform.profiles enable row level security;
alter table platform.editions enable row level security;
alter table platform.skus enable row level security;
alter table platform.capabilities enable row level security;
alter table platform.sku_entitlements enable row level security;
alter table platform.workspaces enable row level security;
alter table platform.workspace_memberships enable row level security;
alter table platform.workspace_entitlement_grants enable row level security;
alter table platform.workspace_programs enable row level security;
alter table platform.program_agents enable row level security;
alter table platform.participants enable row level security;
alter table platform.interview_sessions enable row level security;
alter table platform.interview_messages enable row level security;
alter table platform.artifacts enable row level security;
alter table platform.deliverables enable row level security;
alter table platform.audit_events enable row level security;

create policy "profiles are readable by the owner"
on platform.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles are updateable by the owner"
on platform.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "published editions are readable"
on platform.editions for select
to authenticated
using (is_published = true);

create policy "active skus are readable"
on platform.skus for select
to authenticated
using (is_active = true);

create policy "capabilities are readable"
on platform.capabilities for select
to authenticated
using (true);

create policy "sku entitlements are readable"
on platform.sku_entitlements for select
to authenticated
using (true);

create policy "workspace members can read workspaces"
on platform.workspaces for select
to authenticated
using (platform.is_workspace_member(id));

create policy "workspace admins can update workspaces"
on platform.workspaces for update
to authenticated
using (platform.has_workspace_role(id, array['owner', 'admin']::platform.member_role[]))
with check (platform.has_workspace_role(id, array['owner', 'admin']::platform.member_role[]));

create policy "workspace members can read memberships"
on platform.workspace_memberships for select
to authenticated
using (platform.is_workspace_member(workspace_id));

create policy "workspace owners can manage memberships"
on platform.workspace_memberships for all
to authenticated
using (platform.has_workspace_role(workspace_id, array['owner', 'admin']::platform.member_role[]))
with check (platform.has_workspace_role(workspace_id, array['owner', 'admin']::platform.member_role[]));

create policy "workspace admins can read entitlement grants"
on platform.workspace_entitlement_grants for select
to authenticated
using (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]));

create policy "workspace members can read programs"
on platform.workspace_programs for select
to authenticated
using (platform.is_workspace_member(workspace_id));

create policy "workspace admins can manage programs"
on platform.workspace_programs for all
to authenticated
using (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]))
with check (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]));

create policy "workspace members can read program agents"
on platform.program_agents for select
to authenticated
using (
  exists (
    select 1
    from platform.workspace_programs wp
    where wp.id = program_agents.program_id
      and platform.is_workspace_member(wp.workspace_id)
  )
);

create policy "workspace admins can manage program agents"
on platform.program_agents for all
to authenticated
using (
  exists (
    select 1
    from platform.workspace_programs wp
    where wp.id = program_agents.program_id
      and platform.has_workspace_role(wp.workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[])
  )
)
with check (
  exists (
    select 1
    from platform.workspace_programs wp
    where wp.id = program_agents.program_id
      and platform.has_workspace_role(wp.workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[])
  )
);

create policy "workspace members can read participants"
on platform.participants for select
to authenticated
using (platform.is_workspace_member(workspace_id));

create policy "workspace admins can manage participants"
on platform.participants for all
to authenticated
using (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]))
with check (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]));

create policy "workspace members can read sessions"
on platform.interview_sessions for select
to authenticated
using (platform.is_workspace_member(workspace_id));

create policy "workspace admins can manage sessions"
on platform.interview_sessions for all
to authenticated
using (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]))
with check (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]));

create policy "workspace members can read messages"
on platform.interview_messages for select
to authenticated
using (
  exists (
    select 1
    from platform.interview_sessions s
    where s.id = interview_messages.session_id
      and platform.is_workspace_member(s.workspace_id)
  )
);

create policy "workspace admins can manage messages"
on platform.interview_messages for all
to authenticated
using (
  exists (
    select 1
    from platform.interview_sessions s
    where s.id = interview_messages.session_id
      and platform.has_workspace_role(s.workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[])
  )
)
with check (
  exists (
    select 1
    from platform.interview_sessions s
    where s.id = interview_messages.session_id
      and platform.has_workspace_role(s.workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[])
  )
);

create policy "workspace members can read artifacts"
on platform.artifacts for select
to authenticated
using (platform.is_workspace_member(workspace_id));

create policy "workspace admins can manage artifacts"
on platform.artifacts for all
to authenticated
using (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]))
with check (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]));

create policy "workspace members can read deliverables"
on platform.deliverables for select
to authenticated
using (platform.is_workspace_member(workspace_id));

create policy "workspace admins can manage deliverables"
on platform.deliverables for all
to authenticated
using (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]))
with check (platform.has_workspace_role(workspace_id, array['owner', 'admin', 'consultant']::platform.member_role[]));

create policy "workspace admins can read audit events"
on platform.audit_events for select
to authenticated
using (workspace_id is null or platform.has_workspace_role(workspace_id, array['owner', 'admin']::platform.member_role[]));

grant usage on schema platform to authenticated;
grant select, insert, update, delete on all tables in schema platform to authenticated;
grant usage on all sequences in schema platform to authenticated;

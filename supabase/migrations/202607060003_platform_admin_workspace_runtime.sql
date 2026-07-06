alter table platform.profiles
add column if not exists email text;

update platform.profiles p
set email = u.email,
    display_name = coalesce(p.display_name, split_part(u.email, '@', 1)),
    updated_at = now()
from auth.users u
where u.id = p.id
  and (p.email is null or p.display_name is null);

create table if not exists platform.platform_admins (
  user_id uuid primary key references platform.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table platform.platform_admins enable row level security;

create or replace function platform.is_platform_admin()
returns boolean
language sql
security definer
set search_path = platform, public
stable
as $$
  select exists (
    select 1
    from platform.platform_admins pa
    where pa.user_id = auth.uid()
  );
$$;

create or replace function platform.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = platform, public
as $$
begin
  insert into platform.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set email = coalesce(excluded.email, platform.profiles.email),
      display_name = coalesce(excluded.display_name, platform.profiles.display_name),
      avatar_url = coalesce(excluded.avatar_url, platform.profiles.avatar_url),
      updated_at = now();

  return new;
end;
$$;

create policy "profiles are insertable by the owner"
on platform.profiles for insert
to authenticated
with check (id = auth.uid());

create policy "platform admins can read profiles"
on platform.profiles for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can read platform admins"
on platform.platform_admins for select
to authenticated
using (platform.is_platform_admin() or user_id = auth.uid());

create policy "users can create owned workspaces"
on platform.workspaces for insert
to authenticated
with check (owner_user_id = auth.uid());

create policy "platform admins can read all workspaces"
on platform.workspaces for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can manage all workspaces"
on platform.workspaces for all
to authenticated
using (platform.is_platform_admin())
with check (platform.is_platform_admin());

create policy "owners can bootstrap their owner membership"
on platform.workspace_memberships for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1
    from platform.workspaces w
    where w.id = workspace_memberships.workspace_id
      and w.owner_user_id = auth.uid()
  )
);

create policy "platform admins can read all memberships"
on platform.workspace_memberships for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can manage all memberships"
on platform.workspace_memberships for all
to authenticated
using (platform.is_platform_admin())
with check (platform.is_platform_admin());

create policy "platform admins can read all programs"
on platform.workspace_programs for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can manage all programs"
on platform.workspace_programs for all
to authenticated
using (platform.is_platform_admin())
with check (platform.is_platform_admin());

create policy "platform admins can read all participants"
on platform.participants for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can read all sessions"
on platform.interview_sessions for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can read all artifacts"
on platform.artifacts for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can read all deliverables"
on platform.deliverables for select
to authenticated
using (platform.is_platform_admin());

create policy "platform admins can read all entitlement grants"
on platform.workspace_entitlement_grants for select
to authenticated
using (platform.is_platform_admin());

grant select, insert, update, delete on platform.platform_admins to authenticated;

create or replace function public.platform_get_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = platform, public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  is_admin boolean;
  platform_workspace_ids uuid[];
  member_workspace_ids uuid[];
  visible_workspace_ids uuid[];
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select u.email
  into current_email
  from auth.users u
  where u.id = current_user_id;

  if current_email is distinct from 'mikehilton.work@gmail.com' then
    raise exception 'This platform is currently limited to mikehilton.work@gmail.com.' using errcode = '42501';
  end if;

  insert into platform.profiles (id, email, display_name)
  values (current_user_id, current_email, split_part(current_email, '@', 1))
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(platform.profiles.display_name, excluded.display_name),
      updated_at = now();

  is_admin := platform.is_platform_admin();

  select coalesce(array_agg(w.id order by w.created_at desc), array[]::uuid[])
  into platform_workspace_ids
  from platform.workspaces w
  where is_admin;

  select coalesce(array_agg(wm.workspace_id), array[]::uuid[])
  into member_workspace_ids
  from platform.workspace_memberships wm
  where wm.user_id = current_user_id;

  visible_workspace_ids := array(
    select distinct unnest(platform_workspace_ids || member_workspace_ids)
  );

  return jsonb_build_object(
    'editions', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.name)
      from (
        select id, key, name, positioning, manifest
        from platform.editions
        where is_published
        order by name
      ) e
    ), '[]'::jsonb),
    'skus', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.name)
      from (
        select id, key, name, edition_id
        from platform.skus
        where is_active
        order by name
      ) s
    ), '[]'::jsonb),
    'platformWorkspaces', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.created_at desc)
      from (
        select id, name, edition_id, sku_id, owner_user_id, created_at, settings
        from platform.workspaces
        where id = any(platform_workspace_ids)
        order by created_at desc
      ) w
    ), '[]'::jsonb),
    'myWorkspaces', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.created_at desc)
      from (
        select id, name, edition_id, sku_id, owner_user_id, created_at, settings
        from platform.workspaces
        where id = any(member_workspace_ids)
        order by created_at desc
      ) w
    ), '[]'::jsonb),
    'profiles', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.email nulls last)
      from (
        select distinct p.id, p.email, p.display_name
        from platform.profiles p
        join platform.workspaces w on w.owner_user_id = p.id
        where w.id = any(visible_workspace_ids)
      ) p
    ), '[]'::jsonb),
    'programs', coalesce((
      select jsonb_agg(to_jsonb(wp) order by wp.created_at)
      from (
        select id, workspace_id, program_key, name, status, label_overrides, manifest_overrides, created_at
        from platform.workspace_programs
        where workspace_id = any(visible_workspace_ids)
        order by created_at
      ) wp
    ), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(to_jsonb(pt) order by pt.created_at desc)
      from (
        select id, workspace_id, program_id, display_name, email, role_label, created_at
        from platform.participants
        where workspace_id = any(visible_workspace_ids)
        order by created_at desc
      ) pt
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.created_at desc)
      from (
        select id, workspace_id, program_id, participant_id, track_key, status, title, metadata, created_at, completed_at
        from platform.interview_sessions
        where workspace_id = any(visible_workspace_ids)
        order by created_at desc
      ) s
    ), '[]'::jsonb),
    'artifacts', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from (
        select id, workspace_id, program_id, session_id, artifact_type, title, body, created_at
        from platform.artifacts
        where workspace_id = any(visible_workspace_ids)
        order by created_at desc
      ) a
    ), '[]'::jsonb),
    'isPlatformAdmin', is_admin
  );
end;
$$;

create or replace function public.platform_create_workspace(
  workspace_name text,
  edition_key text default 'consultant-os'
)
returns jsonb
language plpgsql
security definer
set search_path = platform, public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  selected_edition platform.editions%rowtype;
  selected_sku platform.skus%rowtype;
  created_workspace platform.workspaces%rowtype;
  programs jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select u.email
  into current_email
  from auth.users u
  where u.id = current_user_id;

  if current_email is distinct from 'mikehilton.work@gmail.com' then
    raise exception 'This platform is currently limited to mikehilton.work@gmail.com.' using errcode = '42501';
  end if;

  if nullif(trim(workspace_name), '') is null then
    raise exception 'Workspace name is required.' using errcode = '22023';
  end if;

  insert into platform.profiles (id, email, display_name)
  values (current_user_id, current_email, split_part(current_email, '@', 1))
  on conflict (id) do update
  set email = excluded.email,
      display_name = coalesce(platform.profiles.display_name, excluded.display_name),
      updated_at = now();

  select *
  into selected_edition
  from platform.editions e
  where e.key = edition_key
    and e.is_published;

  if selected_edition.id is null then
    raise exception 'Edition not found.' using errcode = '22023';
  end if;

  select *
  into selected_sku
  from platform.skus s
  where s.key = case when edition_key = 'legacy-weaver' then 'legacy-family-basic' else 'consultant-pro' end
    and s.is_active;

  if selected_sku.id is null then
    raise exception 'SKU not found.' using errcode = '22023';
  end if;

  insert into platform.workspaces (name, edition_id, sku_id, owner_user_id, settings)
  values (
    trim(workspace_name),
    selected_edition.id,
    selected_sku.id,
    current_user_id,
    jsonb_build_object('provisioned_from', 'demo-ui')
  )
  returning * into created_workspace;

  insert into platform.workspace_memberships (workspace_id, user_id, role)
  values (created_workspace.id, current_user_id, 'owner')
  on conflict do nothing;

  programs := case edition_key
    when 'legacy-weaver' then
      '[{"key":"legacy-weaver","name":"Family Story Archive","labels":{}}]'::jsonb
    else
      '[
        {"key":"ai-readiness","name":"Executive AI Readiness","labels":{}},
        {"key":"sales-discovery","name":"Sales Discovery","labels":{"participant":"Sales Leader","artifact":"Buying Signal","deliverable":"Sales Enablement Brief"}},
        {"key":"customer-success-discovery","name":"Customer Success Discovery","labels":{"participant":"Customer Success Lead","artifact":"Retention Signal","deliverable":"Success Playbook"}}
      ]'::jsonb
  end;

  insert into platform.workspace_programs (
    workspace_id,
    base_edition_id,
    program_key,
    name,
    status,
    label_overrides,
    manifest_overrides,
    created_by
  )
  select
    created_workspace.id,
    selected_edition.id,
    program.key,
    program.name,
    'active',
    program.labels,
    '{}'::jsonb,
    current_user_id
  from jsonb_to_recordset(programs) as program(key text, name text, labels jsonb);

  return to_jsonb(created_workspace);
end;
$$;

revoke all on function public.platform_get_dashboard() from public;
revoke all on function public.platform_create_workspace(text, text) from public;

grant execute on function public.platform_get_dashboard() to authenticated;
grant execute on function public.platform_create_workspace(text, text) to authenticated;

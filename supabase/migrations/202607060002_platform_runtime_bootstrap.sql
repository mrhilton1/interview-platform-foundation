create or replace function platform.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = platform, public
as $$
begin
  insert into platform.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set display_name = coalesce(excluded.display_name, platform.profiles.display_name),
      avatar_url = coalesce(excluded.avatar_url, platform.profiles.avatar_url),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_platform_profile on auth.users;

create trigger on_auth_user_created_platform_profile
after insert on auth.users
for each row execute function platform.handle_new_user();

insert into platform.skus (key, edition_id, name, billing_lookup_key, is_active)
select 'legacy-family-basic', e.id, 'Legacy Family Basic', 'legacy-family-basic', true
from platform.editions e
where e.key = 'legacy-weaver'
on conflict (key) do update
set edition_id = excluded.edition_id,
    name = excluded.name,
    billing_lookup_key = excluded.billing_lookup_key,
    is_active = excluded.is_active;

insert into platform.skus (key, edition_id, name, billing_lookup_key, is_active)
select 'consultant-pro', e.id, 'Consultant Pro', 'consultant-pro', true
from platform.editions e
where e.key = 'consultant-os'
on conflict (key) do update
set edition_id = excluded.edition_id,
    name = excluded.name,
    billing_lookup_key = excluded.billing_lookup_key,
    is_active = excluded.is_active;

insert into platform.sku_entitlements (sku_id, capability_id, enabled, limit_value)
select s.id, c.id, true,
  case c.key
    when 'limit.max-programs.1' then 1
    else null
  end
from platform.skus s
join platform.capabilities c on c.key in (
  'program.legacy-weaver',
  'agent.biographer',
  'deliverable.legacy-book',
  'feature.custom-labels',
  'limit.max-programs.1'
)
where s.key = 'legacy-family-basic'
on conflict (sku_id, capability_id) do update
set enabled = excluded.enabled,
    limit_value = excluded.limit_value;

insert into platform.sku_entitlements (sku_id, capability_id, enabled, limit_value)
select s.id, c.id, true,
  case c.key
    when 'limit.max-programs.25' then 25
    else null
  end
from platform.skus s
join platform.capabilities c on c.key in (
  'program.ai-readiness',
  'program.sales-discovery',
  'program.customer-success-discovery',
  'program.support-workflow-audit',
  'program.product-discovery',
  'agent.stakeholder-interviewer',
  'agent.report-synthesizer',
  'deliverable.ai-readiness-roadmap',
  'deliverable.workflow-playbook',
  'feature.custom-labels',
  'feature.clone-programs',
  'feature.cross-program-synthesis',
  'limit.max-programs.25'
)
where s.key = 'consultant-pro'
on conflict (sku_id, capability_id) do update
set enabled = excluded.enabled,
    limit_value = excluded.limit_value;

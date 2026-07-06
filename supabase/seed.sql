insert into platform.editions (key, name, positioning, manifest, is_published)
values
  (
    'legacy-weaver',
    'Legacy Weaver',
    'Guided family interviews that preserve personal stories as memories and books.',
    '{"labels":{"workspace":"Family Archive","program":"Story Program","participant":"Relative","artifact":"Memory","deliverable":"Legacy Book"}}',
    true
  ),
  (
    'consultant-os',
    'Consultant Interview OS',
    'Multi-program stakeholder interviews for AI readiness, documentation, and transformation consulting.',
    '{"labels":{"workspace":"Client Workspace","program":"Program","participant":"Stakeholder","artifact":"Insight","deliverable":"Client Deliverable"}}',
    true
  )
on conflict (key) do update
set name = excluded.name,
    positioning = excluded.positioning,
    manifest = excluded.manifest,
    is_published = excluded.is_published;

insert into platform.capabilities (key, kind, name, description)
values
  ('program.legacy-weaver', 'program', 'Legacy Weaver', 'Family story interview program'),
  ('program.ai-readiness', 'program', 'AI Readiness', 'Executive and team AI readiness program'),
  ('program.sales-discovery', 'program', 'Sales Discovery', 'Sales discovery interview program'),
  ('program.customer-success-discovery', 'program', 'Customer Success Discovery', 'Customer success interview program'),
  ('program.support-workflow-audit', 'program', 'Support Workflow Audit', 'Support process discovery program'),
  ('program.product-discovery', 'program', 'Product Discovery', 'Product stakeholder interview program'),
  ('agent.biographer', 'agent', 'Biographer', 'Family-memory interviewer'),
  ('agent.stakeholder-interviewer', 'agent', 'Stakeholder Interviewer', 'Business stakeholder interviewer'),
  ('agent.report-synthesizer', 'agent', 'Report Synthesizer', 'Transcript-to-deliverable synthesis agent'),
  ('deliverable.legacy-book', 'deliverable', 'Legacy Book', 'Family story book'),
  ('deliverable.ai-readiness-roadmap', 'deliverable', 'AI Readiness Roadmap', 'Consulting roadmap deliverable'),
  ('deliverable.workflow-playbook', 'deliverable', 'Workflow Playbook', 'Workflow documentation deliverable'),
  ('feature.custom-labels', 'feature', 'Custom Labels', 'Rename primitives by program or edition'),
  ('feature.clone-programs', 'feature', 'Clone Programs', 'Clone and customize a program from a base skin'),
  ('feature.cross-program-synthesis', 'feature', 'Cross-program Synthesis', 'Synthesize insights across programs in a workspace'),
  ('limit.max-programs.1', 'limit', 'One Program Limit', 'Limits workspace to one program'),
  ('limit.max-programs.25', 'limit', 'Twenty-five Program Limit', 'Limits workspace to twenty-five programs')
on conflict (key) do update
set kind = excluded.kind,
    name = excluded.name,
    description = excluded.description;

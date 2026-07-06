import { EditionManifest, WorkspaceProgram } from './types';

export function labelFor(
  edition: EditionManifest,
  program: WorkspaceProgram | null,
  key: string
): string {
  return program?.labelOverrides[key] ?? edition.labels[key] ?? key;
}

export function cloneProgramFromEdition(
  workspaceId: string,
  edition: EditionManifest,
  programKey: string,
  overrides: Partial<Pick<WorkspaceProgram, 'name' | 'labelOverrides'>> = {}
): WorkspaceProgram {
  return {
    id: `${workspaceId}-${programKey}`,
    workspaceId,
    baseEditionKey: edition.key,
    programKey,
    name: overrides.name ?? edition.name,
    status: 'active',
    labelOverrides: overrides.labelOverrides ?? {},
    enabledAgentIds: edition.agents.map((agent) => agent.id),
    enabledDeliverableIds: edition.deliverables.map((deliverable) => deliverable.id)
  };
}

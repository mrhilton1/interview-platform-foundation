import { createSkuGrants } from '../domain/entitlements';
import { cloneProgramFromEdition } from '../domain/manifest';
import { EntitlementGrant, Participant, Workspace } from '../domain/types';
import { editionManifests } from './editionManifests';

const consultantEdition = editionManifests.find((edition) => edition.key === 'consultant-os')!;

export const demoWorkspace: Workspace = {
  id: 'workspace-acme',
  name: 'Acme Corp AI Transformation',
  editionKey: 'consultant-os',
  sku: 'consultant-pro',
  ownerUserId: 'user-platform-owner'
};

export const demoEntitlements: EntitlementGrant[] = [
  ...createSkuGrants(demoWorkspace.id, consultantEdition.includedCapabilities),
  {
    id: 'workspace-acme-program-legal-discovery',
    workspaceId: demoWorkspace.id,
    capability: 'program.legal-discovery',
    kind: 'program',
    source: 'addon',
    enabled: false
  }
];

export const demoPrograms = [
  cloneProgramFromEdition(demoWorkspace.id, consultantEdition, 'ai-readiness', {
    name: 'Executive AI Readiness'
  }),
  cloneProgramFromEdition(demoWorkspace.id, consultantEdition, 'sales-discovery', {
    name: 'Sales Discovery',
    labelOverrides: {
      participant: 'Sales Leader',
      artifact: 'Buying Signal',
      artifactVault: 'Opportunity Library',
      deliverable: 'Sales Enablement Brief'
    }
  }),
  cloneProgramFromEdition(demoWorkspace.id, consultantEdition, 'customer-success-discovery', {
    name: 'Customer Success Discovery',
    labelOverrides: {
      participant: 'Customer Success Lead',
      artifact: 'Retention Signal',
      artifactVault: 'Customer Insight Vault',
      deliverable: 'Success Playbook'
    }
  })
];

export const demoParticipants: Participant[] = [
  {
    id: 'participant-1',
    workspaceId: demoWorkspace.id,
    programId: demoPrograms[0].id,
    displayName: 'Maya Chen',
    email: 'maya@example.com',
    roleLabel: 'COO'
  },
  {
    id: 'participant-2',
    workspaceId: demoWorkspace.id,
    programId: demoPrograms[1].id,
    displayName: 'Andre Singh',
    email: 'andre@example.com',
    roleLabel: 'VP Sales'
  },
  {
    id: 'participant-3',
    workspaceId: demoWorkspace.id,
    programId: demoPrograms[2].id,
    displayName: 'Elena Ruiz',
    email: 'elena@example.com',
    roleLabel: 'Head of CS'
  }
];

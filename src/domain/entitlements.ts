import { EntitlementGrant } from './types';

export function hasCapability(grants: EntitlementGrant[], capability: string): boolean {
  return grants.some((grant) => grant.capability === capability && grant.enabled);
}

export function getLimit(grants: EntitlementGrant[], capability: string): number | null {
  const grant = grants.find((item) => item.capability === capability && item.enabled);
  return grant?.limitValue ?? null;
}

export function explainCapability(grants: EntitlementGrant[], capability: string): string {
  const grant = grants.find((item) => item.capability === capability);
  if (!grant) return 'Not included in this SKU';
  if (!grant.enabled) return `Disabled by ${grant.source}`;
  return `Enabled by ${grant.source}`;
}

export function createSkuGrants(
  workspaceId: string,
  capabilities: string[]
): EntitlementGrant[] {
  return capabilities.map((capability) => {
    const [kind] = capability.split('.');

    return {
      id: `${workspaceId}-${capability}`,
      workspaceId,
      capability,
      kind: kind as EntitlementGrant['kind'],
      source: 'sku',
      enabled: true
    };
  });
}

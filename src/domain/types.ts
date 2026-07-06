export type ID = string;

export type CapabilityKind =
  | 'program'
  | 'agent'
  | 'deliverable'
  | 'feature'
  | 'limit';

export type GrantSource = 'sku' | 'trial' | 'addon' | 'manual_grant' | 'internal';

export type RoleKey = 'owner' | 'admin' | 'consultant' | 'participant' | 'viewer';

export interface BrandingConfig {
  accent: string;
  accentSoft: string;
  ink: string;
  surface: string;
  logoMark: string;
}

export interface NavigationItem {
  key: string;
  labelKey: string;
}

export interface InterviewQuestion {
  id: ID;
  text: string;
  tags: string[];
}

export interface InterviewTrack {
  id: ID;
  title: string;
  description: string;
  participantRole: string;
  questionSet: InterviewQuestion[];
}

export interface AgentManifest {
  id: ID;
  name: string;
  purpose: string;
  systemPrompt: string;
  defaultTone: string;
}

export interface DeliverableManifest {
  id: ID;
  name: string;
  description: string;
  outputFormat: 'brief' | 'report' | 'playbook' | 'book' | 'sop' | 'roadmap';
}

export interface EditionManifest {
  key: string;
  name: string;
  sku: string;
  positioning: string;
  labels: Record<string, string>;
  branding: BrandingConfig;
  navigation: NavigationItem[];
  interviewTracks: InterviewTrack[];
  agents: AgentManifest[];
  deliverables: DeliverableManifest[];
  includedCapabilities: string[];
}

export interface EntitlementGrant {
  id: ID;
  workspaceId: ID;
  capability: string;
  kind: CapabilityKind;
  source: GrantSource;
  enabled: boolean;
  limitValue?: number;
  expiresAt?: string;
}

export interface Workspace {
  id: ID;
  name: string;
  editionKey: string;
  sku: string;
  ownerUserId: ID;
}

export interface WorkspaceProgram {
  id: ID;
  workspaceId: ID;
  baseEditionKey: string;
  programKey: string;
  name: string;
  status: 'active' | 'draft' | 'locked';
  labelOverrides: Record<string, string>;
  enabledAgentIds: ID[];
  enabledDeliverableIds: ID[];
}

export interface Participant {
  id: ID;
  workspaceId: ID;
  programId: ID;
  displayName: string;
  email: string;
  roleLabel: string;
}

export interface InterviewSession {
  id: ID;
  workspaceId: ID;
  programId: ID;
  participantId: ID;
  trackId: ID;
  status: 'scheduled' | 'in_progress' | 'complete';
  startedAt?: string;
  completedAt?: string;
}

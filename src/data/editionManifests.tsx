import { EditionManifest } from '../domain/types';

export const editionManifests: EditionManifest[] = [
  {
    key: 'legacy-weaver',
    name: 'Legacy Weaver',
    sku: 'legacy-family-basic',
    positioning: 'Guided family interviews that preserve personal stories as memories and books.',
    labels: {
      workspace: 'Family Archive',
      program: 'Story Program',
      participant: 'Relative',
      track: 'Life Chapter',
      session: 'Interview',
      artifact: 'Memory',
      artifactVault: 'Memory Vault',
      deliverable: 'Legacy Book',
      agent: 'Biographer',
      invitation: 'Gift Interview'
    },
    branding: {
      accent: '#9a6b3f',
      accentSoft: '#f4eadf',
      ink: '#2d241d',
      surface: '#fffaf4',
      logoMark: 'LW'
    },
    navigation: [
      { key: 'programs', labelKey: 'program' },
      { key: 'vault', labelKey: 'artifactVault' },
      { key: 'deliverables', labelKey: 'deliverable' }
    ],
    interviewTracks: [
      {
        id: 'early-years',
        title: 'Early Years',
        description: 'Childhood memories, family roots, and formative moments.',
        participantRole: 'Relative',
        questionSet: [
          { id: 'q1', text: 'What was the first home you remember?', tags: ['origin'] },
          { id: 'q2', text: 'Who shaped you most when you were young?', tags: ['family'] }
        ]
      }
    ],
    agents: [
      {
        id: 'biographer',
        name: 'Biographer',
        purpose: 'Warmly interviews a family member and preserves their voice.',
        defaultTone: 'warm, patient, curious',
        systemPrompt: 'You are a warm professional biographer helping preserve a family story.'
      }
    ],
    deliverables: [
      {
        id: 'legacy-book',
        name: 'Legacy Book',
        description: 'A narrative book compiled from interviews and memories.',
        outputFormat: 'book'
      }
    ],
    includedCapabilities: [
      'program.legacy-weaver',
      'agent.biographer',
      'deliverable.legacy-book',
      'feature.custom-labels',
      'limit.max-programs.1'
    ]
  },
  {
    key: 'consultant-os',
    name: 'Consultant Interview OS',
    sku: 'consultant-pro',
    positioning: 'Multi-program stakeholder interviews for AI readiness, documentation, and transformation consulting.',
    labels: {
      workspace: 'Client Workspace',
      program: 'Program',
      participant: 'Stakeholder',
      track: 'Interview Track',
      session: 'Stakeholder Interview',
      artifact: 'Insight',
      artifactVault: 'Insight Vault',
      deliverable: 'Client Deliverable',
      agent: 'Agent',
      invitation: 'Stakeholder Invite'
    },
    branding: {
      accent: '#1f7a68',
      accentSoft: '#e2f3ee',
      ink: '#17211f',
      surface: '#f8fbfa',
      logoMark: 'IO'
    },
    navigation: [
      { key: 'programs', labelKey: 'program' },
      { key: 'interviews', labelKey: 'session' },
      { key: 'vault', labelKey: 'artifactVault' },
      { key: 'deliverables', labelKey: 'deliverable' }
    ],
    interviewTracks: [
      {
        id: 'executive-readiness',
        title: 'Executive AI Readiness',
        description: 'Leadership goals, risk posture, mandate clarity, and investment appetite.',
        participantRole: 'Executive',
        questionSet: [
          { id: 'q1', text: 'Where do you believe AI can create measurable advantage this year?', tags: ['strategy'] },
          { id: 'q2', text: 'Which risks would make an AI initiative fail here?', tags: ['risk'] }
        ]
      },
      {
        id: 'workflow-discovery',
        title: 'Workflow Discovery',
        description: 'Team workflows, handoffs, documentation gaps, and automation candidates.',
        participantRole: 'Department Stakeholder',
        questionSet: [
          { id: 'q3', text: 'Which recurring work still depends on one person knowing what to do?', tags: ['institutional-knowledge'] },
          { id: 'q4', text: 'Where do mistakes or rework most often happen?', tags: ['process'] }
        ]
      }
    ],
    agents: [
      {
        id: 'stakeholder-interviewer',
        name: 'Stakeholder Interviewer',
        purpose: 'Runs role-aware interviews and captures business context.',
        defaultTone: 'consultative, concise, practical',
        systemPrompt: 'You are a senior AI transformation consultant interviewing a business stakeholder.'
      },
      {
        id: 'report-synthesizer',
        name: 'Report Synthesizer',
        purpose: 'Turns transcripts into themes, recommendations, risks, and deliverables.',
        defaultTone: 'executive, evidence-backed, direct',
        systemPrompt: 'You synthesize stakeholder interviews into useful business documentation.'
      }
    ],
    deliverables: [
      {
        id: 'ai-readiness-roadmap',
        name: 'AI Readiness Roadmap',
        description: 'Executive summary, priority opportunities, risks, and implementation sequence.',
        outputFormat: 'roadmap'
      },
      {
        id: 'workflow-playbook',
        name: 'Workflow Playbook',
        description: 'Department workflow inventory, gaps, SOP candidates, and automation ideas.',
        outputFormat: 'playbook'
      }
    ],
    includedCapabilities: [
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
    ]
  }
];

# Architecture

## Product Model

The platform separates the thing being sold from the thing being used.

- `Edition`: global product skin or blueprint.
- `SKU`: commercial package.
- `Entitlements`: access rules created by SKU, add-on, trial, manual grant, or internal access.
- `Workspace`: client/company/family container.
- `Program`: workspace-level installed edition or cloned skin.
- `Agent`: AI behavior available to a program.
- `Deliverable`: generated business or personal output.

This supports both simple products and consultant-led engagements.

Example:

```text
Workspace: Acme Corp AI Transformation
  Program: Executive AI Readiness
  Program: Sales Discovery
  Program: Customer Success Discovery
  Program: Support Workflow Audit
```

Each program can rename labels and tune prompts without forking the application.

## Why Programs Instead Of One Skin Per Workspace

A consultant may need several skins inside one client workspace. Sales, Support, Product, Customer Success, and Leadership all need language that sounds native to them.

The same base program can be cloned:

```text
Base: Sales Discovery
Clone: Customer Success Discovery
  participant = Customer Success Lead
  artifact = Retention Signal
  deliverable = Success Playbook
```

## Entitlements

Entitlements decide what a workspace can activate.

Capability examples:

```text
program.ai-readiness
program.sales-discovery
agent.stakeholder-interviewer
agent.report-synthesizer
deliverable.ai-readiness-roadmap
feature.clone-programs
feature.cross-program-synthesis
limit.max-programs.25
```

This supports:

- Family product with one program.
- Consultant starter with one or two programs.
- Consultant pro with a full arsenal.
- Enterprise with custom agents and white-label options.

## Supabase Schema Isolation

All application tables are created in:

```text
platform
```

No application tables are created in `public`.

The browser can query `platform` directly only if the schema is exposed in Supabase API settings. If you want stronger isolation, keep `platform` private and mediate access through Edge Functions.

## AI Provider Boundary

The current foundation does not hardwire Gemini or OpenAI.

The next layer should define an adapter like:

```ts
interface InterviewProvider {
  startSession(input: StartSessionInput): Promise<SessionHandle>;
  sendUserTurn(input: UserTurnInput): Promise<AgentTurn>;
  summarizeSession(input: TranscriptInput): Promise<Artifact[]>;
  generateDeliverable(input: DeliverableInput): Promise<DeliverableDraft>;
}
```

Legacy Weaver can use a biographer agent. Consultant OS can use stakeholder interviewer and report synthesizer agents. The platform should keep the same session, transcript, artifact, and deliverable primitives.

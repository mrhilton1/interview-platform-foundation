# Interview Platform Foundation

This is a repo-shaped foundation for a configurable interview intelligence platform.

The app is built around stable internal primitives:

- `Edition`: a reusable product/skin blueprint.
- `Program`: a workspace-specific installed or cloned skin.
- `Manifest`: metadata that controls labels, branding, prompts, tracks, agents, and deliverables.
- `Entitlement`: access to a program, agent, deliverable, feature, or limit.
- `Workspace`: a client/company/family container.
- `Artifact`: structured knowledge extracted from interviews.
- `Deliverable`: generated output such as a roadmap, playbook, report, SOP, or book.

The goal is that a platform owner can create new vertical editions without rebuilding the app. Legacy Weaver, AI Readiness, Sales Discovery, Customer Success Discovery, and future verticals all use the same engine.

## Current Demo

The current demo renders a consultant workspace with:

- a `Consultant Interview OS` edition
- three active programs
- custom labels per program
- entitlement checks for available and locked program skins
- reusable interview tracks
- Supabase client configured for the `platform` schema

## Tech Stack

- React
- Vite
- TypeScript
- Supabase client
- Supabase migration under an isolated `platform` schema

## Local Setup

```bash
npm install
npm run dev
```

Create `.env` from `.env.example` once Supabase is connected:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_DEFAULT_EDITION_KEY=consultant-os
```

## Supabase Setup

The migration deliberately does not create application tables in `public`.

It creates:

- schema: `platform`
- core tables: editions, SKUs, capabilities, entitlements, workspaces, memberships, programs, participants, sessions, messages, artifacts, deliverables
- helper functions for workspace membership and capabilities
- RLS policies scoped to workspace membership and roles

Migration:

```text
supabase/migrations/202607060001_platform_foundation.sql
```

Seed:

```text
supabase/seed.sql
```

Important Supabase note:

If the browser app queries tables directly through PostgREST, add `platform` to the project's exposed schemas in Supabase API settings. The tables remain isolated from `public`, but the API must know the schema is allowed. Another option is to keep `platform` unexposed and access it only through Edge Functions.

The app client is already configured for:

```ts
db: {
  schema: 'platform'
}
```

## Cloudflare Pages Setup

You do not need to set up Cloudflare first. The smoother order is:

1. Create or connect the GitHub repository.
2. Connect Supabase and apply the migration.
3. Add Cloudflare Pages.
4. Set the build command to `npm run build`.
5. Set the output directory to `dist`.
6. Add environment variables in Cloudflare Pages:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEFAULT_EDITION_KEY`

Cloudflare can be connected earlier, but it has more to do once the repo and environment contract exist.

## Next Build Steps

1. Replace demo data with Supabase reads.
2. Add Supabase Auth screens.
3. Add platform owner screens for editions, SKUs, manifests, and entitlements.
4. Add workspace program cloning and label overrides.
5. Add interview session runtime.
6. Add AI provider abstraction for Gemini/OpenAI/other providers.
7. Add synthesis jobs for artifacts and deliverables.

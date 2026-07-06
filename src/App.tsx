import {
  Boxes,
  CheckCircle2,
  FileText,
  Fingerprint,
  KeyRound,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  UsersRound
} from 'lucide-react';
import { hasCapability, explainCapability } from './domain/entitlements';
import { labelFor } from './domain/manifest';
import { editionManifests } from './data/editionManifests';
import {
  demoEntitlements,
  demoParticipants,
  demoPrograms,
  demoWorkspace
} from './data/demoWorkspace';

const activeEdition = editionManifests.find((edition) => edition.key === demoWorkspace.editionKey)!;

const availableProgramCatalog = [
  {
    capability: 'program.ai-readiness',
    name: 'AI Readiness',
    description: 'Executive and team interviews that become an AI roadmap.'
  },
  {
    capability: 'program.sales-discovery',
    name: 'Sales Discovery',
    description: 'Stakeholder interviews that surface buying signals and process friction.'
  },
  {
    capability: 'program.customer-success-discovery',
    name: 'Customer Success Discovery',
    description: 'Customer journey, retention risk, support handoff, and expansion insights.'
  },
  {
    capability: 'program.support-workflow-audit',
    name: 'Support Workflow Audit',
    description: 'Ticket patterns, help-doc gaps, escalation rules, and automation targets.'
  },
  {
    capability: 'program.legal-discovery',
    name: 'Legal Discovery',
    description: 'A locked add-on example for future verticalized agent packs.'
  }
];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">{activeEdition.branding.logoMark}</div>
        <div>
          <p className="eyebrow">Platform Owner</p>
          <h1>{activeEdition.name}</h1>
          <p className="muted">{activeEdition.positioning}</p>
        </div>

        <nav className="nav-list">
          {activeEdition.navigation.map((item) => (
            <button key={item.key} className="nav-item">
              {labelFor(activeEdition, null, item.labelKey)}
            </button>
          ))}
        </nav>

        <div className="sidebar-panel">
          <ShieldCheck size={18} />
          <div>
            <strong>Isolated schema ready</strong>
            <span>Supabase tables are scaffolded under `platform`, not `public`.</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>{demoWorkspace.name}</h2>
          </div>
          <div className="sku-pill">
            <KeyRound size={16} />
            {demoWorkspace.sku}
          </div>
        </header>

        <section className="metric-grid">
          <Metric icon={<Boxes />} label="Active programs" value={demoPrograms.length.toString()} />
          <Metric icon={<UsersRound />} label="Participants" value={demoParticipants.length.toString()} />
          <Metric icon={<Sparkles />} label="Agents entitled" value="2" />
          <Metric icon={<FileText />} label="Deliverables" value={activeEdition.deliverables.length.toString()} />
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{labelFor(activeEdition, null, 'program')} Arsenal</p>
              <h3>Installed workspace programs</h3>
            </div>
            <button className="primary-button">
              <Plus size={17} />
              Clone program
            </button>
          </div>

          <div className="program-grid">
            {demoPrograms.map((program) => {
              const participantCount = demoParticipants.filter((item) => item.programId === program.id).length;

              return (
                <article key={program.id} className="program-card">
                  <div className="card-topline">
                    <span>{program.status}</span>
                    <Fingerprint size={17} />
                  </div>
                  <h4>{program.name}</h4>
                  <dl className="label-list">
                    <div>
                      <dt>{labelFor(activeEdition, null, 'participant')}</dt>
                      <dd>{labelFor(activeEdition, program, 'participant')}</dd>
                    </div>
                    <div>
                      <dt>{labelFor(activeEdition, null, 'artifact')}</dt>
                      <dd>{labelFor(activeEdition, program, 'artifact')}</dd>
                    </div>
                    <div>
                      <dt>{labelFor(activeEdition, null, 'deliverable')}</dt>
                      <dd>{labelFor(activeEdition, program, 'deliverable')}</dd>
                    </div>
                  </dl>
                  <footer>
                    <span>{participantCount} assigned</span>
                    <span>{program.enabledAgentIds.length} agents</span>
                  </footer>
                </article>
              );
            })}
          </div>
        </section>

        <section className="split">
          <div className="section panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Entitlements</p>
                <h3>Program catalog</h3>
              </div>
            </div>
            <div className="catalog-list">
              {availableProgramCatalog.map((program) => {
                const enabled = hasCapability(demoEntitlements, program.capability);
                return (
                  <div key={program.capability} className="catalog-row">
                    <div className={enabled ? 'status-icon enabled' : 'status-icon locked'}>
                      {enabled ? <CheckCircle2 size={17} /> : <Lock size={17} />}
                    </div>
                    <div>
                      <strong>{program.name}</strong>
                      <p>{program.description}</p>
                      <small>{explainCapability(demoEntitlements, program.capability)}</small>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="section panel">
            <div className="section-heading compact">
              <div>
                <p className="eyebrow">Interview Engine</p>
                <h3>Reusable tracks</h3>
              </div>
            </div>
            <div className="track-list">
              {activeEdition.interviewTracks.map((track) => (
                <article key={track.id} className="track-card">
                  <span>{track.participantRole}</span>
                  <h4>{track.title}</h4>
                  <p>{track.description}</p>
                  <small>{track.questionSet.length} starter questions</small>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

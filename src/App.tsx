import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  Link,
  Lock,
  LogOut,
  MessageCircle,
  Mic,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
  UsersRound
} from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

const allowedEmail = 'mikehilton.work@gmail.com';

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type EditionRow = {
  id: string;
  key: string;
  name: string;
  positioning: string;
  manifest: Record<string, unknown>;
};

type SkuRow = {
  id: string;
  key: string;
  name: string;
  edition_id: string | null;
};

type WorkspaceRow = {
  id: string;
  name: string;
  edition_id: string | null;
  sku_id: string | null;
  owner_user_id: string;
  created_at: string;
  settings: Record<string, unknown>;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
};

type ProgramRow = {
  id: string;
  workspace_id: string;
  program_key: string;
  name: string;
  status: string;
  label_overrides: Record<string, string>;
  manifest_overrides: {
    questions?: InterviewQuestion[];
  };
  created_at: string;
};

type ParticipantRow = {
  id: string;
  workspace_id: string;
  program_id: string | null;
  display_name: string;
  email: string | null;
  role_label: string;
  created_at: string;
};

type SessionRow = {
  id: string;
  workspace_id: string;
  program_id: string;
  participant_id: string | null;
  track_key: string;
  status: string;
  title: string;
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
};

type ArtifactRow = {
  id: string;
  workspace_id: string;
  program_id: string | null;
  session_id: string | null;
  artifact_type: string;
  title: string;
  body: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  role: 'agent' | 'participant' | 'system';
  content: string;
  sequence: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

type InterviewQuestion = {
  id: string;
  text: string;
  extract_key: string;
};

type AppData = {
  editions: EditionRow[];
  skus: SkuRow[];
  platformWorkspaces: WorkspaceRow[];
  myWorkspaces: WorkspaceRow[];
  profiles: ProfileRow[];
  programs: ProgramRow[];
  participants: ParticipantRow[];
  sessions: SessionRow[];
  artifacts: ArtifactRow[];
  isPlatformAdmin: boolean;
};

const emptyData: AppData = {
  editions: [],
  skus: [],
  platformWorkspaces: [],
  myWorkspaces: [],
  profiles: [],
  programs: [],
  participants: [],
  sessions: [],
  artifacts: [],
  isPlatformAdmin: false
};

type PublicInterviewData = {
  session: SessionRow;
  program: Pick<ProgramRow, 'id' | 'name' | 'program_key' | 'label_overrides'> & { questions: InterviewQuestion[] };
  participant: ParticipantRow;
  messages: MessageRow[];
};

const defaultQuestionBank: Record<string, InterviewQuestion[]> = {
  'ai-readiness': [
    {
      id: 'current-state',
      text: 'Where is your team already using AI today, even informally?',
      extract_key: 'Current AI usage'
    },
    {
      id: 'workflow-friction',
      text: 'Which recurring workflows feel slow, manual, or dependent on tribal knowledge?',
      extract_key: 'Workflow friction'
    },
    {
      id: 'risk-readiness',
      text: 'What risks, policies, or customer concerns would need to be handled before AI could be adopted more broadly?',
      extract_key: 'Adoption risks'
    }
  ],
  'sales-discovery': [
    {
      id: 'buyer-process',
      text: 'Walk me through how a qualified opportunity moves from first conversation to signed customer.',
      extract_key: 'Sales process'
    },
    {
      id: 'objections',
      text: 'What objections or points of confusion slow deals down most often?',
      extract_key: 'Sales objections'
    },
    {
      id: 'enablement-gap',
      text: 'What information do sellers repeatedly need but have trouble finding or explaining?',
      extract_key: 'Enablement gaps'
    }
  ],
  'customer-success-discovery': [
    {
      id: 'success-signals',
      text: 'What behaviors tell you a customer is getting real value?',
      extract_key: 'Success signals'
    },
    {
      id: 'retention-risk',
      text: 'Where do customers tend to get stuck, surprised, or disappointed?',
      extract_key: 'Retention risks'
    },
    {
      id: 'playbook',
      text: 'What should every new team member understand about supporting these customers well?',
      extract_key: 'Support playbook'
    }
  ],
  'legacy-weaver': [
    {
      id: 'origin-story',
      text: 'Where would you like to begin your story?',
      extract_key: 'Origin story'
    },
    {
      id: 'meaningful-memory',
      text: 'Tell me about a memory that still feels vivid or meaningful to you.',
      extract_key: 'Meaningful memory'
    },
    {
      id: 'legacy-message',
      text: 'What would you want future generations to understand about your life?',
      extract_key: 'Legacy message'
    }
  ]
};

export function App() {
  const interviewToken = window.location.pathname.startsWith('/interview/')
    ? window.location.pathname.split('/interview/')[1]?.replace(/\/$/, '') || null
    : null;
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<AppData>(emptyData);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'platform' | 'workspace'>('platform');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: authData }) => {
      setSession(authData.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setData(emptyData);
      return;
    }

    void loadData(session.user);
  }, [session?.user?.id]);

  const selectedWorkspace = useMemo(() => {
    const pool = data.isPlatformAdmin ? data.platformWorkspaces : data.myWorkspaces;
    return pool.find((workspace) => workspace.id === selectedWorkspaceId) ?? data.myWorkspaces[0] ?? pool[0] ?? null;
  }, [data, selectedWorkspaceId]);

  async function loadData(user: User) {
    if (!supabase) return;
    setLoading(true);
    setNotice(null);

    try {
      const { data: dashboard, error } = await supabase.rpc('platform_get_dashboard');
      throwIfError(error);

      const nextData = normalizeAppData(dashboard);

      setData(nextData);

      const defaultWorkspace = nextData.myWorkspaces[0] ?? nextData.platformWorkspaces[0] ?? null;
      setSelectedWorkspaceId((current) => current ?? defaultWorkspace?.id ?? null);
      setActiveView(nextData.isPlatformAdmin ? 'platform' : 'workspace');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load workspace data.');
    } finally {
      setLoading(false);
    }
  }

  async function createWorkspace(input: { name: string; editionKey: string }) {
    if (!supabase || !session?.user) return;

    setLoading(true);
    setNotice(null);

    try {
      const { data: workspace, error } = await supabase.rpc('platform_create_workspace', {
        workspace_name: input.name,
        edition_key: input.editionKey
      });

      throwIfError(error);

      setSelectedWorkspaceId((workspace as WorkspaceRow | null)?.id ?? null);
      setActiveView('workspace');
      setNotice(`Created ${input.name}.`);
      await loadData(session.user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create workspace.');
    } finally {
      setLoading(false);
    }
  }

  async function updateProgram(input: { programId: string; name: string; questions: InterviewQuestion[] }) {
    if (!supabase || !session?.user) return;

    setLoading(true);
    setNotice(null);

    try {
      const { error } = await supabase.rpc('platform_update_program', {
        program_id: input.programId,
        program_name: input.name,
        interview_questions: input.questions
      });

      throwIfError(error);
      setNotice('Program interview setup saved.');
      await loadData(session.user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save program.');
    } finally {
      setLoading(false);
    }
  }

  async function createInterviewSession(input: { programId: string; participantName: string; participantEmail: string }) {
    if (!supabase || !session?.user) return null;

    setLoading(true);
    setNotice(null);

    try {
      const { data: created, error } = await supabase.rpc('platform_create_interview_session', {
        program_id: input.programId,
        participant_name: input.participantName,
        participant_email: input.participantEmail || null
      });

      throwIfError(error);
      await loadData(session.user);

      const token = typeof created === 'object' && created && 'token' in created ? String((created as { token: unknown }).token) : null;
      setNotice(token ? 'Interview link created.' : 'Interview session created.');
      return token;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create interview.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  if (interviewToken) {
    return <PublicInterview token={interviewToken} />;
  }

  if (!supabase) {
    return <MissingConfig />;
  }

  if (loading && !session) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  const selectedEdition = selectedWorkspace ? data.editions.find((edition) => edition.id === selectedWorkspace.edition_id) : null;
  const selectedSku = selectedWorkspace ? data.skus.find((sku) => sku.id === selectedWorkspace.sku_id) : null;
  const selectedPrograms = selectedWorkspace ? data.programs.filter((program) => program.workspace_id === selectedWorkspace.id) : [];
  const selectedOwner = selectedWorkspace ? data.profiles.find((profile) => profile.id === selectedWorkspace.owner_user_id) : null;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">IO</div>
        <div>
          <p className="eyebrow">Interview Platform</p>
          <h1>Workspace OS</h1>
          <p className="muted">Provision vertical interview programs, customer workspaces, and reusable AI agents.</p>
        </div>

        <nav className="nav-list">
          <button className={`nav-item ${activeView === 'platform' ? 'active' : ''}`} onClick={() => setActiveView('platform')}>
            Platform
          </button>
          <button className={`nav-item ${activeView === 'workspace' ? 'active' : ''}`} onClick={() => setActiveView('workspace')}>
            My Workspace
          </button>
        </nav>

        <div className="sidebar-panel">
          <ShieldCheck size={18} />
          <div>
            <strong>{data.isPlatformAdmin ? 'Platform admin' : 'Workspace user'}</strong>
            <span>{session.user.email}</span>
          </div>
        </div>

        <button className="ghost-button dark" onClick={() => void supabase?.auth.signOut()}>
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      <section className="content">
        {notice && <div className="notice">{notice}</div>}

        <header className="topbar">
          <div>
            <p className="eyebrow">{activeView === 'platform' ? 'Platform View' : 'Workspace View'}</p>
            <h2>{activeView === 'platform' ? 'Customer workspaces' : selectedWorkspace?.name ?? 'No workspace yet'}</h2>
          </div>
          <button className="secondary-button" onClick={() => loadData(session.user)}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {activeView === 'platform' ? (
          <PlatformView
            data={data}
            onCreateWorkspace={createWorkspace}
            onOpenWorkspace={(id) => {
              setSelectedWorkspaceId(id);
              setActiveView('workspace');
            }}
          />
        ) : (
          <WorkspaceView
            workspace={selectedWorkspace}
            edition={selectedEdition}
            sku={selectedSku}
            owner={selectedOwner}
            programs={selectedPrograms}
            myWorkspaces={data.myWorkspaces}
            editions={data.editions}
            participants={data.participants}
            sessions={data.sessions}
            artifacts={data.artifacts}
            onCreateWorkspace={createWorkspace}
            onSelectWorkspace={setSelectedWorkspaceId}
            onUpdateProgram={updateProgram}
            onCreateInterviewSession={createInterviewSession}
          />
        )}
      </section>
    </main>
  );
}

function PlatformView({
  data,
  onCreateWorkspace,
  onOpenWorkspace
}: {
  data: AppData;
  onCreateWorkspace: (input: { name: string; editionKey: string }) => Promise<void>;
  onOpenWorkspace: (id: string) => void;
}) {
  if (!data.isPlatformAdmin) {
    return (
      <section className="section empty-state">
        <Lock size={28} />
        <h3>Platform access is not enabled for this login.</h3>
        <p>Sign in with the configured platform owner account or refresh after a new deployment finishes.</p>
      </section>
    );
  }

  return (
    <>
      <section className="metric-grid">
        <Metric icon={<Building2 />} label="Customer workspaces" value={data.platformWorkspaces.length.toString()} />
        <Metric icon={<BriefcaseBusiness />} label="Editions" value={data.editions.length.toString()} />
        <Metric icon={<KeyRound />} label="SKUs" value={data.skus.length.toString()} />
        <Metric icon={<Sparkles />} label="Programs installed" value={data.programs.length.toString()} />
      </section>

      <section className="split">
        <div className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Customers</p>
              <h3>All workspaces</h3>
            </div>
          </div>
          <div className="workspace-list">
            {data.platformWorkspaces.map((workspace) => {
              const owner = data.profiles.find((profile) => profile.id === workspace.owner_user_id);
              const edition = data.editions.find((item) => item.id === workspace.edition_id);
              const programCount = data.programs.filter((program) => program.workspace_id === workspace.id).length;

              return (
                <button key={workspace.id} className="workspace-row" onClick={() => onOpenWorkspace(workspace.id)}>
                  <div>
                    <strong>{workspace.name}</strong>
                    <span>{owner?.email ?? owner?.display_name ?? workspace.owner_user_id}</span>
                  </div>
                  <div>
                    <small>{edition?.name ?? 'No edition'}</small>
                    <small>{programCount} programs</small>
                  </div>
                </button>
              );
            })}
            {data.platformWorkspaces.length === 0 && <p className="soft-copy">No customer workspaces yet.</p>}
          </div>
        </div>

        <CreateWorkspacePanel editions={data.editions} onCreateWorkspace={onCreateWorkspace} />
      </section>
    </>
  );
}

function WorkspaceView({
  workspace,
  edition,
  sku,
  owner,
  programs,
  myWorkspaces,
  editions,
  participants,
  sessions,
  artifacts,
  onCreateWorkspace,
  onSelectWorkspace,
  onUpdateProgram,
  onCreateInterviewSession
}: {
  workspace: WorkspaceRow | null;
  edition: EditionRow | null | undefined;
  sku: SkuRow | null | undefined;
  owner: ProfileRow | null | undefined;
  programs: ProgramRow[];
  myWorkspaces: WorkspaceRow[];
  editions: EditionRow[];
  participants: ParticipantRow[];
  sessions: SessionRow[];
  artifacts: ArtifactRow[];
  onCreateWorkspace: (input: { name: string; editionKey: string }) => Promise<void>;
  onSelectWorkspace: (id: string) => void;
  onUpdateProgram: (input: { programId: string; name: string; questions: InterviewQuestion[] }) => Promise<void>;
  onCreateInterviewSession: (input: { programId: string; participantName: string; participantEmail: string }) => Promise<string | null>;
}) {
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(programs[0]?.id ?? null);
  const selectedProgram = programs.find((program) => program.id === selectedProgramId) ?? programs[0] ?? null;
  const workspaceSessions = workspace ? sessions.filter((item) => item.workspace_id === workspace.id) : [];
  const workspaceParticipants = workspace ? participants.filter((item) => item.workspace_id === workspace.id) : [];
  const workspaceArtifacts = workspace ? artifacts.filter((item) => item.workspace_id === workspace.id) : [];

  useEffect(() => {
    if (!selectedProgramId || !programs.some((program) => program.id === selectedProgramId)) {
      setSelectedProgramId(programs[0]?.id ?? null);
    }
  }, [programs, selectedProgramId]);

  if (!workspace) {
    return (
      <section className="split">
        <section className="section empty-state">
          <Boxes size={28} />
          <h3>Create your first workspace.</h3>
          <p>This provisions a workspace you can experience as a normal user.</p>
        </section>
        <CreateWorkspacePanel editions={editions} onCreateWorkspace={onCreateWorkspace} />
      </section>
    );
  }

  return (
    <>
      <section className="metric-grid">
        <Metric icon={<Boxes />} label="Programs" value={programs.length.toString()} />
        <Metric icon={<UsersRound />} label="Participants" value={workspaceParticipants.length.toString()} />
        <Metric icon={<FileText />} label="Artifacts" value={workspaceArtifacts.length.toString()} />
        <Metric icon={<CheckCircle2 />} label="Sessions" value={workspaceSessions.length.toString()} />
      </section>

      <section className="split">
        <div className="section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">User Experience</p>
              <h3>{workspace.name}</h3>
            </div>
            <div className="sku-pill">
              <KeyRound size={16} />
              {sku?.key ?? 'no-sku'}
            </div>
          </div>

          <div className="details-grid">
            <div>
              <span>Edition</span>
              <strong>{edition?.name ?? 'Unknown'}</strong>
            </div>
            <div>
              <span>Owner</span>
              <strong>{owner?.email ?? owner?.display_name ?? workspace.owner_user_id}</strong>
            </div>
          </div>

          <div className="program-grid compact-grid">
            {programs.map((program) => (
              <button
                key={program.id}
                className={`program-card selectable-card ${selectedProgram?.id === program.id ? 'selected' : ''}`}
                onClick={() => setSelectedProgramId(program.id)}
              >
                <div className="card-topline">
                  <span>{program.status}</span>
                  <BriefcaseBusiness size={17} />
                </div>
                <h4>{program.name}</h4>
                <dl className="label-list">
                  {Object.entries(program.label_overrides ?? {}).length === 0 ? (
                    <div>
                      <dt>Labels</dt>
                      <dd>Default edition language</dd>
                    </div>
                  ) : (
                    Object.entries(program.label_overrides).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))
                  )}
                </dl>
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">My Access</p>
              <h3>Workspaces I can enter</h3>
            </div>
          </div>
          <div className="workspace-list">
            {myWorkspaces.map((item) => (
              <button key={item.id} className="workspace-row" onClick={() => onSelectWorkspace(item.id)}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.id === workspace.id ? 'Current workspace' : 'Open workspace'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {selectedProgram && (
        <section className="split wide-split">
          <ProgramSetupPanel program={selectedProgram} onUpdateProgram={onUpdateProgram} />
          <InterviewLaunchPanel
            program={selectedProgram}
            sessions={workspaceSessions.filter((item) => item.program_id === selectedProgram.id)}
            participants={workspaceParticipants}
            artifacts={workspaceArtifacts.filter((item) => item.program_id === selectedProgram.id)}
            onCreateInterviewSession={onCreateInterviewSession}
          />
        </section>
      )}
    </>
  );
}

function ProgramSetupPanel({
  program,
  onUpdateProgram
}: {
  program: ProgramRow;
  onUpdateProgram: (input: { programId: string; name: string; questions: InterviewQuestion[] }) => Promise<void>;
}) {
  const [name, setName] = useState(program.name);
  const [questionsText, setQuestionsText] = useState(formatQuestions(getProgramQuestions(program)));

  useEffect(() => {
    setName(program.name);
    setQuestionsText(formatQuestions(getProgramQuestions(program)));
  }, [program.id, program.name, program.manifest_overrides]);

  const questions = parseQuestions(questionsText, program.program_key);

  return (
    <section className="section form-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Agent Setup</p>
          <h3>Interview structure</h3>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void onUpdateProgram({ programId: program.id, name, questions })}
          disabled={questions.length === 0}
        >
          <Save size={16} />
          Save
        </button>
      </div>

      <label>
        Program name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>

      <label>
        Interview questions
        <textarea
          value={questionsText}
          onChange={(event) => setQuestionsText(event.target.value)}
          rows={9}
          placeholder="One question per line"
        />
      </label>

      <div className="question-preview">
        {questions.map((question, index) => (
          <div key={question.id}>
            <span>{index + 1}</span>
            <p>{question.text}</p>
            <small>{question.extract_key}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function InterviewLaunchPanel({
  program,
  sessions,
  participants,
  artifacts,
  onCreateInterviewSession
}: {
  program: ProgramRow;
  sessions: SessionRow[];
  participants: ParticipantRow[];
  artifacts: ArtifactRow[];
  onCreateInterviewSession: (input: { programId: string; participantName: string; participantEmail: string }) => Promise<string | null>;
}) {
  const [participantName, setParticipantName] = useState('New Stakeholder');
  const [participantEmail, setParticipantEmail] = useState('');
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

  async function createSession() {
    const token = await onCreateInterviewSession({ programId: program.id, participantName, participantEmail });
    if (token) {
      setCreatedLink(`${window.location.origin}/interview/${token}`);
    }
  }

  async function copyLink(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice('Copied link.');
    } catch {
      setCopyNotice('Select and copy the link below.');
    }
  }

  return (
    <section className="section form-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Interviews</p>
          <h3>Create participant link</h3>
        </div>
      </div>

      <label>
        Participant name
        <input value={participantName} onChange={(event) => setParticipantName(event.target.value)} />
      </label>

      <label>
        Participant email
        <input value={participantEmail} onChange={(event) => setParticipantEmail(event.target.value)} type="email" />
      </label>

      <button className="primary-button" type="button" onClick={() => void createSession()} disabled={!participantName.trim()}>
        <Link size={17} />
        Create interview link
      </button>

      {createdLink && (
        <div className="link-box">
          <span>Participant URL</span>
          <div className="copy-row">
            <a href={createdLink} target="_blank" rel="noreferrer">
              {createdLink}
            </a>
            <button className="icon-button" type="button" onClick={() => void copyLink(createdLink)} aria-label="Copy participant link">
              <Copy size={16} />
            </button>
          </div>
        </div>
      )}
      {copyNotice && <p className="soft-copy">{copyNotice}</p>}

      <div className="runtime-list">
        <h4>Recent sessions</h4>
        {sessions.map((item) => {
          const participant = participants.find((candidate) => candidate.id === item.participant_id);
          const token = typeof item.metadata?.public_token === 'string' ? item.metadata.public_token : null;
          const link = token ? `${window.location.origin}/interview/${token}` : null;
          return (
            <article key={item.id} className="runtime-row">
              <div>
                <strong>{item.title}</strong>
                <span>{participant?.email ?? participant?.display_name ?? 'Participant'}</span>
                {link && (
                  <div className="copy-row compact-copy-row">
                    <a href={link} target="_blank" rel="noreferrer">
                      {link}
                    </a>
                    <button className="icon-button" type="button" onClick={() => void copyLink(link)} aria-label="Copy participant link">
                      <Copy size={16} />
                    </button>
                  </div>
                )}
              </div>
              <small>{item.status}</small>
            </article>
          );
        })}
        {sessions.length === 0 && <p className="soft-copy">No sessions yet.</p>}
      </div>

      <div className="runtime-list">
        <h4>Extracted artifacts</h4>
        {artifacts.slice(0, 5).map((item) => (
          <article key={item.id} className="runtime-row">
            <div>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
            <small>{item.artifact_type}</small>
          </article>
        ))}
        {artifacts.length === 0 && <p className="soft-copy">Completed interviews will create artifacts here.</p>}
      </div>
    </section>
  );
}

function CreateWorkspacePanel({
  editions,
  onCreateWorkspace
}: {
  editions: EditionRow[];
  onCreateWorkspace: (input: { name: string; editionKey: string }) => Promise<void>;
}) {
  const [name, setName] = useState('Acme Corp AI Transformation');
  const [editionKey, setEditionKey] = useState('consultant-os');

  return (
    <form
      className="section form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void onCreateWorkspace({ name, editionKey });
      }}
    >
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Provision</p>
          <h3>Create workspace</h3>
        </div>
      </div>

      <label>
        Workspace name
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>

      <label>
        Edition
        <select value={editionKey} onChange={(event) => setEditionKey(event.target.value)}>
          {editions.map((edition) => (
            <option key={edition.key} value={edition.key}>
              {edition.name}
            </option>
          ))}
        </select>
      </label>

      <button className="primary-button" type="submit" disabled={editions.length === 0}>
        <Plus size={17} />
        Create workspace
      </button>
    </form>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!supabase) return;
    if (email.trim().toLowerCase() !== allowedEmail) {
      setNotice(`Access is currently limited to ${allowedEmail}.`);
      return;
    }

    setBusy(true);
    setNotice(null);

    const result =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (result.error) setNotice(result.error.message);
    else setNotice(mode === 'sign-up' ? 'Account created. Check email confirmation settings if login does not start.' : null);

    setBusy(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand-mark">IO</div>
        <p className="eyebrow">Interview Platform</p>
        <h1>{mode === 'sign-in' ? 'Sign in' : 'Create account'}</h1>
        <p className="soft-copy">Use {allowedEmail} to enter the platform and workspace views.</p>

        {notice && <div className="notice">{notice}</div>}

        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </label>

        <button className="primary-button" disabled={busy || !email || !password} onClick={submit}>
          {busy ? 'Working...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
        <button className="ghost-button" onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}>
          {mode === 'sign-in' ? 'Need an account?' : 'Already have an account?'}
        </button>
      </section>
    </main>
  );
}

function MissingConfig() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Supabase env vars are missing.</h1>
        <p className="soft-copy">Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Cloudflare Worker environment variables.</p>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Loading...</h1>
      </section>
    </main>
  );
}

function PublicInterview({ token }: { token: string }) {
  const [interview, setInterview] = useState<PublicInterviewData | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechSupported] = useState(() => {
    const speechWindow = window as SpeechWindow;
    return Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
  });

  const latestAgentMessage = useMemo(
    () =>
      interview?.messages
        .filter((message) => message.role === 'agent')
        .sort((a, b) => b.sequence - a.sequence)[0] ?? null,
    [interview?.messages]
  );

  useEffect(() => {
    void loadInterview();
  }, [token]);

  useEffect(() => {
    if (latestAgentMessage?.content) {
      speak(latestAgentMessage.content);
    }
  }, [latestAgentMessage?.id]);

  async function loadInterview() {
    if (!supabase) return;

    setLoading(true);
    setNotice(null);

    try {
      const { data, error } = await supabase.rpc('platform_get_interview_by_token', { session_token: token });
      throwIfError(error);
      setInterview(data as PublicInterviewData);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load interview.');
    } finally {
      setLoading(false);
    }
  }

  async function submitResponse() {
    if (!supabase || !response.trim()) return;

    setLoading(true);
    setNotice(null);

    try {
      const { data, error } = await supabase.rpc('platform_submit_interview_message', {
        session_token: token,
        participant_response: response
      });

      throwIfError(error);
      setInterview(data as PublicInterviewData);
      setResponse('');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not save response.');
    } finally {
      setLoading(false);
    }
  }

  function speak(text: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  function startListening() {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setNotice('Voice input is not available in this browser. Chrome is recommended for the MVP.');
      return;
    }

    window.speechSynthesis?.cancel();

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setResponse(transcript.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
      setNotice('Voice capture stopped. You can try the mic again or type the response.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setNotice(null);
    setIsListening(true);
  }

  function stopListening() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    window.speechSynthesis?.cancel();
  }

  if (!supabase) return <MissingConfig />;

  return (
    <main className="interview-shell">
      <section className="interview-panel">
        <div className="interview-header">
          <div className="brand-mark">IO</div>
          <div>
            <p className="eyebrow">{interview?.program.name ?? 'Interview'}</p>
            <h1>{interview?.participant.display_name ?? 'Participant interview'}</h1>
          </div>
          {interview && <span className="status-chip">{interview.session.status}</span>}
        </div>

        {notice && <div className="notice">{notice}</div>}

        <div className="message-list">
          {interview?.messages.map((message) => (
            <article key={message.id} className={`message-bubble ${message.role}`}>
              <span>{message.role === 'agent' ? 'Interviewer' : 'You'}</span>
              <p>{message.content}</p>
              {message.role === 'agent' && (
                <button className="bubble-action" type="button" onClick={() => speak(message.content)}>
                  <Volume2 size={15} />
                  Replay
                </button>
              )}
            </article>
          ))}
          {!interview && !loading && <p className="soft-copy">Interview could not be loaded.</p>}
        </div>

        {interview?.session.status === 'complete' ? (
          <div className="completion-card">
            <CheckCircle2 size={22} />
            <strong>Interview complete</strong>
            <span>Your responses have been saved.</span>
          </div>
        ) : (
          <div className="response-box">
            <div className="voice-controls">
              <button
                className={`voice-button ${isListening ? 'listening' : ''}`}
                type="button"
                onClick={isListening ? stopListening : startListening}
                disabled={loading}
              >
                {isListening ? <Square size={18} /> : <Mic size={18} />}
                {isListening ? 'Stop recording' : 'Speak response'}
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={() => latestAgentMessage && speak(latestAgentMessage.content)}
                disabled={!latestAgentMessage}
              >
                <Volume2 size={16} />
                Replay question
              </button>
            </div>
            {!speechSupported && <p className="soft-copy">Voice input needs a browser with speech recognition support. Chrome works best.</p>}
            <textarea
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              rows={5}
              placeholder="Speak, then review or edit the transcript..."
              disabled={loading}
            />
            <button className="primary-button" onClick={() => void submitResponse()} disabled={loading || !response.trim()}>
              <MessageCircle size={17} />
              Send response
            </button>
          </div>
        )}
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

function getProgramQuestions(program: ProgramRow): InterviewQuestion[] {
  const stored = program.manifest_overrides?.questions;
  if (stored && stored.length > 0) return stored;
  return defaultQuestionBank[program.program_key] ?? defaultQuestionBank['ai-readiness'];
}

function formatQuestions(questions: InterviewQuestion[]) {
  return questions.map((question) => question.text).join('\n');
}

function parseQuestions(value: string, programKey: string): InterviewQuestion[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${programKey}-q-${index + 1}`,
      text,
      extract_key: text.length > 42 ? `${text.slice(0, 39)}...` : text
    }));
}

function throwIfError(error: unknown) {
  if (!error) return;
  if (typeof error === 'object' && error && 'message' in error) {
    throw new Error(String((error as { message: unknown }).message));
  }
  throw new Error('Unexpected Supabase error.');
}

function normalizeAppData(value: unknown): AppData {
  if (!value || typeof value !== 'object') return emptyData;

  const data = value as Partial<AppData>;

  return {
    editions: Array.isArray(data.editions) ? (data.editions as EditionRow[]) : [],
    skus: Array.isArray(data.skus) ? (data.skus as SkuRow[]) : [],
    platformWorkspaces: Array.isArray(data.platformWorkspaces) ? (data.platformWorkspaces as WorkspaceRow[]) : [],
    myWorkspaces: Array.isArray(data.myWorkspaces) ? (data.myWorkspaces as WorkspaceRow[]) : [],
    profiles: Array.isArray(data.profiles) ? (data.profiles as ProfileRow[]) : [],
    programs: Array.isArray(data.programs) ? (data.programs as ProgramRow[]) : [],
    participants: Array.isArray(data.participants) ? (data.participants as ParticipantRow[]) : [],
    sessions: Array.isArray(data.sessions) ? (data.sessions as SessionRow[]) : [],
    artifacts: Array.isArray(data.artifacts) ? (data.artifacts as ArtifactRow[]) : [],
    isPlatformAdmin: data.isPlatformAdmin === true
  };
}

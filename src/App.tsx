import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UsersRound
} from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

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
};

type AppData = {
  editions: EditionRow[];
  skus: SkuRow[];
  platformWorkspaces: WorkspaceRow[];
  myWorkspaces: WorkspaceRow[];
  profiles: ProfileRow[];
  programs: ProgramRow[];
  isPlatformAdmin: boolean;
};

const emptyData: AppData = {
  editions: [],
  skus: [],
  platformWorkspaces: [],
  myWorkspaces: [],
  profiles: [],
  programs: [],
  isPlatformAdmin: false
};

const defaultProgramsByEdition: Record<string, Array<{ key: string; name: string; labels?: Record<string, string> }>> = {
  'consultant-os': [
    { key: 'ai-readiness', name: 'Executive AI Readiness' },
    {
      key: 'sales-discovery',
      name: 'Sales Discovery',
      labels: {
        participant: 'Sales Leader',
        artifact: 'Buying Signal',
        deliverable: 'Sales Enablement Brief'
      }
    },
    {
      key: 'customer-success-discovery',
      name: 'Customer Success Discovery',
      labels: {
        participant: 'Customer Success Lead',
        artifact: 'Retention Signal',
        deliverable: 'Success Playbook'
      }
    }
  ],
  'legacy-weaver': [{ key: 'legacy-weaver', name: 'Family Story Archive' }]
};

export function App() {
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
      await ensureProfile(user);

      const [editionsResult, skusResult, adminResult, myMembershipsResult] = await Promise.all([
        supabase.from('editions').select('id,key,name,positioning,manifest').order('name'),
        supabase.from('skus').select('id,key,name,edition_id').order('name'),
        supabase.from('platform_admins').select('user_id').eq('user_id', user.id),
        supabase.from('workspace_memberships').select('workspace_id,role').eq('user_id', user.id)
      ]);

      throwIfError(editionsResult.error);
      throwIfError(skusResult.error);
      throwIfError(adminResult.error);
      throwIfError(myMembershipsResult.error);

      const isPlatformAdmin = (adminResult.data ?? []).length > 0;
      const myWorkspaceIds = (myMembershipsResult.data ?? []).map((membership) => membership.workspace_id);

      const platformWorkspacesResult = isPlatformAdmin
        ? await supabase.from('workspaces').select('*').order('created_at', { ascending: false })
        : { data: [], error: null };

      const myWorkspacesResult =
        myWorkspaceIds.length > 0
          ? await supabase.from('workspaces').select('*').in('id', myWorkspaceIds).order('created_at', { ascending: false })
          : { data: [], error: null };

      throwIfError(platformWorkspacesResult.error);
      throwIfError(myWorkspacesResult.error);

      const workspaceIds = Array.from(
        new Set([...(platformWorkspacesResult.data ?? []), ...(myWorkspacesResult.data ?? [])].map((workspace) => workspace.id))
      );
      const ownerIds = Array.from(
        new Set([...(platformWorkspacesResult.data ?? []), ...(myWorkspacesResult.data ?? [])].map((workspace) => workspace.owner_user_id))
      );

      const programsResult =
        workspaceIds.length > 0
          ? await supabase.from('workspace_programs').select('*').in('workspace_id', workspaceIds).order('created_at')
          : { data: [], error: null };

      const profilesResult =
        ownerIds.length > 0 ? await supabase.from('profiles').select('id,email,display_name').in('id', ownerIds) : { data: [], error: null };

      throwIfError(programsResult.error);
      throwIfError(profilesResult.error);

      const nextData = {
        editions: (editionsResult.data ?? []) as EditionRow[],
        skus: (skusResult.data ?? []) as SkuRow[],
        platformWorkspaces: (platformWorkspacesResult.data ?? []) as WorkspaceRow[],
        myWorkspaces: (myWorkspacesResult.data ?? []) as WorkspaceRow[],
        profiles: (profilesResult.data ?? []) as ProfileRow[],
        programs: (programsResult.data ?? []) as ProgramRow[],
        isPlatformAdmin
      };

      setData(nextData);

      const defaultWorkspace = nextData.myWorkspaces[0] ?? nextData.platformWorkspaces[0] ?? null;
      setSelectedWorkspaceId((current) => current ?? defaultWorkspace?.id ?? null);
      setActiveView(isPlatformAdmin ? 'platform' : 'workspace');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load workspace data.');
    } finally {
      setLoading(false);
    }
  }

  async function ensureProfile(user: User) {
    if (!supabase) return;

    const emailName = user.email?.split('@')[0] ?? 'User';
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? emailName,
      avatar_url: user.user_metadata?.avatar_url ?? null
    });

    throwIfError(error);
  }

  async function createWorkspace(input: { name: string; editionKey: string }) {
    if (!supabase || !session?.user) return;

    setLoading(true);
    setNotice(null);

    try {
      await ensureProfile(session.user);

      const edition = data.editions.find((item) => item.key === input.editionKey);
      if (!edition) throw new Error('Edition not found.');

      const skuKey = input.editionKey === 'legacy-weaver' ? 'legacy-family-basic' : 'consultant-pro';
      const sku = data.skus.find((item) => item.key === skuKey);
      if (!sku) throw new Error('SKU not found.');

      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: input.name,
          edition_id: edition.id,
          sku_id: sku.id,
          owner_user_id: session.user.id,
          settings: { provisioned_from: 'demo-ui' }
        })
        .select()
        .single();

      throwIfError(workspaceError);

      const { error: membershipError } = await supabase.from('workspace_memberships').insert({
        workspace_id: workspace.id,
        user_id: session.user.id,
        role: 'owner'
      });

      throwIfError(membershipError);

      const programs = defaultProgramsByEdition[input.editionKey] ?? [];
      if (programs.length > 0) {
        const { error: programsError } = await supabase.from('workspace_programs').insert(
          programs.map((program) => ({
            workspace_id: workspace.id,
            base_edition_id: edition.id,
            program_key: program.key,
            name: program.name,
            status: 'active',
            label_overrides: program.labels ?? {},
            manifest_overrides: {},
            created_by: session.user.id
          }))
        );

        throwIfError(programsError);
      }

      setSelectedWorkspaceId(workspace.id);
      setActiveView('workspace');
      setNotice(`Created ${input.name}.`);
      await loadData(session.user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not create workspace.');
    } finally {
      setLoading(false);
    }
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
            onCreateWorkspace={createWorkspace}
            onSelectWorkspace={setSelectedWorkspaceId}
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
        <p>Your workspace view still works. Add this user to `platform.platform_admins` to see all customer workspaces.</p>
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
  onCreateWorkspace,
  onSelectWorkspace
}: {
  workspace: WorkspaceRow | null;
  edition: EditionRow | null | undefined;
  sku: SkuRow | null | undefined;
  owner: ProfileRow | null | undefined;
  programs: ProgramRow[];
  myWorkspaces: WorkspaceRow[];
  editions: EditionRow[];
  onCreateWorkspace: (input: { name: string; editionKey: string }) => Promise<void>;
  onSelectWorkspace: (id: string) => void;
}) {
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
        <Metric icon={<UsersRound />} label="Participants" value="0" />
        <Metric icon={<FileText />} label="Artifacts" value="0" />
        <Metric icon={<CheckCircle2 />} label="Sessions" value="0" />
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
              <article key={program.id} className="program-card">
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
              </article>
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
    </>
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
        <p className="soft-copy">Use your Supabase Auth user to enter the platform and workspace views.</p>

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

function throwIfError(error: unknown) {
  if (!error) return;
  if (typeof error === 'object' && error && 'message' in error) {
    throw new Error(String((error as { message: unknown }).message));
  }
  throw new Error('Unexpected Supabase error.');
}

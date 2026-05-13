import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Project } from '../lib/api';
import { Button, Card, Input, Label, Page } from '../components/ui';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.listProjects();
    setProjects(res.projects);
  }

  useEffect(() => {
    load().catch((e) => setErr(e?.message ?? 'Failed to load projects'));
  }, []);

  async function create() {
    setErr(null);
    setBusy(true);
    try {
      if (!name.trim()) throw new Error('Project name required');
      await api.createProject({ name: name.trim() });
      setName('');
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create project');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Projects">
      {err && <Card className="mb-4 border-rose-500/30 bg-rose-500/10 text-rose-200">{err}</Card>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <div className="mb-2 text-sm font-bold">Create project</div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Website revamp" />
          <Button disabled={busy} className="mt-3 w-full" onClick={create}>
            {busy ? 'Creating…' : 'Create'}
          </Button>
        </Card>

        <div className="md:col-span-2">
          <div className="grid gap-3">
            {projects.length === 0 ? (
              <Card>
                <div className="text-sm text-slate-300">No projects yet. Create one to get started.</div>
              </Card>
            ) : (
              projects.map((p) => (
                <Card key={p.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-lg font-bold">{p.name}</div>
                    <div className="text-xs text-slate-400">Role: {p.role ?? 'MEMBER'}</div>
                  </div>
                  <Link to={`/projects/${p.id}`}>
                    <Button variant="ghost">Open</Button>
                  </Link>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}


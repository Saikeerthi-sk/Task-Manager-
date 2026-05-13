import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Member, type Task } from '../lib/api';
import { Button, Card, Input, Label, Page, Select } from '../components/ui';

function isoFromLocalInput(v: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const pid = projectId ?? '';

  const [projectName, setProjectName] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');

  const [newTitle, setNewTitle] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');
  const [newDue, setNewDue] = useState('');

  const assigneeOptions = useMemo(() => [{ id: '', label: 'Unassigned' }].concat(
    members.map((m) => ({ id: m.user.id, label: `${m.user.name} (${m.user.email})` })),
  ), [members]);

  async function load() {
    setErr(null);
    const [p, m, t] = await Promise.all([api.getProject(pid), api.listMembers(pid), api.listTasks(pid)]);
    setProjectName(p.project.name);
    setMembers(m.members);
    setTasks(t.tasks);
  }

  useEffect(() => {
    if (!pid) return;
    load().catch((e) => setErr(e?.message ?? 'Failed to load project'));
  }, [pid]);

  async function addMember() {
    setErr(null);
    try {
      await api.addMember(pid, { email: inviteEmail.trim(), role: inviteRole });
      setInviteEmail('');
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to add member');
    }
  }

  async function createTask() {
    setErr(null);
    try {
      await api.createTask(pid, {
        title: newTitle.trim(),
        assigneeId: newAssigneeId ? newAssigneeId : null,
        dueDate: isoFromLocalInput(newDue),
      });
      setNewTitle('');
      setNewAssigneeId('');
      setNewDue('');
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create task');
    }
  }

  async function updateTask(taskId: string, patch: Partial<Pick<Task, 'status'>> & { assigneeId?: string | null }) {
    setErr(null);
    try {
      await api.updateTask(pid, taskId, patch as any);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to update task');
    }
  }

  async function deleteTask(taskId: string) {
    setErr(null);
    try {
      await api.deleteTask(pid, taskId);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete task');
    }
  }

  return (
    <Page title={projectName ? `Project: ${projectName}` : 'Project'}>
      {err && <Card className="mb-4 border-rose-500/30 bg-rose-500/10 text-rose-200">{err}</Card>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <div className="mb-2 text-sm font-bold">Team</div>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2">
                <div>
                  <div className="text-sm font-semibold">{m.user.name}</div>
                  <div className="text-xs text-slate-400">{m.user.email}</div>
                </div>
                <div className="text-xs font-semibold text-slate-300">{m.role}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-slate-800 pt-4">
            <div className="mb-2 text-sm font-bold">Add member (Admin only)</div>
            <Label>Email</Label>
            <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="member@email.com" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <Label>Role</Label>
                <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                  <option value="MEMBER">MEMBER</option>
                  <option value="ADMIN">ADMIN</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={addMember}>
                  Add
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="mb-2 text-sm font-bold">Create task</div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3">
                <Label>Title</Label>
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Task title" />
              </div>
              <div>
                <Label>Assignee</Label>
                <Select value={newAssigneeId} onChange={(e) => setNewAssigneeId(e.target.value)}>
                  {assigneeOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Due</Label>
                <Input type="datetime-local" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={createTask}>
                  Create
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="mb-3 text-sm font-bold">Tasks</div>
            {tasks.length === 0 ? (
              <div className="text-sm text-slate-400">No tasks yet.</div>
            ) : (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <div key={t.id} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold">{t.title}</div>
                        <div className="text-xs text-slate-400">
                          {t.assignee ? `Assigned to ${t.assignee.name}` : 'Unassigned'}
                          {t.dueDate ? ` • due ${new Date(t.dueDate).toLocaleString()}` : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select
                          value={t.status}
                          onChange={(e) => updateTask(t.id, { status: e.target.value as any })}
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="DONE">DONE</option>
                        </Select>
                        <Select
                          value={t.assignee?.id ?? ''}
                          onChange={(e) => updateTask(t.id, { assigneeId: e.target.value ? e.target.value : null })}
                        >
                          {assigneeOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                            </option>
                          ))}
                        </Select>
                        <Button variant="ghost" onClick={() => deleteTask(t.id)}>
                          Delete (Admin)
                        </Button>
                      </div>
                    </div>
                    {t.description && <div className="mt-2 text-sm text-slate-300">{t.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}


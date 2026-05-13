export type User = { id: string; name: string; email: string };

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  role?: 'ADMIN' | 'MEMBER';
};

export type Member = {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  user: User;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  dueDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignee?: User | null;
  createdBy?: User | null;
};

const defaultInit: RequestInit = {
  credentials: 'include',
  headers: { 'content-type': 'application/json' },
};

/** Clears legacy Bearer token storage from older builds (cookies are authoritative now). */
export function clearLegacyToken() {
  localStorage.removeItem('ttm_token');
}

function friendlyHttpError(status: number): string | null {
  if (status === 502 || status === 503 || status === 504) {
    return (
      'Cannot reach the API (server not responding). ' +
      'Start the backend from the project root with `npm run dev`, and ensure `server/.env` has DATABASE_URL and JWT_SECRET ' +
      'so the server stays up on port 3000.'
    );
  }
  return null;
}

function formatZodFlatten(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const fe = (err as { fieldErrors?: Record<string, string[] | undefined> }).fieldErrors;
  if (!fe) return null;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(fe)) {
    if (Array.isArray(v) && v[0]) parts.push(`${k}: ${v[0]}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

function parseErrorMessage(body: unknown, status: number): string {
  if (status === 429) return 'Too many requests. Please wait and try again.';
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>;
    if (typeof o.error === 'string') return o.error;
    const flat = formatZodFlatten(o.error);
    if (flat) return flat;
    if (typeof o.message === 'string') return o.message;
  }
  return friendlyHttpError(status) ?? `Request failed (${status})`;
}

async function tryRefreshSession(): Promise<boolean> {
  try {
    const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
    return r.ok;
  } catch {
    return false;
  }
}

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  clearLegacyToken();

  let res: Response;
  try {
    res = await fetch(path, {
      ...defaultInit,
      ...init,
      headers: { ...defaultInit.headers, ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error(
      'Network error: could not reach the server. Run `npm run dev` from the project root and open http://localhost:3000/api/health in a browser.',
    );
  }

  if (res.status === 401 && !retried && path !== '/api/auth/refresh' && path !== '/api/auth/login' && path !== '/api/auth/signup' && path !== '/api/auth/forgot-password' && path !== '/api/auth/reset-password') {
    const body = await res.clone().json().catch(() => null);
    const code = body && typeof body === 'object' ? (body as { code?: string }).code : undefined;
    if (code === 'ACCESS_EXPIRED') {
      const ok = await tryRefreshSession();
      if (ok) return request<T>(path, init, true);
    }
  }

  if (res.status === 204) return {} as T;

  const isJson = (res.headers.get('content-type') ?? '').includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
  if (!res.ok) {
    throw new Error(parseErrorMessage(body, res.status));
  }
  return body as T;
}

export const api = {
  signup: (input: { name: string; email: string; password: string }) =>
    request<{ user: User }>('/api/auth/signup', { method: 'POST', body: JSON.stringify(input) }),
  login: (input: { email: string; password: string }) =>
    request<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  me: () => request<{ user: User }>('/api/auth/me'),
  forgotPassword: (input: { email: string }) =>
    request<{ message: string; resetPath?: string; emailDispatched?: boolean }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  resetPassword: (input: { token: string; password: string }) =>
    request<{ user: User; message: string }>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify(input) }),

  listProjects: () => request<{ projects: Project[] }>('/api/projects'),
  createProject: (input: { name: string }) =>
    request<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(input) }),
  getProject: (projectId: string) => request<{ project: Project }>(`/api/projects/${projectId}`),

  listMembers: (projectId: string) => request<{ members: Member[] }>(`/api/projects/${projectId}/members`),
  addMember: (projectId: string, input: { email: string; role?: 'ADMIN' | 'MEMBER' }) =>
    request<{ membership: Member }>(`/api/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateMemberRole: (projectId: string, memberId: string, input: { role: 'ADMIN' | 'MEMBER' }) =>
    request<{ membership: Member }>(`/api/projects/${projectId}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  removeMember: (projectId: string, memberId: string) =>
    request<{ ok: true }>(`/api/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),

  listTasks: (projectId: string) => request<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`),
  createTask: (
    projectId: string,
    input: { title: string; description?: string; assigneeId?: string | null; dueDate?: string | null },
  ) =>
    request<{ task: Task }>(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(input) }),
  updateTask: (
    projectId: string,
    taskId: string,
    input: {
      title?: string;
      description?: string | null;
      assigneeId?: string | null;
      status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
      dueDate?: string | null;
    },
  ) =>
    request<{ task: Task }>(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  deleteTask: (projectId: string, taskId: string) =>
    request<{ ok: true }>(`/api/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),

  dashboard: () =>
    request<{
      counts: { total: number; TODO: number; IN_PROGRESS: number; DONE: number };
      overdue: Array<{ id: string; title: string; status: string; dueDate: string; project: { id: string; name: string } }>;
      tasks: any[];
    }>('/api/dashboard'),
};

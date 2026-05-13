import express from 'express';
import cors from 'cors';
import path from 'path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { prisma } from './prisma';
import { assertEnv, env } from './env';
import { asyncHandler, requireAuth, requireProjectRole, type AuthedRequest } from './middleware';
import {
  addMemberSchema,
  createProjectSchema,
  createTaskSchema,
  updateMemberRoleSchema,
  updateTaskSchema,
} from './validators';
import { ProjectRole, TaskStatus, type TaskStatus as TaskStatusType } from './constants';
import { registerAuthRoutes } from './routes/auth';

assertEnv();

const app = express();
if (env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(
  cors({
    origin: env.WEB_ORIGIN.trim(),
    credentials: true,
  }),
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

registerAuthRoutes(app);

// ---- Projects
app.get(
  '/api/projects',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.id;
    const projects = await prisma.project.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        createdAt: true,
        memberships: { where: { userId }, select: { role: true } },
      },
    });
    return res.json({
      projects: projects.map((p: (typeof projects)[number]) => ({
        ...p,
        role: p.memberships[0]?.role ?? ProjectRole.MEMBER,
      })),
    });
  }),
);

app.post(
  '/api/projects',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const userId = req.user!.id;

    const project = await prisma.project.create({
      data: {
        name: parsed.data.name,
        createdById: userId,
        memberships: { create: { userId, role: ProjectRole.ADMIN } },
      },
      select: { id: true, name: true, createdAt: true, updatedAt: true },
    });
    return res.status(201).json({ project });
  }),
);

app.get(
  '/api/projects/:projectId',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN, ProjectRole.MEMBER]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const projectId = req.params.projectId;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, createdAt: true, updatedAt: true, createdById: true },
    });
    if (!project) return res.status(404).json({ error: 'Not found' });
    return res.json({ project });
  }),
);

// ---- Members (Admin)
app.get(
  '/api/projects/:projectId/members',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN, ProjectRole.MEMBER]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const projectId = req.params.projectId;
    const members = await prisma.membership.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json({ members });
  }),
);

app.post(
  '/api/projects/:projectId/members',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const projectId = req.params.projectId;

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    try {
      const membership = await prisma.membership.create({
        data: {
          projectId,
          userId: user.id,
          role: parsed.data.role ?? ProjectRole.MEMBER,
        },
        select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
      });
      return res.status(201).json({ membership });
    } catch {
      return res.status(409).json({ error: 'User already in project' });
    }
  }),
);

app.patch(
  '/api/projects/:projectId/members/:memberId',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { projectId, memberId } = req.params;
    const membership = await prisma.membership.findUnique({ where: { id: memberId } });
    if (!membership || membership.projectId !== projectId) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.membership.update({
      where: { id: memberId },
      data: { role: parsed.data.role },
      select: { id: true, role: true, user: { select: { id: true, name: true, email: true } } },
    });
    return res.json({ membership: updated });
  }),
);

app.delete(
  '/api/projects/:projectId/members/:memberId',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const { projectId, memberId } = req.params;
    const membership = await prisma.membership.findUnique({ where: { id: memberId } });
    if (!membership || membership.projectId !== projectId) return res.status(404).json({ error: 'Not found' });
    await prisma.membership.delete({ where: { id: memberId } });
    return res.json({ ok: true });
  }),
);

// ---- Tasks
app.get(
  '/api/projects/:projectId/tasks',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN, ProjectRole.MEMBER]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const projectId = req.params.projectId;
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json({ tasks });
  }),
);

app.post(
  '/api/projects/:projectId/tasks',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN, ProjectRole.MEMBER]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const projectId = req.params.projectId;
    const userId = req.user!.id;

    const dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
    const task = await prisma.task.create({
      data: {
        projectId,
        createdById: userId,
        title: parsed.data.title,
        description: parsed.data.description,
        assigneeId: parsed.data.assigneeId ?? null,
        dueDate,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    return res.status(201).json({ task });
  }),
);

app.patch(
  '/api/projects/:projectId/tasks/:taskId',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN, ProjectRole.MEMBER]),
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = updateTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const { projectId, taskId } = req.params;
    const userId = req.user!.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.projectId !== projectId) return res.status(404).json({ error: 'Not found' });

    const role: ProjectRole | undefined = (req as any).projectRole;
    const canEdit =
      role === ProjectRole.ADMIN || task.createdById === userId || (task.assigneeId && task.assigneeId === userId);
    if (!canEdit) return res.status(403).json({ error: 'Forbidden' });

    const dueDate =
      parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description === undefined ? undefined : parsed.data.description,
        assigneeId: parsed.data.assigneeId === undefined ? undefined : parsed.data.assigneeId,
        status: parsed.data.status,
        dueDate,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json({ task: updated });
  }),
);

app.delete(
  '/api/projects/:projectId/tasks/:taskId',
  requireAuth,
  requireProjectRole([ProjectRole.ADMIN]),
  asyncHandler(async (_req: AuthedRequest, res) => {
    const { taskId } = _req.params;
    await prisma.task.delete({ where: { id: taskId } });
    return res.json({ ok: true });
  }),
);

// ---- Dashboard
app.get(
  '/api/dashboard',
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.user!.id;
    const now = new Date();

    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ assigneeId: userId }, { createdById: userId }],
        project: { memberships: { some: { userId } } },
      },
      orderBy: [{ dueDate: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        project: { select: { id: true, name: true } },
        assigneeId: true,
        createdById: true,
      },
    });

    const counts = tasks.reduce(
      (acc: Record<'total' | TaskStatusType, number>, t: (typeof tasks)[number]) => {
        acc.total += 1;
        const status = t.status as TaskStatusType;
        acc[status] += 1;
        return acc;
      },
      { total: 0, TODO: 0, IN_PROGRESS: 0, DONE: 0 } as Record<'total' | TaskStatusType, number>,
    );

    const overdue = tasks.filter(
      (t: (typeof tasks)[number]) => t.dueDate && t.dueDate < now && t.status !== TaskStatus.DONE,
    );

    return res.json({ counts, overdue, tasks });
  }),
);

// ---- Serve client in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ---- Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  // Prisma: table/column missing — migrations not applied
  if (err?.code === 'P2021') {
    return res.status(503).json({
      error:
        'Database tables are missing. Stop the server, then from the `server` folder run: npx prisma migrate deploy  (or: npx prisma migrate dev). Then start again with npm run dev.',
    });
  }
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (env.NODE_ENV !== 'production' && typeof err?.message === 'string') {
    return res.status(500).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(env.PORT, () => {
  console.log(`API listening on :${env.PORT}`);
});


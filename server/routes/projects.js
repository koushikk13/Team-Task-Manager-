import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/index.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { dateSchema, parseBody } from '../utils/validation.js';

const router = Router();

const projectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters.').max(100),
  description: z.string().trim().max(700).default(''),
  dueDate: dateSchema,
  status: z.enum(['active', 'paused', 'completed']).default('active')
});

const projectUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters.').max(100).optional(),
  description: z.string().trim().max(700).optional(),
  dueDate: dateSchema,
  status: z.enum(['active', 'paused', 'completed']).optional()
});

const memberSchema = z.object({
  userId: z.string().min(8),
  role: z.enum(['owner', 'collaborator']).default('collaborator')
});

const taskCreateSchema = z.object({
  title: z.string().trim().min(2, 'Task title must be at least 2 characters.').max(120),
  description: z.string().trim().max(900).default(''),
  assigneeId: z.string().min(8),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: dateSchema
});

async function requireProjectAccess(req, projectId) {
  const project = await store.getProjectById(projectId);
  if (!project) throw new ApiError(404, 'Project not found.');
  if (!(await store.canAccessProject(req.user, projectId))) {
    throw new ApiError(403, 'You do not have access to this project.');
  }
  return project;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projects = await store.listProjectsForUser(req.user);
    res.json({ projects });
  })
);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const body = parseBody(projectSchema, req.body);
    const project = await store.createProject({
      name: body.name,
      description: body.description,
      dueDate: body.dueDate || null,
      status: body.status,
      createdBy: req.user.id
    });
    res.status(201).json({ project });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const project = await requireProjectAccess(req, req.params.id);
    const members = await store.listProjectMembers(project.id);
    const tasks = await store.listTasksForUser(req.user, { projectId: project.id });
    res.json({ project, members, tasks });
  })
);

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const current = await store.getProjectById(req.params.id);
    if (!current) throw new ApiError(404, 'Project not found.');
    const body = parseBody(projectUpdateSchema, req.body);
    const patch = {
      name: body.name,
      description: body.description,
      due_date: body.dueDate === undefined ? undefined : body.dueDate,
      status: body.status
    };
    const project = await store.updateProject(req.params.id, patch);
    res.json({ project });
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deleted = await store.deleteProject(req.params.id);
    if (!deleted) throw new ApiError(404, 'Project not found.');
    res.status(204).send();
  })
);

router.get(
  '/:id/members',
  requireAuth,
  asyncHandler(async (req, res) => {
    const project = await requireProjectAccess(req, req.params.id);
    const members = await store.listProjectMembers(project.id);
    res.json({ members });
  })
);

router.post(
  '/:id/members',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const project = await store.getProjectById(req.params.id);
    if (!project) throw new ApiError(404, 'Project not found.');
    const body = parseBody(memberSchema, req.body);
    const user = await store.findUserById(body.userId);
    if (!user) throw new ApiError(404, 'User not found.');
    const members = await store.addProjectMember(project.id, user.id, body.role);
    res.status(201).json({ members });
  })
);

router.delete(
  '/:id/members/:userId',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const project = await store.getProjectById(req.params.id);
    if (!project) throw new ApiError(404, 'Project not found.');
    if (project.created_by === req.params.userId) {
      throw new ApiError(409, 'Project owner cannot be removed.');
    }
    await store.removeProjectMember(req.params.id, req.params.userId);
    res.status(204).send();
  })
);

router.get(
  '/:id/tasks',
  requireAuth,
  asyncHandler(async (req, res) => {
    const project = await requireProjectAccess(req, req.params.id);
    const tasks = await store.listTasksForUser(req.user, { projectId: project.id });
    res.json({ tasks });
  })
);

router.post(
  '/:id/tasks',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const project = await store.getProjectById(req.params.id);
    if (!project) throw new ApiError(404, 'Project not found.');
    const body = parseBody(taskCreateSchema, req.body);
    const user = await store.findUserById(body.assigneeId);
    if (!user) throw new ApiError(404, 'Assignee not found.');
    const task = await store.createTask({
      projectId: project.id,
      title: body.title,
      description: body.description,
      assigneeId: body.assigneeId,
      status: body.status,
      priority: body.priority,
      dueDate: body.dueDate || null,
      createdBy: req.user.id
    });
    res.status(201).json({ task });
  })
);

export default router;

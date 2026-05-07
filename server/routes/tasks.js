import { Router } from 'express';
import { z } from 'zod';
import { store } from '../db/index.js';
import { ApiError, asyncHandler } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { dateSchema, parseBody, parseQuery } from '../utils/validation.js';

const router = Router();

const taskQuerySchema = z.object({
  projectId: z.string().min(8).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  assigneeId: z.string().min(8).optional()
});

const adminTaskUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(900).optional(),
  assigneeId: z.string().min(8).optional(),
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: dateSchema
});

const memberTaskUpdateSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'review', 'done'])
});

function canAccessTask(user, task) {
  return user.role === 'admin' || task.assignee_id === user.id;
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = parseQuery(taskQuerySchema, req.query);
    const tasks = await store.listTasksForUser(req.user, filters);
    res.json({ tasks });
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await store.getTaskById(req.params.id);
    if (!task) throw new ApiError(404, 'Task not found.');
    if (!(await store.canAccessProject(req.user, task.project_id))) {
      throw new ApiError(403, 'You do not have access to this task.');
    }
    res.json({ task });
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const task = await store.getTaskById(req.params.id);
    if (!task) throw new ApiError(404, 'Task not found.');
    if (!canAccessTask(req.user, task)) {
      throw new ApiError(403, 'Members can only update tasks assigned to them.');
    }

    if (req.user.role === 'admin') {
      const body = parseBody(adminTaskUpdateSchema, req.body);
      if (body.assigneeId && !(await store.findUserById(body.assigneeId))) {
        throw new ApiError(404, 'Assignee not found.');
      }
      const updated = await store.updateTask(task.id, {
        title: body.title,
        description: body.description,
        assignee_id: body.assigneeId,
        status: body.status,
        priority: body.priority,
        due_date: body.dueDate === undefined ? undefined : body.dueDate
      });
      return res.json({ task: updated });
    }

    const body = parseBody(memberTaskUpdateSchema, req.body);
    const updated = await store.updateTask(task.id, { status: body.status });
    res.json({ task: updated });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.user.role !== 'admin') throw new ApiError(403, 'Admin access required.');
    const deleted = await store.deleteTask(req.params.id);
    if (!deleted) throw new ApiError(404, 'Task not found.');
    res.status(204).send();
  })
);

export default router;

import { Router } from 'express';
import { store } from '../db/index.js';
import { asyncHandler } from '../middleware/errors.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const today = () => new Date().toISOString().slice(0, 10);

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [projects, tasks] = await Promise.all([
      store.listProjectsForUser(req.user),
      store.listTasksForUser(req.user)
    ]);
    const currentDate = today();
    const openTasks = tasks.filter((task) => task.status !== 'done');
    const overdueTasks = openTasks.filter((task) => task.due_date && task.due_date < currentDate);
    const doneTasks = tasks.filter((task) => task.status === 'done');
    const myTasks = openTasks.filter((task) => task.assignee_id === req.user.id);

    res.json({
      summary: {
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => project.status === 'active').length,
        totalTasks: tasks.length,
        openTasks: openTasks.length,
        completedTasks: doneTasks.length,
        overdueTasks: overdueTasks.length,
        completionRate: tasks.length ? Math.round((doneTasks.length / tasks.length) * 100) : 0
      },
      statusCounts: countBy(tasks, 'status'),
      priorityCounts: countBy(tasks, 'priority'),
      overdueTasks: overdueTasks.slice(0, 6),
      myTasks: myTasks.slice(0, 8),
      recentTasks: [...tasks]
        .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
        .slice(0, 6),
      projects: projects.slice(0, 6)
    });
  })
);

export default router;

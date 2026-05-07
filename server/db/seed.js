import { hashPassword } from '../utils/password.js';

const day = 24 * 60 * 60 * 1000;
const dateFromNow = (days) => new Date(Date.now() + days * day).toISOString().slice(0, 10);

export async function seedDemoIfNeeded(store) {
  const shouldSeed =
    process.env.SEED_DEMO === 'true' || (store.kind === 'json' && process.env.SEED_DEMO !== 'false');
  if (!shouldSeed || (await store.countUsers()) > 0) return;

  const passwordHash = await hashPassword('password123');
  const admin = await store.createUser({
    name: 'Aarav Admin',
    email: 'admin@example.com',
    passwordHash,
    role: 'admin'
  });
  const member = await store.createUser({
    name: 'Maya Member',
    email: 'member@example.com',
    passwordHash,
    role: 'member'
  });
  const designer = await store.createUser({
    name: 'Riya Designer',
    email: 'riya@example.com',
    passwordHash,
    role: 'member'
  });

  const launch = await store.createProject({
    name: 'Product Launch Sprint',
    description: 'Coordinate release tasks, assets, testing, and the launch-day checklist.',
    dueDate: dateFromNow(12),
    status: 'active',
    createdBy: admin.id
  });
  const mobile = await store.createProject({
    name: 'Mobile App Refresh',
    description: 'Improve mobile screens, spacing, and task flow performance.',
    dueDate: dateFromNow(24),
    status: 'active',
    createdBy: admin.id
  });
  const ops = await store.createProject({
    name: 'Operations Cleanup',
    description: 'Close overdue work, document ownership, and simplify recurring reporting.',
    dueDate: dateFromNow(-2),
    status: 'paused',
    createdBy: admin.id
  });

  await store.addProjectMember(launch.id, member.id, 'collaborator');
  await store.addProjectMember(launch.id, designer.id, 'collaborator');
  await store.addProjectMember(mobile.id, designer.id, 'collaborator');
  await store.addProjectMember(ops.id, member.id, 'collaborator');

  await store.createTask({
    projectId: launch.id,
    title: 'Finalize landing page copy',
    description: 'Lock headline, value bullets, and launch CTA copy.',
    assigneeId: member.id,
    status: 'in_progress',
    priority: 'high',
    dueDate: dateFromNow(3),
    createdBy: admin.id
  });
  await store.createTask({
    projectId: launch.id,
    title: 'QA release checklist',
    description: 'Run smoke tests against auth, projects, tasks, and dashboard metrics.',
    assigneeId: admin.id,
    status: 'todo',
    priority: 'urgent',
    dueDate: dateFromNow(1),
    createdBy: admin.id
  });
  await store.createTask({
    projectId: launch.id,
    title: 'Prepare social visuals',
    description: 'Export final banners and handoff notes for launch posts.',
    assigneeId: designer.id,
    status: 'review',
    priority: 'medium',
    dueDate: dateFromNow(5),
    createdBy: admin.id
  });
  await store.createTask({
    projectId: mobile.id,
    title: 'Audit task card spacing',
    description: 'Check compact and expanded card states on small screens.',
    assigneeId: designer.id,
    status: 'in_progress',
    priority: 'medium',
    dueDate: dateFromNow(7),
    createdBy: admin.id
  });
  await store.createTask({
    projectId: mobile.id,
    title: 'Optimize dashboard queries',
    description: 'Review slow dashboard metrics and reduce repeated fetches.',
    assigneeId: member.id,
    status: 'todo',
    priority: 'high',
    dueDate: dateFromNow(9),
    createdBy: admin.id
  });
  await store.createTask({
    projectId: ops.id,
    title: 'Close archived project notes',
    description: 'Move loose notes into final project summaries.',
    assigneeId: member.id,
    status: 'todo',
    priority: 'low',
    dueDate: dateFromNow(-4),
    createdBy: admin.id
  });
}

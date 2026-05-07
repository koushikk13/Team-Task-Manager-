import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const now = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));

function publicTask(task, data) {
  const project = data.projects.find((item) => item.id === task.project_id);
  const assignee = data.users.find((item) => item.id === task.assignee_id);
  const creator = data.users.find((item) => item.id === task.created_by);
  return {
    ...task,
    project_name: project?.name || 'Unknown project',
    assignee_name: assignee?.name || 'Unassigned',
    creator_name: creator?.name || 'Unknown'
  };
}

function projectWithStats(project, data) {
  const tasks = data.tasks.filter((task) => task.project_id === project.id);
  const members = data.projectMembers.filter((member) => member.project_id === project.id);
  const creator = data.users.find((user) => user.id === project.created_by);
  return {
    ...project,
    creator_name: creator?.name || 'Unknown',
    member_count: members.length,
    task_count: tasks.length,
    done_count: tasks.filter((task) => task.status === 'done').length
  };
}

export class FileStore {
  constructor() {
    this.kind = 'json';
    this.file = path.join(process.cwd(), '.data', 'dev-db.json');
    this.data = {
      users: [],
      projects: [],
      projectMembers: [],
      tasks: []
    };
  }

  async init() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    try {
      const raw = await fs.readFile(this.file, 'utf8');
      this.data = JSON.parse(raw);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.save();
    }
  }

  async save() {
    await fs.writeFile(this.file, JSON.stringify(this.data, null, 2));
  }

  async countUsers() {
    return this.data.users.length;
  }

  async createUser({ name, email, passwordHash, role }) {
    const user = {
      id: randomUUID(),
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      created_at: now()
    };
    this.data.users.push(user);
    await this.save();
    return clone(user);
  }

  async findUserByEmail(email) {
    return clone(this.data.users.find((user) => user.email === email.toLowerCase()) || null);
  }

  async findUserById(id) {
    return clone(this.data.users.find((user) => user.id === id) || null);
  }

  async listUsers() {
    return clone(this.data.users.map(({ password_hash, ...user }) => user));
  }

  async createProject({ name, description, dueDate, status, createdBy }) {
    const project = {
      id: randomUUID(),
      name,
      description,
      due_date: dueDate || null,
      status,
      created_by: createdBy,
      created_at: now(),
      updated_at: now()
    };
    this.data.projects.push(project);
    this.data.projectMembers.push({
      project_id: project.id,
      user_id: createdBy,
      role: 'owner',
      joined_at: now()
    });
    await this.save();
    return clone(projectWithStats(project, this.data));
  }

  async updateProject(id, patch) {
    const project = this.data.projects.find((item) => item.id === id);
    if (!project) return null;
    Object.assign(project, patch, { updated_at: now() });
    await this.save();
    return clone(projectWithStats(project, this.data));
  }

  async deleteProject(id) {
    const existed = this.data.projects.some((project) => project.id === id);
    this.data.projects = this.data.projects.filter((project) => project.id !== id);
    this.data.projectMembers = this.data.projectMembers.filter((member) => member.project_id !== id);
    this.data.tasks = this.data.tasks.filter((task) => task.project_id !== id);
    await this.save();
    return existed;
  }

  async listProjectsForUser(user) {
    const visibleIds = await this.visibleProjectIds(user);
    return clone(
      this.data.projects
        .filter((project) => visibleIds.has(project.id))
        .map((project) => projectWithStats(project, this.data))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
  }

  async getProjectById(id) {
    const project = this.data.projects.find((item) => item.id === id);
    return clone(project ? projectWithStats(project, this.data) : null);
  }

  async canAccessProject(user, projectId) {
    if (user.role === 'admin') return true;
    return this.data.projectMembers.some(
      (member) => member.project_id === projectId && member.user_id === user.id
    ) || this.data.tasks.some((task) => task.project_id === projectId && task.assignee_id === user.id);
  }

  async visibleProjectIds(user) {
    if (user.role === 'admin') return new Set(this.data.projects.map((project) => project.id));
    const ids = new Set();
    this.data.projectMembers
      .filter((member) => member.user_id === user.id)
      .forEach((member) => ids.add(member.project_id));
    this.data.tasks
      .filter((task) => task.assignee_id === user.id)
      .forEach((task) => ids.add(task.project_id));
    return ids;
  }

  async listProjectMembers(projectId) {
    return clone(
      this.data.projectMembers
        .filter((member) => member.project_id === projectId)
        .map((member) => {
          const user = this.data.users.find((item) => item.id === member.user_id);
          return {
            ...member,
            name: user?.name || 'Unknown',
            email: user?.email || '',
            user_role: user?.role || 'member'
          };
        })
    );
  }

  async addProjectMember(projectId, userId, role = 'collaborator') {
    const existing = this.data.projectMembers.find(
      (member) => member.project_id === projectId && member.user_id === userId
    );
    if (existing) {
      existing.role = role;
    } else {
      this.data.projectMembers.push({
        project_id: projectId,
        user_id: userId,
        role,
        joined_at: now()
      });
    }
    await this.save();
    return this.listProjectMembers(projectId);
  }

  async removeProjectMember(projectId, userId) {
    const before = this.data.projectMembers.length;
    this.data.projectMembers = this.data.projectMembers.filter(
      (member) => !(member.project_id === projectId && member.user_id === userId)
    );
    await this.save();
    return before !== this.data.projectMembers.length;
  }

  async createTask({ projectId, title, description, assigneeId, status, priority, dueDate, createdBy }) {
    const task = {
      id: randomUUID(),
      project_id: projectId,
      title,
      description,
      assignee_id: assigneeId,
      status,
      priority,
      due_date: dueDate || null,
      created_by: createdBy,
      completed_at: status === 'done' ? now() : null,
      created_at: now(),
      updated_at: now()
    };
    this.data.tasks.push(task);
    if (!this.data.projectMembers.some((member) => member.project_id === projectId && member.user_id === assigneeId)) {
      this.data.projectMembers.push({
        project_id: projectId,
        user_id: assigneeId,
        role: 'collaborator',
        joined_at: now()
      });
    }
    await this.save();
    return clone(publicTask(task, this.data));
  }

  async listTasksForUser(user, filters = {}) {
    const visibleIds = await this.visibleProjectIds(user);
    let tasks = this.data.tasks.filter((task) => visibleIds.has(task.project_id));
    if (filters.projectId) tasks = tasks.filter((task) => task.project_id === filters.projectId);
    if (filters.status) tasks = tasks.filter((task) => task.status === filters.status);
    if (filters.assigneeId) tasks = tasks.filter((task) => task.assignee_id === filters.assigneeId);
    return clone(
      tasks
        .map((task) => publicTask(task, this.data))
        .sort((a, b) => {
          const aDate = a.due_date || '9999-12-31';
          const bDate = b.due_date || '9999-12-31';
          return aDate.localeCompare(bDate);
        })
    );
  }

  async getTaskById(id) {
    const task = this.data.tasks.find((item) => item.id === id);
    return clone(task ? publicTask(task, this.data) : null);
  }

  async updateTask(id, patch) {
    const task = this.data.tasks.find((item) => item.id === id);
    if (!task) return null;
    Object.assign(task, patch, { updated_at: now() });
    if (patch.status === 'done' && !task.completed_at) task.completed_at = now();
    if (patch.status && patch.status !== 'done') task.completed_at = null;
    if (patch.assignee_id) {
      await this.addProjectMember(task.project_id, patch.assignee_id, 'collaborator');
    }
    await this.save();
    return clone(publicTask(task, this.data));
  }

  async deleteTask(id) {
    const before = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((task) => task.id !== id);
    await this.save();
    return before !== this.data.tasks.length;
  }
}

import pg from 'pg';
import { randomUUID } from 'node:crypto';

const { Pool } = pg;

function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeProject(row) {
  if (!row) return null;
  return {
    ...row,
    due_date: dateOnly(row.due_date),
    member_count: Number(row.member_count || 0),
    task_count: Number(row.task_count || 0),
    done_count: Number(row.done_count || 0)
  };
}

function normalizeTask(row) {
  if (!row) return null;
  return {
    ...row,
    due_date: dateOnly(row.due_date)
  };
}

export class PostgresStore {
  constructor() {
    this.kind = 'postgres';
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
  }

  query(sql, params = []) {
    return this.pool.query(sql, params);
  }

  async init() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        due_date DATE,
        status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_members (
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'collaborator')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        assignee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        due_date DATE,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
      CREATE INDEX IF NOT EXISTS idx_members_user ON project_members(user_id);
    `);
  }

  async countUsers() {
    const { rows } = await this.query('SELECT COUNT(*)::int AS count FROM users');
    return rows[0].count;
  }

  async createUser({ name, email, passwordHash, role }) {
    const { rows } = await this.query(
      `INSERT INTO users (id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [randomUUID(), name, email.toLowerCase(), passwordHash, role]
    );
    return rows[0];
  }

  async findUserByEmail(email) {
    const { rows } = await this.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return rows[0] || null;
  }

  async findUserById(id) {
    const { rows } = await this.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  }

  async listUsers() {
    const { rows } = await this.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY name ASC'
    );
    return rows;
  }

  async createProject({ name, description, dueDate, status, createdBy }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const id = randomUUID();
      await client.query(
        `INSERT INTO projects (id, name, description, due_date, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, name, description, dueDate || null, status, createdBy]
      );
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [id, createdBy]
      );
      await client.query('COMMIT');
      return this.getProjectById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateProject(id, patch) {
    const columns = {
      name: 'name',
      description: 'description',
      due_date: 'due_date',
      status: 'status'
    };
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return this.getProjectById(id);

    const sets = entries.map(([key], index) => `${columns[key]} = $${index + 2}`);
    const values = entries.map(([, value]) => value);
    const { rowCount } = await this.query(
      `UPDATE projects
       SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, ...values]
    );
    return rowCount ? this.getProjectById(id) : null;
  }

  async deleteProject(id) {
    const { rowCount } = await this.query('DELETE FROM projects WHERE id = $1', [id]);
    return rowCount > 0;
  }

  async listProjectsForUser(user) {
    const visibility =
      user.role === 'admin'
        ? ''
        : `WHERE EXISTS (
             SELECT 1 FROM project_members pmv
             WHERE pmv.project_id = p.id AND pmv.user_id = $1
           )
           OR EXISTS (
             SELECT 1 FROM tasks tv
             WHERE tv.project_id = p.id AND tv.assignee_id = $1
           )`;
    const params = user.role === 'admin' ? [] : [user.id];
    const { rows } = await this.query(
      `SELECT p.*,
              u.name AS creator_name,
              COUNT(DISTINCT pm.user_id)::int AS member_count,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END)::int AS done_count
       FROM projects p
       JOIN users u ON u.id = p.created_by
       LEFT JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN tasks t ON t.project_id = p.id
       ${visibility}
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC`,
      params
    );
    return rows.map(normalizeProject);
  }

  async getProjectById(id) {
    const { rows } = await this.query(
      `SELECT p.*,
              u.name AS creator_name,
              COUNT(DISTINCT pm.user_id)::int AS member_count,
              COUNT(DISTINCT t.id)::int AS task_count,
              COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END)::int AS done_count
       FROM projects p
       JOIN users u ON u.id = p.created_by
       LEFT JOIN project_members pm ON pm.project_id = p.id
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.name`,
      [id]
    );
    return normalizeProject(rows[0]);
  }

  async canAccessProject(user, projectId) {
    if (user.role === 'admin') return true;
    const { rows } = await this.query(
      `SELECT EXISTS (
         SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2
       ) OR EXISTS (
         SELECT 1 FROM tasks WHERE project_id = $1 AND assignee_id = $2
       ) AS allowed`,
      [projectId, user.id]
    );
    return Boolean(rows[0]?.allowed);
  }

  async listProjectMembers(projectId) {
    const { rows } = await this.query(
      `SELECT pm.project_id,
              pm.user_id,
              pm.role,
              pm.joined_at,
              u.name,
              u.email,
              u.role AS user_role
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = $1
       ORDER BY pm.role DESC, u.name ASC`,
      [projectId]
    );
    return rows;
  }

  async addProjectMember(projectId, userId, role = 'collaborator') {
    await this.query(
      `INSERT INTO project_members (project_id, user_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [projectId, userId, role]
    );
    return this.listProjectMembers(projectId);
  }

  async removeProjectMember(projectId, userId) {
    const { rowCount } = await this.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    return rowCount > 0;
  }

  async createTask({ projectId, title, description, assigneeId, status, priority, dueDate, createdBy }) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const id = randomUUID();
      await client.query(
        `INSERT INTO tasks (
           id, project_id, title, description, assignee_id, status, priority, due_date, created_by, completed_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CASE WHEN $6 = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END)`,
        [id, projectId, title, description, assigneeId, status, priority, dueDate || null, createdBy]
      );
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ($1, $2, 'collaborator')
         ON CONFLICT (project_id, user_id) DO NOTHING`,
        [projectId, assigneeId]
      );
      await client.query('COMMIT');
      return this.getTaskById(id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listTasksForUser(user, filters = {}) {
    const params = [];
    const where = [];

    if (user.role !== 'admin') {
      params.push(user.id);
      where.push(`(
        EXISTS (
          SELECT 1 FROM project_members pmv
          WHERE pmv.project_id = t.project_id AND pmv.user_id = $${params.length}
        )
        OR t.assignee_id = $${params.length}
      )`);
    }

    if (filters.projectId) {
      params.push(filters.projectId);
      where.push(`t.project_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      where.push(`t.status = $${params.length}`);
    }
    if (filters.assigneeId) {
      params.push(filters.assigneeId);
      where.push(`t.assignee_id = $${params.length}`);
    }

    const { rows } = await this.query(
      `SELECT t.*,
              p.name AS project_name,
              assignee.name AS assignee_name,
              creator.name AS creator_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN users assignee ON assignee.id = t.assignee_id
       JOIN users creator ON creator.id = t.created_by
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY COALESCE(t.due_date, DATE '9999-12-31') ASC, t.created_at DESC`,
      params
    );
    return rows.map(normalizeTask);
  }

  async getTaskById(id) {
    const { rows } = await this.query(
      `SELECT t.*,
              p.name AS project_name,
              assignee.name AS assignee_name,
              creator.name AS creator_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       JOIN users assignee ON assignee.id = t.assignee_id
       JOIN users creator ON creator.id = t.created_by
       WHERE t.id = $1`,
      [id]
    );
    return normalizeTask(rows[0]);
  }

  async updateTask(id, patch) {
    const columns = {
      title: 'title',
      description: 'description',
      assignee_id: 'assignee_id',
      status: 'status',
      priority: 'priority',
      due_date: 'due_date'
    };
    const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
    if (entries.length === 0) return this.getTaskById(id);

    const sets = entries.map(([key], index) => `${columns[key]} = $${index + 2}`);
    const values = entries.map(([, value]) => value);
    if (patch.status === 'done') {
      sets.push('completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP)');
    } else if (patch.status && patch.status !== 'done') {
      sets.push('completed_at = NULL');
    }

    const { rowCount } = await this.query(
      `UPDATE tasks
       SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id, ...values]
    );
    if (!rowCount) return null;

    const task = await this.getTaskById(id);
    if (patch.assignee_id) await this.addProjectMember(task.project_id, patch.assignee_id, 'collaborator');
    return task;
  }

  async deleteTask(id) {
    const { rowCount } = await this.query('DELETE FROM tasks WHERE id = $1', [id]);
    return rowCount > 0;
  }
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit3,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';
import { apiRequest } from './lib/api.js';

const statusLabels = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done'
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

const projectStatusLabels = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed'
};

const today = () => new Date().toISOString().slice(0, 10);

function formatDate(value) {
  if (!value) return 'No due date';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function isOverdue(task) {
  return task.status !== 'done' && task.due_date && task.due_date < today();
}

function completion(project) {
  if (!project.task_count) return 0;
  return Math.round((project.done_count / project.task_count) * 100);
}

export default function App() {
  const auth = useAuth();
  if (auth.loading) return <Splash />;
  if (!auth.user) return <AuthScreen />;
  return <Workspace />;
}

function Splash() {
  return (
    <main className="splash">
      <div className="brand-mark">
        <CheckCircle2 size={28} />
      </div>
      <p>Loading workspace...</p>
    </main>
  );
}

function AuthScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: 'admin@example.com',
    password: 'password123',
    requestedRole: 'member',
    adminCode: ''
  });

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
      } else {
        await signup(form);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="brand-row">
          <div className="brand-mark">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <strong>TeamFlow</strong>
            <span>Task Manager</span>
          </div>
        </div>
        <div className="auth-preview">
          <div className="preview-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-grid">
            <div className="preview-card wide">
              <span>Launch Sprint</span>
              <strong>78%</strong>
              <div className="mini-bar">
                <i style={{ width: '78%' }} />
              </div>
            </div>
            <div className="preview-card">
              <span>Overdue</span>
              <strong>2</strong>
            </div>
            <div className="preview-card">
              <span>Review</span>
              <strong>5</strong>
            </div>
            <div className="preview-lane">
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div>
          <p className="eyebrow">Secure workspace</p>
          <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        </div>

        <div className="segmented">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
            Signup
          </button>
        </div>

        <form className="form-stack" onSubmit={submit}>
          {mode === 'signup' && (
            <label>
              Full name
              <input value={form.name} onChange={(event) => update('name', event.target.value)} />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
            />
          </label>
          {mode === 'signup' && (
            <>
              <label>
                Role
                <select
                  value={form.requestedRole}
                  onChange={(event) => update('requestedRole', event.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              {form.requestedRole === 'admin' && (
                <label>
                  Admin code
                  <input
                    value={form.adminCode}
                    onChange={(event) => update('adminCode', event.target.value)}
                  />
                </label>
              )}
            </>
          )}
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="demo-logins">
            <button
              type="button"
              onClick={() => {
                update('email', 'admin@example.com');
                update('password', 'password123');
              }}
            >
              Admin demo
            </button>
            <button
              type="button"
              onClick={() => {
                update('email', 'member@example.com');
                update('password', 'password123');
              }}
            >
              Member demo
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

function Workspace() {
  const { token, user, logout } = useAuth();
  const [view, setView] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectModal, setProjectModal] = useState(null);
  const [taskModal, setTaskModal] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const api = useCallback(
    (path, options) => apiRequest(path, options, token),
    [token]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, projectData, taskData, userData] = await Promise.all([
        api('/api/dashboard'),
        api('/api/projects'),
        api('/api/tasks'),
        user.role === 'admin' ? api('/api/users') : Promise.resolve({ users: [] })
      ]);
      setDashboard(dashboardData);
      setProjects(projectData.projects);
      setTasks(taskData.tasks);
      setUsers(userData.users);
    } catch (err) {
      setNotice(err.message);
    } finally {
      setLoading(false);
    }
  }, [api, user.role]);

  const loadProject = useCallback(
    async (projectId) => {
      const data = await api(`/api/projects/${projectId}`);
      setSelectedProject(data);
      setView('projects');
    },
    [api]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filteredTasks = useMemo(() => {
    const search = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesSearch =
        !search ||
        task.title.toLowerCase().includes(search) ||
        task.project_name.toLowerCase().includes(search) ||
        task.assignee_name.toLowerCase().includes(search);
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [query, statusFilter, tasks]);

  async function runAction(action, successMessage) {
    setNotice('');
    try {
      await action();
      await refresh();
      if (selectedProject?.project?.id) {
        await loadProject(selectedProject.project.id);
      }
      setNotice(successMessage);
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function changeTaskStatus(task, status) {
    await runAction(
      () => api(`/api/tasks/${task.id}`, { method: 'PATCH', body: { status } }),
      'Task status updated.'
    );
  }

  async function saveProject(payload, editingProject) {
    await runAction(
      () =>
        editingProject
          ? api(`/api/projects/${editingProject.id}`, { method: 'PATCH', body: payload })
          : api('/api/projects', { method: 'POST', body: payload }),
      editingProject ? 'Project updated.' : 'Project created.'
    );
    setProjectModal(null);
  }

  async function deleteProject(project) {
    if (!window.confirm(`Delete ${project.name}?`)) return;
    setNotice('');
    try {
      await api(`/api/projects/${project.id}`, { method: 'DELETE' });
      setSelectedProject(null);
      await refresh();
      setNotice('Project deleted.');
    } catch (err) {
      setNotice(err.message);
    }
  }

  async function saveTask(payload) {
    await runAction(
      () => api(`/api/projects/${payload.projectId}/tasks`, { method: 'POST', body: payload }),
      'Task created.'
    );
    setTaskModal(null);
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    await runAction(() => api(`/api/tasks/${task.id}`, { method: 'DELETE' }), 'Task deleted.');
  }

  async function addMember(projectId, payload) {
    await runAction(
      () => api(`/api/projects/${projectId}/members`, { method: 'POST', body: payload }),
      'Team member added.'
    );
  }

  async function removeMember(projectId, member) {
    await runAction(
      () => api(`/api/projects/${projectId}/members/${member.user_id}`, { method: 'DELETE' }),
      'Team member removed.'
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        setView={(next) => {
          setView(next);
          setMenuOpen(false);
        }}
        user={user}
        logout={logout}
        open={menuOpen}
      />

      <main className="workspace">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)} title="Menu">
            <Menu size={20} />
          </button>
          <div>
            <p className="eyebrow">{user.role === 'admin' ? 'Admin console' : 'Member workspace'}</p>
            <h1>{pageTitle(view)}</h1>
          </div>
          <div className="topbar-actions">
            <button className="soft-button" onClick={refresh} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </button>
            {user.role === 'admin' && (
              <button className="primary-button" onClick={() => setTaskModal({})}>
                <Plus size={17} />
                New task
              </button>
            )}
          </div>
        </header>

        {notice && (
          <div className="notice">
            <span>{notice}</span>
            <button onClick={() => setNotice('')} title="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        {loading && !dashboard ? (
          <Splash />
        ) : (
          <>
            {view === 'dashboard' && (
              <DashboardSection
                data={dashboard}
                onOpenProject={loadProject}
                onOpenTask={() => setView('tasks')}
              />
            )}
            {view === 'projects' && (
              <ProjectsSection
                projects={projects}
                selectedProject={selectedProject}
                users={users}
                currentUser={user}
                onOpenProject={loadProject}
                onCreateProject={() => setProjectModal({})}
                onEditProject={(project) => setProjectModal(project)}
                onDeleteProject={deleteProject}
                onCreateTask={(project) => setTaskModal({ projectId: project.id })}
                onTaskStatus={changeTaskStatus}
                onDeleteTask={deleteTask}
                onAddMember={addMember}
                onRemoveMember={removeMember}
              />
            )}
            {view === 'tasks' && (
              <TasksSection
                tasks={filteredTasks}
                allTasks={tasks}
                projects={projects}
                users={users}
                currentUser={user}
                query={query}
                setQuery={setQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onTaskStatus={changeTaskStatus}
                onCreateTask={() => setTaskModal({})}
                onDeleteTask={deleteTask}
              />
            )}
            {view === 'team' && (
              <TeamSection users={users} projects={projects} currentUser={user} />
            )}
          </>
        )}
      </main>

      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} title="Close menu" />}

      {projectModal && (
        <Modal title={projectModal.id ? 'Edit project' : 'New project'} onClose={() => setProjectModal(null)}>
          <ProjectForm project={projectModal.id ? projectModal : null} onSubmit={saveProject} />
        </Modal>
      )}

      {taskModal && (
        <Modal title="New task" onClose={() => setTaskModal(null)}>
          <TaskForm
            projects={projects}
            users={users}
            defaultProjectId={taskModal.projectId}
            onSubmit={saveTask}
          />
        </Modal>
      )}
    </div>
  );
}

function pageTitle(view) {
  return {
    dashboard: 'Dashboard',
    projects: 'Projects',
    tasks: 'Tasks',
    team: 'Team'
  }[view];
}

function Sidebar({ view, setView, user, logout, open }) {
  const items = [
    ['dashboard', LayoutDashboard, 'Dashboard'],
    ['projects', FolderKanban, 'Projects'],
    ['tasks', ClipboardList, 'Tasks'],
    ['team', Users, 'Team']
  ];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <strong>TeamFlow</strong>
          <span>Manager</span>
        </div>
      </div>

      <nav>
        {items.map(([id, Icon, label]) => {
          if (id === 'team' && user.role !== 'admin') return null;
          return (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-user">
        <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <strong>{user.name}</strong>
          <span>{user.role}</span>
        </div>
        <button className="icon-button" onClick={logout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

function DashboardSection({ data, onOpenProject, onOpenTask }) {
  const summary = data?.summary || {};
  const stats = [
    ['Active projects', summary.activeProjects || 0, FolderKanban, 'green'],
    ['Open tasks', summary.openTasks || 0, ClipboardList, 'blue'],
    ['Overdue', summary.overdueTasks || 0, AlertTriangle, 'orange'],
    ['Done', `${summary.completionRate || 0}%`, CheckCircle2, 'teal']
  ];

  return (
    <section className="page-stack">
      <div className="stats-grid">
        {stats.map(([label, value, Icon, tone]) => (
          <article className={`stat-card ${tone}`} key={label}>
            <Icon size={20} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Status</p>
              <h2>Task distribution</h2>
            </div>
            <BarChart3 size={20} />
          </div>
          <div className="status-bars">
            {Object.keys(statusLabels).map((status) => {
              const count = data?.statusCounts?.[status] || 0;
              const total = data?.summary?.totalTasks || 1;
              return (
                <div className="status-line" key={status}>
                  <div>
                    <StatusPill status={status} />
                    <span>{count}</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${Math.round((count / total) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Attention</p>
              <h2>Overdue tasks</h2>
            </div>
            <AlertTriangle size={20} />
          </div>
          <TaskMiniList tasks={data?.overdueTasks || []} onOpenTask={onOpenTask} />
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Projects</p>
            <h2>Current progress</h2>
          </div>
        </div>
        <div className="project-grid compact">
          {(data?.projects || []).map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={() => onOpenProject(project.id)} />
          ))}
        </div>
      </section>
    </section>
  );
}

function TaskMiniList({ tasks, onOpenTask }) {
  if (!tasks.length) return <EmptyState icon={CheckCircle2} title="Nothing overdue" />;
  return (
    <div className="mini-list">
      {tasks.map((task) => (
        <button key={task.id} onClick={onOpenTask}>
          <span>{task.title}</span>
          <small>{formatDate(task.due_date)}</small>
        </button>
      ))}
    </div>
  );
}

function ProjectsSection(props) {
  const {
    projects,
    selectedProject,
    users,
    currentUser,
    onOpenProject,
    onCreateProject,
    onEditProject,
    onDeleteProject,
    onCreateTask,
    onTaskStatus,
    onDeleteTask,
    onAddMember,
    onRemoveMember
  } = props;

  return (
    <section className="split-page">
      <div className="page-stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{projects.length} projects</p>
            <h2>Project board</h2>
          </div>
          {currentUser.role === 'admin' && (
            <button className="primary-button" onClick={onCreateProject}>
              <Plus size={17} />
              New project
            </button>
          )}
        </div>
        <div className="project-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onOpen={() => onOpenProject(project.id)} />
          ))}
        </div>
      </div>

      <ProjectDetail
        selectedProject={selectedProject}
        users={users}
        currentUser={currentUser}
        onEditProject={onEditProject}
        onDeleteProject={onDeleteProject}
        onCreateTask={onCreateTask}
        onTaskStatus={onTaskStatus}
        onDeleteTask={onDeleteTask}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
      />
    </section>
  );
}

function ProjectCard({ project, onOpen }) {
  const percent = completion(project);
  return (
    <button className="project-card" onClick={onOpen}>
      <div className="project-card-top">
        <StatusDot status={project.status} />
        <span>{projectStatusLabels[project.status]}</span>
      </div>
      <h3>{project.name}</h3>
      <p>{project.description || 'No description'}</p>
      <div className="project-meta">
        <span>
          <Users size={15} />
          {project.member_count}
        </span>
        <span>
          <ClipboardList size={15} />
          {project.task_count}
        </span>
        <span>
          <Calendar size={15} />
          {formatDate(project.due_date)}
        </span>
      </div>
      <div className="progress-row">
        <div className="bar">
          <i style={{ width: `${percent}%` }} />
        </div>
        <strong>{percent}%</strong>
      </div>
    </button>
  );
}

function ProjectDetail(props) {
  const {
    selectedProject,
    users,
    currentUser,
    onEditProject,
    onDeleteProject,
    onCreateTask,
    onTaskStatus,
    onDeleteTask,
    onAddMember,
    onRemoveMember
  } = props;

  if (!selectedProject) {
    return (
      <aside className="detail-panel">
        <EmptyState icon={FolderKanban} title="Select a project" />
      </aside>
    );
  }

  const { project, members, tasks } = selectedProject;

  return (
    <aside className="detail-panel">
      <div className="detail-header">
        <div>
          <p className="eyebrow">{projectStatusLabels[project.status]}</p>
          <h2>{project.name}</h2>
        </div>
        {currentUser.role === 'admin' && (
          <div className="icon-row">
            <button className="icon-button" title="Edit project" onClick={() => onEditProject(project)}>
              <Edit3 size={17} />
            </button>
            <button className="icon-button danger" title="Delete project" onClick={() => onDeleteProject(project)}>
              <Trash2 size={17} />
            </button>
          </div>
        )}
      </div>
      <p className="detail-copy">{project.description}</p>
      <div className="detail-metrics">
        <span>{completion(project)}% done</span>
        <span>{members.length} members</span>
        <span>{formatDate(project.due_date)}</span>
      </div>

      <div className="detail-section">
        <div className="section-heading small">
          <h3>Team</h3>
          {currentUser.role === 'admin' && <UserPlus size={18} />}
        </div>
        <div className="member-list">
          {members.map((member) => (
            <div className="member-row" key={member.user_id}>
              <div className="avatar">{member.name.slice(0, 1).toUpperCase()}</div>
              <div>
                <strong>{member.name}</strong>
                <span>{member.email}</span>
              </div>
              <small>{member.role}</small>
              {currentUser.role === 'admin' && member.role !== 'owner' && (
                <button
                  className="icon-button danger"
                  title="Remove member"
                  onClick={() => onRemoveMember(project.id, member)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
        {currentUser.role === 'admin' && (
          <MemberForm
            users={users}
            members={members}
            onSubmit={(payload) => onAddMember(project.id, payload)}
          />
        )}
      </div>

      <div className="detail-section">
        <div className="section-heading small">
          <h3>Tasks</h3>
          {currentUser.role === 'admin' && (
            <button className="soft-button" onClick={() => onCreateTask(project)}>
              <Plus size={16} />
              Task
            </button>
          )}
        </div>
        <div className="task-stack">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              currentUser={currentUser}
              onStatus={onTaskStatus}
              onDelete={onDeleteTask}
            />
          ))}
          {!tasks.length && <EmptyState icon={ClipboardList} title="No tasks yet" />}
        </div>
      </div>
    </aside>
  );
}

function TasksSection(props) {
  const {
    tasks,
    allTasks,
    projects,
    currentUser,
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    onTaskStatus,
    onCreateTask,
    onDeleteTask
  } = props;

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{allTasks.length} tasks</p>
          <h2>Task command center</h2>
        </div>
        {currentUser.role === 'admin' && (
          <button className="primary-button" onClick={onCreateTask}>
            <Plus size={17} />
            New task
          </button>
        )}
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="task-board">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            currentUser={currentUser}
            projects={projects}
            onStatus={onTaskStatus}
            onDelete={onDeleteTask}
          />
        ))}
        {!tasks.length && <EmptyState icon={ClipboardList} title="No matching tasks" />}
      </div>
    </section>
  );
}

function TaskItem({ task, currentUser, onStatus, onDelete }) {
  const canEditStatus = currentUser.role === 'admin' || task.assignee_id === currentUser.id;
  return (
    <article className={`task-item ${isOverdue(task) ? 'overdue' : ''}`}>
      <div className="task-main">
        <div>
          <h3>{task.title}</h3>
          <p>{task.description || task.project_name}</p>
        </div>
        <div className="task-badges">
          <StatusPill status={task.status} />
          <PriorityPill priority={task.priority} />
        </div>
      </div>
      <div className="task-meta">
        <span>
          <FolderKanban size={15} />
          {task.project_name}
        </span>
        <span>
          <Users size={15} />
          {task.assignee_name}
        </span>
        <span>
          <Calendar size={15} />
          {formatDate(task.due_date)}
        </span>
      </div>
      <div className="task-actions">
        {canEditStatus && (
          <select value={task.status} onChange={(event) => onStatus(task, event.target.value)}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        )}
        {currentUser.role === 'admin' && (
          <button className="icon-button danger" onClick={() => onDelete(task)} title="Delete task">
            <Trash2 size={17} />
          </button>
        )}
      </div>
    </article>
  );
}

function TeamSection({ users, projects, currentUser }) {
  if (currentUser.role !== 'admin') {
    return <EmptyState icon={ShieldCheck} title="Admin access required" />;
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{users.length} people</p>
          <h2>Team directory</h2>
        </div>
      </div>
      <div className="people-grid">
        {users.map((person) => (
          <article className="person-card" key={person.id}>
            <div className="avatar large">{person.name.slice(0, 1).toUpperCase()}</div>
            <div>
              <h3>{person.name}</h3>
              <p>{person.email}</p>
            </div>
            <span className={`role-chip ${person.role}`}>{person.role}</span>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workspace</p>
            <h2>Project ownership</h2>
          </div>
          <Activity size={20} />
        </div>
        <div className="ownership-list">
          {projects.map((project) => (
            <div key={project.id}>
              <span>{project.name}</span>
              <strong>{project.member_count} members</strong>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function ProjectForm({ project, onSubmit }) {
  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    dueDate: project?.due_date || '',
    status: project?.status || 'active'
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...form, dueDate: form.dueDate || null }, project);
      }}
    >
      <label>
        Project name
        <input value={form.name} onChange={(event) => update('name', event.target.value)} required />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => update('description', event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          Due date
          <input type="date" value={form.dueDate || ''} onChange={(event) => update('dueDate', event.target.value)} />
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => update('status', event.target.value)}>
            {Object.entries(projectStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="primary-button">{project ? 'Save project' : 'Create project'}</button>
    </form>
  );
}

function TaskForm({ projects, users, defaultProjectId, onSubmit }) {
  const [form, setForm] = useState({
    projectId: defaultProjectId || projects[0]?.id || '',
    title: '',
    description: '',
    assigneeId: users[0]?.id || '',
    status: 'todo',
    priority: 'medium',
    dueDate: ''
  });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ ...form, dueDate: form.dueDate || null });
      }}
    >
      <label>
        Project
        <select value={form.projectId} onChange={(event) => update('projectId', event.target.value)} required>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input value={form.title} onChange={(event) => update('title', event.target.value)} required />
      </label>
      <label>
        Description
        <textarea value={form.description} onChange={(event) => update('description', event.target.value)} />
      </label>
      <div className="form-grid">
        <label>
          Assignee
          <select value={form.assigneeId} onChange={(event) => update('assigneeId', event.target.value)} required>
            {users.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Due date
          <input type="date" value={form.dueDate} onChange={(event) => update('dueDate', event.target.value)} />
        </label>
      </div>
      <div className="form-grid">
        <label>
          Status
          <select value={form.status} onChange={(event) => update('status', event.target.value)}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={form.priority} onChange={(event) => update('priority', event.target.value)}>
            {Object.entries(priorityLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="primary-button" disabled={!projects.length || !users.length}>
        Create task
      </button>
    </form>
  );
}

function MemberForm({ users, members, onSubmit }) {
  const available = users.filter((user) => !members.some((member) => member.user_id === user.id));
  const [form, setForm] = useState({
    userId: available[0]?.id || '',
    role: 'collaborator'
  });

  if (!available.length) return null;

  return (
    <form
      className="member-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
    >
      <select value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}>
        {available.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <button className="soft-button">
        <UserPlus size={16} />
        Add
      </button>
    </form>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  return <span className={`pill status-${status}`}>{statusLabels[status]}</span>;
}

function PriorityPill({ priority }) {
  return <span className={`pill priority-${priority}`}>{priorityLabels[priority]}</span>;
}

function StatusDot({ status }) {
  return <i className={`status-dot ${status}`} />;
}

function EmptyState({ icon: Icon, title }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <strong>{title}</strong>
    </div>
  );
}

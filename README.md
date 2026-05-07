<<<<<<< HEAD
# TeamFlow - Team Task Manager

A full-stack team task manager with authentication, project management, task assignment, progress tracking, dashboard analytics, and Admin/Member role-based access.

## Live Submission

- Live URL: add your Railway URL after deployment
- GitHub repo: add your repository URL after pushing
- Demo video: record a 2-5 minute walkthrough after deployment

## Demo Login

Local development seeds demo data automatically.

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `password123` |
| Member | `member@example.com` | `password123` |

## Features

- Signup and login with JWT authentication
- First registered user becomes Admin
- Admin signup after that requires `ADMIN_SIGNUP_CODE`
- Admin can create/update/delete projects
- Admin can add/remove project team members
- Admin can create, assign, update, and delete tasks
- Members can view their assigned projects/tasks
- Members can update status for their own tasks
- Dashboard shows project count, task status, completion rate, and overdue work
- REST API with validation, relationships, and role checks
- Railway-ready production setup with PostgreSQL
- Local development fallback database in `.data/dev-db.json`

## Tech Stack

- Frontend: React, Vite, Lucide icons, CSS
- Backend: Node.js, Express
- Auth: JWT, bcryptjs
- Validation: Zod
- Production database: PostgreSQL through Railway `DATABASE_URL`
- Local database: JSON fallback for instant demos

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://localhost:5173
```

The Express API runs on `http://localhost:5000` during development.

## Railway Deployment

1. Push this project to GitHub.
2. Create a new Railway project from the GitHub repo.
3. Add a PostgreSQL database in Railway.
4. Add these environment variables to the web service:

```env
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_SIGNUP_CODE=make-me-admin
SEED_DEMO=true
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

5. Deploy. Railway will run:

```bash
npm install && npm run build
npm start
```

6. Visit `/api/health` on the Railway domain to confirm the API is live.

## REST API

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Dashboard

- `GET /api/dashboard`

### Projects

- `GET /api/projects`
- `POST /api/projects` Admin
- `GET /api/projects/:id`
- `PATCH /api/projects/:id` Admin
- `DELETE /api/projects/:id` Admin
- `GET /api/projects/:id/members`
- `POST /api/projects/:id/members` Admin
- `DELETE /api/projects/:id/members/:userId` Admin
- `GET /api/projects/:id/tasks`
- `POST /api/projects/:id/tasks` Admin

### Tasks

- `GET /api/tasks`
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id` Admin

### Users

- `GET /api/users` Admin

## Demo Video Checklist

1. Login as Admin.
2. Show dashboard metrics, overdue tasks, and project progress.
3. Create a project.
4. Add a team member.
5. Create and assign a task.
6. Login as Member and update assigned task status.
7. Refresh dashboard to show progress changes.
=======
# Team-Task-Manager-
>>>>>>> 08317b8b6ddbbfd62612063725781db6500de276

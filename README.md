# TeamFlow – Team Task Manager

A full-stack team collaboration and task management platform built using React, Node.js, Express, and PostgreSQL. The application enables teams to manage projects, assign tasks, track progress, and collaborate efficiently with secure authentication and role-based access control.

---

## Features

- JWT Authentication & Authorization
- Admin and Member Role Management
- Project Creation & Team Collaboration
- Task Assignment & Progress Tracking
- Dashboard Analytics & KPIs
- Overdue Task Monitoring
- Secure REST APIs
- Responsive Modern UI
- Railway Deployment Ready

---

## Tech Stack

### Frontend
- React.js
- Vite
- CSS
- Lucide React Icons

### Backend
- Node.js
- Express.js

### Database
- PostgreSQL
- Railway Database

### Authentication & Validation
- JWT Authentication
- bcryptjs
- Zod Validation

---

## Project Modules

### Authentication
- User Signup/Login
- JWT-based Session Management
- Protected Routes
- Role-based Access

### Project Management
- Create, Update, Delete Projects
- Add/Remove Team Members
- Project Progress Tracking

### Task Management
- Assign Tasks to Team Members
- Update Task Status
- Track Pending and Completed Tasks
- Overdue Task Identification

### Dashboard Analytics
- Total Projects
- Task Completion Metrics
- Productivity Insights
- Status-based Task Analysis

---

## Demo Credentials

### Admin Access
Email: `admin@example.com`  
Password: `password123`

### Member Access
Email: `member@example.com`  
Password: `password123`

---

## Installation & Setup

### Clone Repository

```bash
git clone https://github.com/koushikk13/Team-Task-Manager-.git
```

### Navigate to Project

```bash
cd Team-Task-Manager-
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file:

```env
JWT_SECRET=your_secret_key
ADMIN_SIGNUP_CODE=make-me-admin
DATABASE_URL=your_database_url
```

### Run Development Server

```bash
npm run dev
```

Frontend:
```text
http://localhost:5173
```

Backend API:
```text
http://localhost:5000
```

---

## Railway Deployment

1. Push project to GitHub
2. Create Railway Project
3. Connect GitHub Repository
4. Add PostgreSQL Database
5. Configure Environment Variables
6. Deploy Application

---

## API Endpoints

### Authentication
- POST `/api/auth/signup`
- POST `/api/auth/login`
- GET `/api/auth/me`

### Projects
- GET `/api/projects`
- POST `/api/projects`
- PATCH `/api/projects/:id`
- DELETE `/api/projects/:id`

### Tasks
- GET `/api/tasks`
- POST `/api/tasks`
- PATCH `/api/tasks/:id`
- DELETE `/api/tasks/:id`

### Dashboard
- GET `/api/dashboard`

---

## Future Improvements

- Real-time Notifications
- Team Chat Integration
- File Upload Support
- Email Notifications
- Activity Logs
- Dark Mode UI

---

## Author

Koushik Reddy

- GitHub: https://github.com/koushikk13
- LinkedIn: Add your LinkedIn URL

---

## License

This project is developed for learning, portfolio, and internship demonstration purposes.

# TeamFlow – Team Task Manager

A full-stack team collaboration and task management platform built using React, Node.js, Express, and PostgreSQL. The application enables teams to manage projects, assign tasks, track progress, and collaborate efficiently with secure authentication and role-based access control.

---

## Live Application

Live URL:
https://team-task-manager-production-a328.up.railway.app

GitHub Repository:
https://github.com/koushikk13/Team-Task-Manager-

---

## Features

* User Signup & Login Authentication
* JWT-based Secure Authentication
* Admin & Member Role-Based Access
* Project Creation & Management
* Team Member Management
* Task Creation & Assignment
* Task Status Tracking
* Dashboard Analytics
* Overdue Task Monitoring
* REST API Architecture
* Railway Deployment with PostgreSQL

---

## Tech Stack

### Frontend

* React.js
* Vite
* CSS
* Lucide React Icons

### Backend

* Node.js
* Express.js

### Database

* PostgreSQL
* Railway Database

### Authentication & Validation

* JWT Authentication
* bcryptjs
* Zod Validation

---

## Demo Credentials

### Admin Access

Email: [admin@example.com](mailto:admin@example.com)
Password: password123

### Member Access

Email: [member@example.com](mailto:member@example.com)
Password: password123

---

## Project Modules

### Authentication

* User Signup/Login
* Protected Routes
* JWT Authentication
* Role Authorization

### Project Management

* Create, Update, Delete Projects
* Add & Remove Team Members
* Project Progress Tracking

### Task Management

* Create Tasks
* Assign Tasks
* Update Task Status
* Delete Tasks
* Overdue Detection

### Dashboard

* Project Statistics
* Task Status Overview
* Completion Metrics
* Productivity Insights

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

Create a `.env` file and add:

```env
JWT_SECRET=your_secret_key
ADMIN_SIGNUP_CODE=make-me-admin
DATABASE_URL=your_database_url
SEED_DEMO=true
```

### Run Development Server

```bash
npm run dev
```

Frontend:
http://localhost:5173

Backend:
http://localhost:5000

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

* POST /api/auth/signup
* POST /api/auth/login
* GET /api/auth/me

### Projects

* GET /api/projects
* POST /api/projects
* PATCH /api/projects/:id
* DELETE /api/projects/:id

### Tasks

* GET /api/tasks
* POST /api/tasks
* PATCH /api/tasks/:id
* DELETE /api/tasks/:id

### Dashboard

* GET /api/dashboard

---

## Future Improvements

* Real-time Notifications
* Team Chat System
* File Upload Support
* Email Notifications
* Activity Logs
* Dark Mode

---

## Author

Koushik Reddy

GitHub:
https://github.com/koushikk13

---

## License

This project is developed for educational, portfolio, and internship assessment purposes.

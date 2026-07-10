# Smart Academy Management System

Smart Academy Management System is a full-stack institute management platform for academy operations, public website content, inquiries, visitors, admissions, fees, attendance, exams, materials, reports, and student/faculty workflows.

## Project Structure

```text
smart-academy-management-system/
+-- backend/      # Express API, MongoDB models, routes, controllers, uploads, scripts
+-- frontend/     # Vite React app for public website, admin panel, student portal
+-- package.json  # Root scripts for running frontend and backend together
+-- README.md
```

## Tech Stack

- Frontend: React 19, Vite, Redux Toolkit, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, MongoDB, Mongoose, JWT auth, Multer, Cloudinary
- Tooling: Nodemon, Concurrently, ESLint, Vite build

## Quick Start

Install dependencies for the root, frontend, and backend:

```bash
npm run install-all
```

Create environment files:

```bash
frontend/.env
backend/.env
```

Start both apps together from the project root:

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000/api`

## Useful Scripts

```bash
npm run dev       # Start backend and frontend together
npm run server    # Start backend only
npm run client    # Start frontend only
npm run build     # Build frontend production bundle
```

## Environment

Frontend uses `VITE_API_URL`, usually:

```env
VITE_API_URL=http://localhost:5000/api
```

Backend requires at minimum:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/education_erp
JWT_SECRET=change_this_secret
```

Cloudinary and SMS variables are optional unless those features are enabled.

## Documentation

- Frontend setup: [`frontend/README.md`](frontend/README.md)
- Backend setup: [`backend/README.md`](backend/README.md)

## Notes

Do not commit `.env`, logs, database dumps, generated builds, or temporary repair scripts. Keep feature work inside `frontend/` and `backend/` unless a root script or project-level document is intentionally being changed.

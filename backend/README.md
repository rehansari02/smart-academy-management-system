# Smart Academy Backend

This is the Express and MongoDB backend for Smart Academy Management System. It provides APIs for authentication, users, branches, employees, inquiries, visitors, admissions, fees, attendance, exams, materials, reports, website content, uploads, and student portal features.

## Tech Stack

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT authentication
- Multer and Cloudinary uploads
- Winston and Morgan logging
- XLSX import/export utilities
- Nodemon for development

## Setup

Install dependencies:

```bash
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/education_erp
JWT_SECRET=change_this_secret
NODE_ENV=development
```

Optional feature variables:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMS_USERNAME=
SMS_PASSWORD=
SMS_SENDER_ID=SMINT
```

## Development

```bash
npm run dev
```

API base URL:

```text
http://localhost:5000/api
```

## Production Start

```bash
npm start
```

## Important Folders

```text
backend/
+-- config/        # Database and logger setup
+-- controllers/   # Request handlers and business workflows
+-- middlewares/   # Auth, error handling, uploads
+-- models/        # Mongoose schemas
+-- routes/        # Express route definitions
+-- scripts/       # One-time maintenance and seed scripts
+-- utils/         # Shared backend utilities
+-- server.js      # Express app entry point
```

## API Conventions

- Most routes are mounted under `/api` from `server.js`.
- Protected routes should use auth middleware and branch/role checks.
- Keep branch-scoped data isolated unless the user is Super Admin or the route explicitly supports global access.
- Avoid returning deleted records unless a route is explicitly built for recovery/audit behavior.

## Maintenance Scripts

Scripts in `backend/scripts` are for controlled data repair, import, and seeding. Run them only after checking the target database in `.env`.

Example:

```bash
node scripts/seedFinalExamQuestionPapers.js
```

## Notes

- Do not commit `.env`, logs, database dumps, or ad-hoc repair files.
- Run `node --check server.js` or `node --check controllers/<file>.js` after risky backend edits.
- Restart the backend after controller, route, middleware, or model changes if Nodemon is not running.

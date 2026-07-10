# Smart Academy Frontend

This is the Vite React frontend for Smart Academy Management System. It contains the public website, admin dashboard, transaction screens, master setup, reports, student portal, and faculty workflows.

## Tech Stack

- React 19
- Vite
- Redux Toolkit
- React Router
- Tailwind CSS
- Axios
- Lucide React
- Chart.js, Recharts
- SweetAlert2, React Toastify

## Setup

Install dependencies:

```bash
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_IMAGE_URL=http://localhost:5000
```

`VITE_IMAGE_URL` is only needed for screens that load image paths separately from the API base.

## Development

```bash
npm run dev
```

Local URL:

```text
http://localhost:5173
```

## Production Build

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Important Folders

```text
src/
+-- components/   # Shared UI and feature components
+-- context/      # App context providers
+-- features/     # Redux slices by domain
+-- pages/        # Public, admin, and student pages
+-- services/     # API service helpers
+-- utils/        # Shared formatting, permissions, date, media helpers
```

## API Integration

All API calls should use `import.meta.env.VITE_API_URL`. Keep endpoint-specific logic in `src/services` or Redux slices when possible, and keep page components focused on UI state and workflows.

## Notes

- Do not commit `dist/`, `.env`, or generated debug files.
- Keep public website typography and layout consistent with existing components.
- After changing shared forms, transaction pages, or service helpers, run `npm run build` before handing off.

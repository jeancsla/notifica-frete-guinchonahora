# Front-end Dashboard

This UI is built with Next.js pages and a bold, high-contrast visual direction.
All data is read-only and loaded from the existing API endpoints.

## Routes
- `/` Overview
- `/dashboard` Dashboard (notified=false, prioritized)
- `/table` Table View (full list)
- `/details` Details (select a carga to inspect)
- `/status` Status (backend/database health)
- `/settings` Settings (read-only status)
- `/profile` Profile details
- `/activity` Activity timeline

## API Usage
- `GET /api/v1/cargas?limit=...&offset=...` for table and details
- `GET /api/v1/cargas?notified=false&limit=...&offset=...` for dashboard priority queue
- `GET /api/v1/status` for backend health

## UX Notes
- No input forms.
- Every data view has an `Atualizar` button to refresh from the API.
- Layout uses bold typography, high-contrast cards, and gradient background.

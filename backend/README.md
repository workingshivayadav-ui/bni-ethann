# Backend (Express + MongoDB + Cloudinary)

## Quick start

1. Install dependencies from the repo root:

```bash
npm install
```

2. Copy `.env.example` to `.env` in the repo root (optional — defaults to `http://localhost:4000`).

3. Edit `backend/config/.env` with your MongoDB URI and Cloudinary keys.
   If MongoDB is unavailable, the backend falls back to in-memory storage.

4. Start both frontend and backend together:

```bash
npm run dev:all
```

Or run them separately in two terminals:

```bash
npm run start:backend   # Express on port 4000
npm run dev             # TanStack Start frontend (Vite proxies /api/members → backend)
```

## Endpoints

- `GET /_health` — health check
- `GET /api/members` — list members
- `POST /api/members` — create member (JSON payload matching frontend form)
- `DELETE /api/members/:id` — delete member

## Frontend integration

The frontend calls `/api/members` via a shared API client (`src/lib/api/client.ts`):

- **Browser (dev):** Vite proxies `/api/members` to `http://localhost:4000`
- **SSR:** Uses `API_URL` env var (default `http://localhost:4000`)
- **Production:** Set `API_URL` and optionally `VITE_API_URL` to your deployed backend URL

Member responses are normalized to use `id` and `photoDataUrl` fields expected by the UI.

## Notes

- The backend accepts `photoDataUrl` and `attachments` as base64 data URLs and uploads them to Cloudinary.
- Env is loaded from `backend/config/.env` (not `backend/.env`).

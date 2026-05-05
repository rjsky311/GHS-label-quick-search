# GHS Label Quick Search Frontend

React 19 + Vite 6 frontend for the GHS Label Quick Search workspace.

## Scripts

Run from `frontend/`.

```bash
npm ci
npm run dev
npm test -- --runInBand
npm run build
npm run preview
```

## Local Development

Vite serves the app at [http://localhost:5173](http://localhost:5173) by default.

Create `frontend/.env` from `frontend/.env.example` when you need to point the frontend at a backend:

```bash
VITE_BACKEND_URL=http://localhost:8001
```

The frontend calls `${VITE_BACKEND_URL}/api`.

Print templates, recent print jobs, prepared workflow state, and lab profile
settings are local-only by default. Keep `VITE_ENABLE_WORKSPACE_SYNC=false` for
public builds. Setting it to `true` makes the frontend try the admin-gated
`/api/workspace/*` endpoints with the current pilot admin session key.

## Build Notes

- Do not use CRA, CRACO, `react-scripts`, or `REACT_APP_*` variables for new work.
- `@` resolves to `frontend/src` through `vite.config.js` and Jest module mapping.
- CI runs `npm ci`, `npm test -- --runInBand`, and `npm run build`.
- Production deploy uses Zeabur with the repo frontend Dockerfile / `zeabur.yaml`.

Quick Docker compose for SCEAP (frontend + backend)

Prerequisites
- Docker & docker-compose installed

Build and run (development mode):

```bash
# from repository root
docker compose up --build
```

This maps:
- Frontend: http://localhost:3000
- Backend:  http://localhost:8000 (API) and http://localhost:8000/docs (OpenAPI)

Notes:
- Frontend runs Vite dev server inside the container (mounted volume) so local edits are reflected.
- Backend runs Uvicorn with --reload for quick iteration and uses SQLite by default: `sqlite:///./sceap.db`.
- If you prefer Postgres, set `DATABASE_URL` env before running compose, e.g.:
  export DATABASE_URL="postgresql+psycopg2://user:pass@host:5432/sceap"

Troubleshooting:
- If requests from the frontend to `/api` fail inside Docker, verify `host.docker.internal` is available on your platform. On Linux this name may not be present; you can update `frontend/vite.config.ts` proxy target to `http://backend:8000` and add an internal network in the compose file.

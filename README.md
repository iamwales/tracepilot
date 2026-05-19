# TracePilot

TracePilot is a multi-agent incident analysis app.

- Next.js on Vercel
- Clerk for authentication
- Supabase Postgres for persistence
- A small, testable agent pipeline for incident triage

## Local Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
```

## Architecture

TracePilot uses a modular app architecture:

- `src/app`: Next.js routes and layout
- `src/components`: reusable UI building blocks
- `src/features/incidents`: incident domain logic and UI
- `src/lib/supabase`: Supabase clients and types
- `db`: database schema and policies

The incident domain is deliberately kept separate from the UI so the agent pipeline can be tested without rendering pages.

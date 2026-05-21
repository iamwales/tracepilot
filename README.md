# TracePilot

TracePilot is a Vercel-ready multi-agent incident analysis app.

- Next.js on Vercel
- Clerk for authentication
- Supabase Postgres for persistence
- A testable five-stage agent pipeline for incident triage

## MVP Scope

- Futuristic incident command UI
- Incident input validation and draft creation
- Five-stage multi-agent analysis pipeline
- Completed incident report page
- Copyable Markdown-style report output
- Recent incident history
- Supabase schema and service client
- Clerk/Supabase configuration placeholders
- API route tests and domain unit tests

The current agent engine is deterministic so the app is free to demo and easy to test. The next upgrade is to replace `src/features/incidents/engine.ts` with provider-backed LLM calls while keeping the API and UI contract stable.

## Local Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. If port `3000` is busy, Next.js will automatically use the next available port.

## Tests

```bash
npm test
npm run build
```

## Architecture

TracePilot uses a modular app architecture:

- `src/app`: Next.js routes, API handlers, and report pages
- `src/components`: reusable UI building blocks
- `src/features/incidents`: incident domain logic, agent engine, store, tests, and UI
- `src/lib/auth`: Clerk user resolution with demo fallback
- `src/lib/supabase`: Supabase clients and types
- `db`: database schema and policies

The incident domain is deliberately kept separate from the UI so the agent pipeline can be tested without rendering pages.

## Supabase Setup

1. Create a free Supabase project.
2. Run `db/schema.sql` in the SQL editor.
3. Copy the project URL and keys into `.env.local`.
4. Use the service role key only in server-side environments such as Vercel project secrets.

Without Supabase keys, TracePilot runs in demo memory mode for local development.

## Clerk Setup

1. Create a Clerk application.
2. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`.
3. Add the same variables to Vercel.

Without Clerk keys, TracePilot runs as `demo-user` so the MVP remains buildable before auth is configured.

## CV Summary

Built TracePilot, a Vercel-ready multi-agent incident intelligence app using Next.js, Clerk, Supabase, TypeScript, and a testable incident-analysis pipeline for severity scoring, root-cause hypotheses, remediation planning, and report generation.

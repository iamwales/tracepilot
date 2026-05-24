# TracePilot

TracePilot is an AI-powered incident intelligence platform for turning raw logs into an actionable incident report. A user can paste logs, upload a log file, or upload a ZIP archive of many log files; Sentinel then runs a multi-agent analysis pipeline that summarizes the incident, classifies severity, investigates likely root cause, recommends remediation steps, and lets the user keep asking focused follow-up questions about the logs and recommended actions.


## Tech Stack:

- Framework: Next.js on Vercel
- Authentication: Clerk
- Database: Supabase Postgres
- AI Agent SDK: OpenAI Agents SDK
- AI Language Models: OpenRouter (primary) and OpenAI (observability)
- Observability: Langfuse

## MVP Scope

- Futuristic incident command UI
- Incident input validation and draft creation
- Five-stage multi-agent analysis pipeline
- Completed incident report page
- Copyable Markdown-style report output
- Recent incident history
- Supabase schema and service client
- Clerk/Supabase configuration placeholders
- OpenRouter structured-output analysis path
- OpenAI Agents SDK trace spans for incident runs, guardrails, stages, and generations
- Langfuse OpenAI observation wrapper
- Prompt-injection, secret-exposure, and unsafe-output guardrails
- Token usage and optional cost estimation metadata
- API route tests and domain unit tests

TracePilot uses OpenRouter for model calls when `OPENROUTER_API_KEY` is configured. `OPENAI_API_KEY` is used only for OpenAI Agents SDK trace export. Without model keys, the app falls back to the deterministic engine so it remains free to demo and stable in tests.

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
- `src/features/incidents/pipeline.ts`: guardrailed analysis orchestration
- `src/features/incidents/openRouterAnalysis.ts`: OpenRouter structured output integration via the OpenAI-compatible SDK
- `src/features/incidents/observability.ts`: OpenAI trace and Langfuse setup
- `src/features/incidents/guardrails.ts`: input/output safety checks
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

## OpenRouter And Observability Setup

Add these variables to `.env.local` and Vercel project secrets:

```bash
OPENROUTER_API_KEY=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=openai/gpt-4.1-mini
OPENROUTER_SITE_URL=
OPENROUTER_APP_NAME=TracePilot

LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

To export OpenAI Agents SDK traces, also set:

```bash
OPENAI_API_KEY=
```

TracePilot does not use `OPENAI_API_KEY` for model calls.

For token/cost metadata, optionally add your own model pricing:

```bash
OPENROUTER_INPUT_COST_PER_1M=
OPENROUTER_OUTPUT_COST_PER_1M=
```

If pricing env vars are omitted, TracePilot records token usage and leaves `estimatedCostUsd` as `null` instead of inventing cost data.

## Guardrails

TracePilot currently enforces:

- Input prompt-injection detection
- Input secret-exposure detection
- Output grounding checks
- Output confidence bounds
- Unsafe remediation detection

Blocked input returns `422` with guardrail metadata. Unsafe model output falls back to the deterministic engine while preserving guardrail details in the saved analysis.

## CV Summary

Built TracePilot, a Vercel-ready multi-agent incident intelligence app using Next.js, Clerk, Supabase, TypeScript, OpenRouter structured outputs, OpenAI Agents tracing, Langfuse observability, and guardrailed incident-analysis workflows for severity scoring, root-cause hypotheses, remediation planning, and report generation.

# Conform Bridge Agent Contract

## Repo Intent
This repository is a frontend-only internal operator application for Resolve to Nuendo translation workflows.

## Required Engineering Rules
- Use Next.js App Router with TypeScript and Tailwind CSS.
- Keep initial render deterministic and SSR-safe.
- Do not use browser-only APIs during initial render.
- Do not use `Date.now()`, `Math.random()`, or `crypto.randomUUID()` in render logic.
- Do not add a fake backend, API route, database, queue, or server action that pretends parsing/export exists.
- Prefer reusable components over page-specific duplication.
- Keep domain types centralized in `src/lib/types.ts`.

## UI Rules
- Dark, serious post-production desktop aesthetic.
- Dense but readable information layout.
- Favor panels, inspectors, queues, and tables over oversized marketing cards.
- Use route content that reads like a real operator tool with realistic mock turnover data.

## Scope Rules For Phase 1
- No real Resolve parser.
- No real Nuendo export writer.
- No auth, billing, database, or marketing pages.
- No AI chat UI.

## Mock Data Rules
- Mock bundles must reflect real Resolve/Nuendo workflows.
- Use fixed IDs, fixed date strings, and fixed counts.
- Bundle assets should include realistic turnover materials such as AAF, marker exports, metadata CSVs, manifest, readme, reference video, and field recorder report placeholders.

## Route Contract
The scaffold must include:
- Dashboard
- New Job
- Jobs
- Templates
- Field Recorder
- ReConform
- Settings

## Review Standard
Reject work that hides hydration problems with client-only wrappers, uses browser APIs on first render, or introduces backend-looking abstractions for features that do not exist yet.

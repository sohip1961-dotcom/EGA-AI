# EGS AI — Start Here

Before doing ANY work in this repository, read these two files in the project root:

1. **[PRD.md](PRD.md)** — complete product requirements document: architecture, database schema, all 26 API routes, AI/RAG pipeline, both clients (Next.js web + Flutter mobile), theming, deployment, known issues, and security posture. It is written so the whole project can be understood from that file alone.
2. **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** — mandatory coding rules: no emojis in design or code, full responsiveness on web (all screen sizes) and mobile (no Flutter overflow "yellow striped bars"), concise code with sparse comments, latest technologies, zero critical vulnerabilities, and linked-feature completeness (when a change affects a connected page/screen/layer, update it too — see the change map in PRD section 22).

**After completing any task that changes the project, you MUST update PRD.md in the same session** (relevant sections + "Last updated" date) so it always matches the codebase. See guideline 8 in CODING_GUIDELINES.md.

Additional scoped instructions:
- `web/AGENTS.md` — Next.js 16 breaking-changes warning; read `node_modules/next/dist/docs/` before writing Next.js code.

Quick facts:
- `web/` — Next.js 16 SPA (`src/app/page.tsx` holds the entire UI, `src/app/globals.css` the design system, `src/app/api/` all routes, `src/lib/db.ts` all DB access).
- `mobile/` — Flutter app (`lib/main.dart` holds the entire app).
- Backend: Supabase (schema in `web/supabase_schema.sql` + two migration files).
- Language: Arabic-first, RTL, Egyptian curriculum tutoring. Brand color `#7DA146` on `#0D0E0B`.

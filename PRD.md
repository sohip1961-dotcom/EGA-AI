# EGS AI — Product Requirements Document (PRD)

> **Purpose of this file:** Single source of truth for the entire project. It is written so that an AI agent (or a new developer) can understand the whole product, architecture, data model, API surface, UI, and known issues **without reading the codebase first**. Read this file and `CODING_GUIDELINES.md` (same folder) before making any change.
>
> **Last updated:** 2026-08-25 (Connected live real-time Kashier (كاشير) payment gateway with HMAC-SHA256 order hashing, webhook listener, callback verification, and instant subscription auto-upgrade).
>
> **MANDATORY MAINTENANCE RULE:** upon completing ANY task that adds, modifies, or removes anything in this project (feature, API route, schema, screen, protocol tag, env var, setting, dependency, known issue), update the corresponding section(s) of this file and the "Last updated" date **in the same session**, so this document always matches the codebase. See CODING_GUIDELINES.md rule 8. A task is not complete until this file reflects it.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Repository Structure](#2-repository-structure)
3. [Technology Stack](#3-technology-stack)
4. [Core Domain Concepts](#4-core-domain-concepts)
5. [System Architecture](#5-system-architecture)
6. [Database Schema (Supabase / PostgreSQL)](#6-database-schema)
7. [Backend API Reference (31 routes)](#7-backend-api-reference)
8. [AI Pipeline (RAG, Providers, Prompts, Streaming)](#8-ai-pipeline)
9. [Coin (Points) Economy](#9-coin-points-economy)
10. [Authentication and Sessions](#10-authentication-and-sessions)
11. [Message Protocol Tags](#11-message-protocol-tags)
12. [Web Frontend (Next.js)](#12-web-frontend)
13. [Mobile App (Flutter)](#13-mobile-app)
14. [Theming and Design System](#14-theming-and-design-system)
15. [Responsive Design Requirements](#15-responsive-design-requirements)
16. [Admin Panel](#16-admin-panel)
17. [Deployment and Environments](#17-deployment-and-environments)
18. [Environment Variables](#18-environment-variables)
19. [Seed / Default Data](#19-seed--default-data)
20. [Known Issues and Technical Debt](#20-known-issues-and-technical-debt)
21. [Security Posture and Required Fixes](#21-security-posture-and-required-fixes)
22: [Coding Guidelines](#22-coding-guidelines)

---

## 1. Product Overview

**Name:** EGS AI (repo name "EGA-AI", Flutter package `egs_ai`). Official Release Version (Production Launch).

**What it is:** An Arabic-language AI tutor ("smart assistant / teacher") for students of the **Egyptian national curriculum** — middle school (اعدادي) and high school (ثانوي). Students chat with an AI that answers strictly from their grade's uploaded curriculum, take AI-generated exams, get AI grading with feedback, and upload images of problems for analysis.

**Subscriptions & Pricing:**
- **Monthly Pro Subscription (اشتراك شهر - باقة برو):** 50 EGP / month. Full access to Pro AI models, Deep Thinking, daily coin renewals, and unlimited exam generation.
- **Two-Month Subscription (اشتراك شهرين):** 100 EGP / 2 months.
- **Three-Month Subscription (اشتراك 3 أشهر):** 250 EGP / 3 months.
- **Cancellation & Refund Policy:** Requests allowed within 3 days (72 hours) of purchase strictly provided that the user has consumed 0 points from the subscription package.
- **Payment Processing:** **Kashier (كاشير)** payment gateway on Web (Visa, Mastercard, Meeza, Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, Instapay; SSL 256-bit PCI-DSS encrypted). **Google Play Billing** on Mobile.
- **Support Contact Channels:** Phone / WhatsApp: `01037220587`, Email: `sohaib572010@gmail.com`, dedicated Web page `/contact`.

**Platforms:**
- **Web:** Next.js single-page app at `web/` — Arabic, RTL, dark/light themes. Production domain: `https://egsaiedu.com`.
- **Mobile:** Flutter Android app at `mobile/` (iOS scaffolding exists but recording/version-check are Android-only).
- **Curriculum Generator:** Standalone Next.js application at `Curriculum Generator/` running on localhost (port 3005) for concurrent multi-curriculum PDF OCR extraction & RAG Markdown optimization.

**Target users:**
- **Students** (role `student`): 6 grade levels — `1_middle`, `2_middle`, `3_middle` (الصف الأول/الثاني/الثالث الإعدادي), `1_high`, `2_high`, `3_high` (الصف الأول/الثاني/الثالث الثانوي). Default grade everywhere: `3_high`.
- **Admin** (role `admin`): manages curricula, users, notifications, reports, app versions via the web admin dashboard.
- **Guests:** device-ID-based; plumbing exists (5 free messages, 5.0 coins/day) but chat and exams currently hard-gate all guests behind login on both platforms.

**Business model (planned):** point ("coins") economy metered per token consumption. Plans `free` / `pro` / `max` exist in data + UI badges, but **payments are disabled during beta** (UI promises payments "before August 2026"). During beta, Pro model and Thinking mode are unlocked for all registered users.

**Key product rules:**
- The AI must answer from the injected curriculum context; if information is outside the curriculum, the answer must begin with a fixed Arabic warning line ("تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل...").
- All user-facing text is Arabic (Egyptian-friendly tone). Math in LaTeX. Diagrams as sanitized inline SVG.
- The chatbot persona is a fun, simple, polite Egyptian teacher.

---

## 2. Repository Structure

```
c:\myapp\                      Git repo (github.com/sohip1961-dotcom/EGA-AI, branch: main)
├── PRD.md                     THIS FILE — read first
├── CODING_GUIDELINES.md       Mandatory coding rules — read second
├── CLAUDE.md / AGENTS.md      Pointers for AI agents to the two files above
├── .gitignore                 IDE/OS/log ignores only
├── Curriculum Generator/      Standalone Next.js App (Localhost:3005) for Curriculum PDF Extraction
│   ├── package.json           name "curriculum-generator", scripts: dev/build/start
│   ├── next.config.ts         experimental bodySizeLimit 50mb, serverExternalPackages pdfjs-dist
│   ├── tsconfig.json          TypeScript configuration
│   ├── .env.example           EDENAI_API_KEY, DEEPSEEK_API_KEY
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx     RTL Root Layout
│   │   │   ├── page.tsx       Arabic Multi-Curricula Dashboard UI (Concurrent Progress, Preview Modal, Live Filtered Logs)
│   │   │   ├── globals.css    Design system tokens (#7DA146 on #0D0E0B)
│   │   │   └── api/           
│   │   │       ├── process/   GET/POST multi-worker queue processor manager & markdown preview
│   │   │       ├── upload/    POST multipart PDF file uploader with instant page counts
│   │   │       └── download/  GET export processed Markdown files
│   │   └── lib/
│   │       ├── types.ts       GradeLevel, FileQueueItem, PageExtractionResult, JobCheckpoint, QueueStateData
│   │       ├── pdf_parser.ts  Cached PDFDocumentHandler & @napi-rs/canvas fast JPEG page renderer
│   │       ├── eden_vision.ts Multi-tier EdenAI Vision OCR API client with network disconnect exponential retry backoff
│   │       ├── deepseek_organizer.ts DeepSeek RAG optimization prompt with explicit Unit & Lesson announcements (# الوحدة / ## الدرس) & LaTeX
│   │       ├── checkpoint_manager.ts Persistent queue state (queue_state.json) & page-level checkpointing for zero data loss
│   │       └── queue_processor.ts Multi-Curricula Concurrent Worker Pool manager with speed metrics & fault isolation
│   └── output/                Stage-organized output Markdown files (output/<grade_level>/<subject>.md)
```
│   ├── wrangler.toml          Cloudflare: name "myapp-web", nodejs_compat
│   ├── tsconfig.json          strict, paths @/* -> ./src/*
│   ├── eslint.config.mjs      eslint-config-next core-web-vitals + typescript
│   ├── supabase_schema.sql            Base schema v2 (destructive, full rebuild)
│   ├── supabase_migration_beta.sql    Additive beta migration
│   ├── supabase_migration_email_auth.sql  Email/Google auth migration
│   ├── supabase_migration_security.sql    OTP expiry + password_resets table
│   ├── supabase_migration_phase1.sql      chat_sessions.mode (interaction modes)
│   ├── db_data.json           Local-dev JSON database (fallback when no Supabase env)
│   ├── check-profiles.js      Dev utility: dumps profiles table via service key
│   ├── CLAUDE.md -> @AGENTS.md    Next.js 16 breaking-changes warning
│   ├── public/                logo.png (512x512) + default Next SVGs
│   └── src/
│       ├── app/
│       │   ├── layout.tsx     Root layout: metadata, ar/RTL, fonts, GSI script, JSON-LD
│       │   ├── page.tsx       ENTIRE SPA (~6,880 lines): all views, components, state
│       │   ├── globals.css    Full design system (1,527 lines): tokens, themes, breakpoints
│       │   ├── page.module.css    DEAD CODE (unused create-next-app template)
│       │   ├── terms/page.tsx     Terms of use & Return Policy (Arabic, 10 sections, #refund anchor)
│       │   ├── privacy/page.tsx   Privacy policy (Arabic, 10 sections, standalone-page-scroll)
│       │   ├── contact/page.tsx   Dedicated Contact Us Page (/contact) + ContactForm
│       │   ├── sitemap.ts / robots.ts / manifest.ts   SEO + PWA
│       │   └── api/           27 route.ts files (see section 7)
│       ├── components/
│       │   └── ContactForm.tsx  Interactive contact & refund request form component
│       └── lib/
│           ├── db.ts          (~2,040 lines) All DB access + RAG search + coin logic
│           ├── deepseek.ts    DeepSeek client + main system prompt builder
│           ├── gemini.ts      Gemini-via-EdenAI: query intelligence, gap check, summaries
│           ├── email.ts       Resend OTP email sender (register + password-reset templates)
│           └── auth_helpers.ts    PBKDF2 hashing (+legacy sha256 verify), OTP gen, HMAC session tokens
└── mobile/                    Flutter app (package egs_ai, version 1.0.0+1)
    ├── pubspec.yaml           deps: supabase_flutter, google_sign_in, speech_to_text,
    │                          audioplayers, flutter_math_fork, flutter_svg, file_picker...
    ├── lib/main.dart          ENTIRE APP (~8,790 lines): all screens, widgets, API client
    ├── lib/test_dart_stream_real.dart   Standalone console test of markdown regex
    ├── test/widget_test.dart  1 smoke test
    ├── assets/logo.png        Only declared asset
    ├── android/               applicationId com.egs.ai.egs_ai; native recorder in MainActivity.kt
    └── ios|linux|macos|windows|web/   Standard Flutter platform scaffolding
```

**Critical fact:** both clients are effectively single-file apps (`page.tsx` and `main.dart`). Any UI change happens in those files; any style change on web happens in `globals.css`.

---

## 3. Technology Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Web framework | Next.js (App Router) | 16.2.9 | Breaking changes vs older Next — read `web/AGENTS.md` and `node_modules/next/dist/docs/` before writing Next code |
| Web UI | React | 19.2.4 | Single `'use client'` page component |
| Language (web) | TypeScript | 5.x, strict | |
| Styling | Hand-written CSS custom properties in `globals.css` | — | No Tailwind, no CSS-in-JS |
| Icons (web) | lucide-react | 1.21.0 | Emojis were deliberately replaced by Lucide icons (commit 9b590f7) |
| Math (web) | KaTeX | 0.17.0 | Bundled, `throwOnError:false`, `trust:false` |
| Sanitization (web) | DOMPurify | 3.4.11 | Client-side only, for AI-generated SVG |
| DB / BaaS | Supabase (PostgreSQL + pgvector) | supabase-js 2.108.2 | Service-role key server-side; **no RLS** |
| Hashing | WebCrypto PBKDF2 (100k iter, salted) + js-sha256 (legacy verify / HMAC tokens) | — | Legacy sha256 hashes upgraded transparently on login |
| AI: main LLM | DeepSeek `deepseek-chat` (flash) / `deepseek-reasoner` (pro) | v1 API | Chat, exam generation, exam grading |
| AI: intelligence | Google Gemini `gemini-2-5-flash` via EdenAI | — | Query analysis, context-gap check, curriculum summary |
| AI: embeddings | Google `text-embedding-004` via EdenAI | 768-dim | HyDE query + child chunk embeddings |
| AI: vision | EdenAI VQA (`providers=google`, fallback `openai`) | — | Image description |
| AI: transcription | EdenAI `speech_to_text_async` (`providers=google`, fallback `openai`, `language=ar`) | — | Both clients via `POST /api/chat/transcribe` (polling ~1s, 45s budget) |
| Email | Resend REST API | — | OTP emails, sender `no-reply@egsaiedu.com` |
| Mobile framework | Flutter | Dart SDK ^3.11.1 | Material 3, `setState` only, no state-management lib |
| Deployment | Cloudflare Pages via `@cloudflare/next-on-pages` 1.13.16, built with Vercel CLI Build Output v3 | — | Most API routes declare `runtime='edge'` |

---

## 4. Core Domain Concepts

- **Grade levels (fixed enum):** `1_middle`, `2_middle`, `3_middle`, `1_high`, `2_high`, `3_high`. Arabic names map in `page.tsx` (`GRADE_NAMES`) and `main.dart` (`_gradeNames`).
- **Subjects:** free-form Arabic text (e.g. الفيزياء, التاريخ). A subject exists for a grade only if an admin uploaded a curriculum for `(grade_level, subject_name)` (unique pair).
- **Curriculum:** one Markdown document per (grade, subject), chunked hierarchically (parent sections + embedded child chunks) for RAG. Admin can publish/unpublish via `active_curriculum_ids` and gate whole grades via `active_grade_levels` (both in `system_settings`).
- **Coins:** usage currency. Registered default 50.0; replenished daily up to the plan cap (free 15 / pro 50 / max 100 — `DAILY_COIN_CAPS`); guests 5.0/day. Deducted per token usage (see section 9). `unlimited_credit` flag or `admin` role bypasses deduction.
- **Plans:** `free` / `pro` / `max` on `profiles.plan_type` — determine the daily coin cap (section 9); otherwise cosmetic during beta (badges; pro model unlocked for all registered users).
- **Session:** a chat conversation (`chat_sessions`), tied to a subject + grade; messages in `chat_history`.
- **Models:** `flash` (DeepSeek chat, default) and `pro` (DeepSeek reasoner). `thinking` boolean toggles chain-of-thought streaming.
- **Interaction modes:** `socratic` / `detailed` (default) / `summary` — per-session AI teaching style (`chat_sessions.mode`), selected in both clients' composers and appended as a behavioral block to the system prompt.
- **Reports:** students can flag an AI answer; admin reviews (`pending`/`reviewed`/`dismissed`).
- **Notifications:** admin broadcasts (`info`/`success`/`warning`/`maintenance`) targeted to `web`/`phone`/`both`; dismissals stored client-side.
- **App versions:** rows in `app_versions` drive the mobile force-update dialog (compare `version_code` to `kAppVersionCode`; `mandatory` blocks the app).

---

## 5. System Architecture

```
┌─────────────┐        ┌──────────────────────────────┐       ┌──────────────────┐
│ Web browser │─HTTPS─▶│ Next.js app (Cloudflare edge) │──────▶│ Supabase Postgres │
│ (page.tsx)  │  SSE   │ 27 API routes + src/lib       │ svc   │ pgvector + RRF RPC│
└─────────────┘        │  key                          │       └──────────────────┘
┌─────────────┐        │  ├── DeepSeek API (chat/exams)│
│ Flutter app │─HTTPS─▶│  ├── EdenAI (Gemini, embed,   │
│ (main.dart) │  SSE   │  │    VQA)                    │
└──────┬──────┘        │  └── Resend (OTP email)       │
       │               └──────────────────────────────┘
       └────────── direct Supabase SDK reads/writes (see section 13 — to be migrated)
```

- The web client talks **only** to its own `/api/*` routes.
- The mobile client talks to the web API for chat/auth/image/exams/password-change, but **also queries Supabase tables directly** with an embedded key (profiles, sessions, history, config, notifications, versions, reports). This split is a known architectural debt (section 20/21).
- Mobile discovers the web API base URL at runtime from `system_settings.website_link` (default fallback `http://localhost:3000`).

---

## 6. Database Schema

Supabase PostgreSQL with `vector` extension. **No RLS anywhere** — all access goes through the service-role key with app-level authorization. Schema files (apply in order): `supabase_schema.sql` (destructive base), `supabase_migration_beta.sql` (additive), `supabase_migration_email_auth.sql` (email auth), `supabase_migration_security.sql` (OTP expiry + password resets).

### 6.1 `profiles`
| Column | Type | Default / Constraint |
|---|---|---|
| id | UUID | PK |
| phone | TEXT | UNIQUE, nullable (was NOT NULL pre-email migration) |
| email | TEXT | UNIQUE (added by email migration) |
| name | TEXT | NOT NULL |
| grade_level | TEXT | NOT NULL, one of the 6 grades |
| plan_type | TEXT | NOT NULL default `'free'` (`free`/`pro`/`max`) |
| role | TEXT | NOT NULL default `'student'` (`student`/`admin`) |
| password_hash | TEXT | NOT NULL (sha256; empty string for Google accounts) |
| coins | NUMERIC | NOT NULL default 50.0 |
| last_active_date | DATE | NOT NULL default CURRENT_DATE |
| unlimited_credit | BOOLEAN | NOT NULL default false (admins set true) |
| terms_accepted_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | default NOW() |

### 6.2 `pending_registrations` (post email-auth migration)
`email TEXT PK`, `phone TEXT NULL`, `name TEXT NOT NULL`, `grade_level TEXT NOT NULL`, `password_hash TEXT NOT NULL`, `otp TEXT NOT NULL`, `expires_at TIMESTAMPTZ` (10-min OTP TTL; added by `supabase_migration_security.sql`), `terms_accepted_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT NOW()`. Rows removed on successful OTP verify or on expired-OTP attempts.

### 6.2b `password_resets` (added by `supabase_migration_security.sql`)
`user_id UUID PK FK → profiles CASCADE`, `otp TEXT NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`. One active reset per user (upsert); deleted on success or expiry.

### 6.3 `device_guests`
`device_id TEXT PK`, `free_message_count INTEGER NOT NULL DEFAULT 0`, `last_message_date DATE NOT NULL DEFAULT CURRENT_DATE`, `coins NUMERIC NOT NULL DEFAULT 5.0` (reset to 5.0 lazily on first request of a new day).

### 6.4 `curriculums`
`id UUID PK`, `grade_level TEXT NOT NULL`, `subject_name TEXT NOT NULL`, `file_name TEXT NOT NULL`, `created_at`, **UNIQUE(grade_level, subject_name)**.

### 6.5 `curriculum_chunks` (RAG v2, hierarchical)
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| curriculum_id | UUID | FK → curriculums, CASCADE delete |
| content | TEXT | NOT NULL |
| heading | TEXT | NOT NULL (special heading `__CURRICULUM_SUMMARY__` at position_index −1 holds the Gemini-generated summary) |
| chunk_level | TEXT | `'parent'` (full section) or `'child'` (sliding-window sub-chunk) — default `'parent'` |
| parent_id | UUID | self-FK, CASCADE; set on children only |
| position_index | INTEGER | NOT NULL default 0 |
| embedding | VECTOR(768) | children only (text-embedding-004) |
| fts_arabic | TSVECTOR | trigger-maintained, `'simple'` config |
| fts_english | TSVECTOR | trigger-maintained, `'english'` config |

Indexes: HNSW on embedding (`vector_cosine_ops`, m=16, ef_construction=64); GIN on both tsvectors; btree on `parent_id` and `(curriculum_id, chunk_level)`.

Trigger: `curriculum_chunks_update_fts` (BEFORE INSERT/UPDATE) recomputes both tsvectors from `heading || ' ' || content`.

RPC function: `hybrid_search_curriculum(p_curriculum_id, p_query_embedding VECTOR(768), p_arabic_query TEXT, p_english_query TEXT, p_match_count INT DEFAULT 8, p_rrf_k INT DEFAULT 60)` — Reciprocal Rank Fusion over (vector cosine, Arabic BM25, English BM25), each top-50, child chunks only, returns top N with `rrf_score`.

### 6.6 `system_settings`
`key TEXT PK`, `value TEXT NOT NULL`. Known keys: `website_link` (mobile API base URL; seed `http://localhost:3000`), `active_grade_levels` (JSON array), `active_curriculum_ids` (JSON array). (`gemini_api_key` is obsolete since transcription moved server-side; safe to delete the row.)

### 6.7 `chat_sessions`
`id UUID PK`, `user_id UUID FK → profiles CASCADE`, `device_id TEXT NULL`, `title TEXT NOT NULL` (first ~35 chars of first message), `subject_name TEXT NOT NULL`, `grade_level TEXT NOT NULL`, `mode TEXT NOT NULL DEFAULT 'detailed'` (`socratic`/`detailed`/`summary`, added by `supabase_migration_phase1.sql`), `created_at`.

### 6.8 `chat_history`
`id UUID PK`, `user_id UUID FK → profiles SET NULL`, `device_id TEXT NULL`, `sender TEXT NOT NULL` (`'user'`/`'ai'`), `message TEXT NOT NULL`, `coins_cost NUMERIC NOT NULL DEFAULT 0.0`, `session_id UUID FK → chat_sessions CASCADE` (indexed), `created_at`. AI rows may embed `<thought duration="N">...</thought>` prefix.

### 6.9 `exams`
`id UUID PK gen_random_uuid()`, `title TEXT`, `subject_name TEXT`, `grade_level TEXT`, `questions JSONB NOT NULL` (array of `{id, type: multiple_choice|true_false|essay, question, options?, correct_answer, explanation}`), `session_id UUID FK SET NULL`, `user_id UUID FK SET NULL`, `device_id TEXT NULL`, `created_at`.

### 6.10 `exam_submissions`
`id UUID PK`, `exam_id UUID FK CASCADE`, `user_id UUID FK CASCADE`, `device_id TEXT NULL`, `answers JSONB NOT NULL` (`{questionId: answer}`), `score NUMERIC NOT NULL` (0–100), `evaluation TEXT NOT NULL` (Arabic AI feedback), `submitted_at`.

### 6.11 `reports`
`id UUID PK`, `user_id UUID FK SET NULL`, `device_id TEXT`, `message_id TEXT`, `session_id UUID FK SET NULL`, `reported_content TEXT NOT NULL`, `user_query TEXT`, `reason TEXT NOT NULL`, `status TEXT NOT NULL DEFAULT 'pending'` (`pending`/`reviewed`/`dismissed`), `created_at`. Indexes on status, created_at.

### 6.12 `notifications`
`id UUID PK`, `title TEXT`, `body TEXT`, `type TEXT DEFAULT 'info'` (`info`/`success`/`warning`/`maintenance`), `target TEXT DEFAULT 'both'` (`both`/`web`/`phone`), `active BOOLEAN DEFAULT true` (indexed), `created_at`.

### 6.13 `app_versions`
`id UUID PK`, `platform TEXT DEFAULT 'android'` (`android`/`ios`), `version_code INTEGER NOT NULL`, `version_name TEXT`, `release_notes TEXT DEFAULT ''`, `download_url TEXT DEFAULT ''`, `mandatory BOOLEAN DEFAULT true`, `active BOOLEAN DEFAULT true`, `created_at`. Index on (platform, active).

### 6.13b `flashcard_decks`
`id UUID PK`, `user_id UUID FK → profiles CASCADE`, `subject_name TEXT NOT NULL`, `grade_level TEXT NOT NULL`, `title TEXT NOT NULL`, `created_at TIMESTAMPTZ default NOW()`.

### 6.13c `flashcards`
`id UUID PK`, `deck_id UUID FK → flashcard_decks CASCADE`, `question TEXT NOT NULL`, `answer TEXT NOT NULL`, `box INTEGER NOT NULL DEFAULT 1`, `next_review_at TIMESTAMPTZ default NOW()`, `created_at TIMESTAMPTZ default NOW()`.

### 6.13d `payment_transactions` (added by `supabase_migration_payments.sql`)
| Column | Type | Default / Constraint |
|---|---|---|
| id | UUID | PK `gen_random_uuid()` |
| user_id | UUID | FK → `profiles(id)` SET NULL |
| order_id | TEXT | UNIQUE NOT NULL |
| plan_id | TEXT | NOT NULL (`pro_1m`, `pro_2m`, `pro_3m`) |
| amount | NUMERIC | NOT NULL (50, 100, 250 EGP) |
| currency | TEXT | NOT NULL DEFAULT `'EGP'` |
| status | TEXT | NOT NULL DEFAULT `'pending'` (`pending`, `success`, `failed`, `refunded`) |
| provider | TEXT | NOT NULL DEFAULT `'kashier'` |
| transaction_id | TEXT | nullable (Kashier transaction reference) |
| payment_method | TEXT | nullable (`card`, `wallet`, etc.) |
| raw_response | JSONB | nullable (full webhook/callback event payload) |
| created_at | TIMESTAMPTZ | default NOW() |
| updated_at | TIMESTAMPTZ | default NOW() |

Indexes: on `user_id`, `order_id`, and `status`.

### 6.14 Local-dev fallback
`web/src/lib/db.ts` uses `./db_data.json` when Supabase env vars are absent AND not on edge runtime. It mirrors the tables above and seeds a hardcoded admin. On edge without Supabase, all reads return empty — **Supabase is mandatory in deployment**.

---

## 7. Backend API Reference

All routes under `web/src/app/api/`. Conventions:
- **Bearer auth:** `Authorization: Bearer <token>` — custom HMAC token (section 10).
- **Guest header:** `x-device-id` (client-generated, spoofable).
- **Admin:** Bearer + DB check `profile.role === 'admin'` (an `authorizeAdmin()` helper duplicated per admin route).
- Nearly all routes declare `export const runtime = 'edge'` (exception: `chat/upload-image`, Node runtime).
- **No request rate limiting exists anywhere.** Error messages are Arabic.

### 7.1 Auth
| Route | Method | Body | Behavior |
|---|---|---|---|
| `/api/auth/register` | POST | `{email, name, grade_level, password, terms_accepted}` | Validates email regex + terms; PBKDF2 password hash; 6-digit OTP (`crypto.getRandomValues`), 10-min expiry; sends Resend email (RTL Arabic template, green branding) via `src/lib/email.ts`; **on email failure returns 502 (no fallback OTP)**; upserts `pending_registrations` with `expires_at`. 400/502/500. |
| `/api/auth/otp` | POST | `{email, otp, has_registered_before}` | Verifies OTP strictly against the stored code; expired OTPs (10 min) are rejected and the pending row deleted. Creates profile (coins 50, or 0 if `has_registered_before`), deletes pending row, returns `{token, user}`. |
| `/api/auth/login` | POST | `{email, password}` | Verifies via `verifyPassword` (PBKDF2; legacy sha256 accepted and transparently re-hashed to PBKDF2 on success); 30-day token. Generic 401. No lockout. |
| `/api/auth/google` | POST | `{credential, grade_level?}` | Full server-side Google ID-token verification (exp/iss/aud + RSA signature via JWKS, 1h cache). New user without grade → `{requires_grade_level:true, email, name}`; else creates profile (`password_hash:''`, coins 50) and returns `{token, user}`. |
| `/api/auth/update-grade` | POST (Bearer) | `{grade_level}` | Whitelist-validated grade update. |
| `/api/auth/update-profile` | POST (Bearer) | `{action, ...}` | `update-name`; `send-otp` (generates crypto-random OTP, emails it via Resend, stores in `password_resets` with 10-min expiry); `verify-otp` (validates stored OTP + expiry) + `new_password` (PBKDF2), deletes the reset row on success. |

### 7.2 Chat
| Route | Method | Behavior |
|---|---|---|
| `/api/chat` | POST (Bearer required; guests → 401 `login_required`) | Body `{message, subject_name (required), grade_level?, session_id?, model:'flash'|'pro', thinking:boolean, mode?:'socratic'|'detailed'|'summary' (default 'detailed'), history? (guest-only, dead)}`. Flow: validate → profile → coins>0 (else 429 `limit_reached`) → curriculum exists for (grade,subject) (else 400 `course_unavailable`) → auto-create session (title = first 35 chars, stores `mode`; existing sessions get their `mode` synced when it changes) → save user msg → last-6-message history → RAG (section 8) → DeepSeek stream. Messages carrying an `[AUDIO_MESSAGE:...]` prefix are stored raw but sent to the LLM as `[System Note: The following text is a transcription of the student's spoken voice message] <text>` (current message and history alike). **SSE response** (`text/event-stream`), events: `search_step {step,icon,message}`, `thought {content}`, `content {content}`, `done {session_id, duration, coins_used, remaining_coins}`, `error`. Post-stream: coin deduction, AI message saved with `<thought duration="N">` prefix and `coins_cost`. |
| `/api/chat/history` | GET (Bearer) | `?session_id=`; ownership check (403); last 100 messages. |
| `/api/chat/sessions` | GET/POST/DELETE (Bearer) | List (rows include `mode`); create `{title, subject_name, grade_level}`; delete by `?id=` with ownership check (cascade removes messages). |
| `/api/chat/upload-image` | POST (Bearer required) | `{base64, mimeType}` → EdenAI VQA (`google`, fallback `openai`) with a fixed Arabic "describe everything literally" question → `{description}`. Requires coins>0 (else 429); deducts a flat 0.5 coins per analysis; enforces the 5 MB cap server-side (413). |
| `/api/chat/transcribe` | POST (Bearer or `x-device-id`) | `{base64, mimeType, durationSeconds?}` ≤20 MB (413). Requires coins>0 (429). EdenAI `POST /v2/audio/speech_to_text_async` (`google`, fallback `openai`, `language=ar`), robust base64 cleanup (spaces, newlines, missing padding, url-safe conversion), polls job ~1 s within a 45 s budget (504 ONLY if job fails to finish, 502 on provider failure). Finished jobs with empty/silent transcripts return 200 with `{transcript: "", coins_used: 0}`. Standard fee: 0.25 coins per started minute, duration floored by size estimate (`bytes/2000` s). Edge runtime. |

### 7.3 Exams
| Route | Method | Behavior |
|---|---|---|
| `/api/exams` | GET (Bearer) | `?subject_name=`; grade from profile; returns exams **with `correct_answer` and `explanation` stripped from every question** (answers withheld until submission). |
| `/api/exams` | POST (Bearer) | Persist an exam object (used for chat-emitted `[CREATE_EXAM]`); response is answer-stripped. |
| `/api/exams/generate` | POST (Bearer) | `{subject_name, grade_level, topic?, mode: 'auto'|'total_only'|'custom_types', total_count?, mcq_count?, tf_count?, essay_count?}`. Coins>0 else 402. Context = first 6 chunks of the curriculum (unranked). DeepSeek `deepseek-chat` temp 0.8 with automatic fallback to Gemini Flash via EdenAI if DeepSeek fails → strict JSON exam → parse & clean markdown fences → coin deduction (x12.5) → save. Response is answer-stripped. |
| `/api/exams/submit` | POST (Bearer) | `{exam_id, answers}`. Evaluates student answers using DeepSeek temp 0.3 with automatic fallback to Gemini Flash via EdenAI if DeepSeek is unavailable or returns an error → resilient JSON parser & regex fallback → `{score 0-100, evaluation Arabic}` → coin deduction (x12.5) → awards first-attempt ranking points (`is_first_attempt`) + score coin rewards → save submission. Response includes `questions_review` (per-question `student_answer`, `correct_answer`, `explanation`). |
| `/api/exams/submissions` | GET (Bearer) | User's submissions (silently `[]` when logged out). |

### 7.4 Public / utility
| Route | Method | Behavior |
|---|---|---|
| `/api/config` | GET (optional auth) | `{website_link, active_grade_levels (default all 6), active_curriculum_ids, all_curriculums, guest_messages_count, guest_coins, user?}`. Never hard-fails. |
| `/api/config` | POST (Admin) | Persist `website_link` / `active_grade_levels` / `active_curriculum_ids` to `system_settings`. |
| `/api/notifications` | GET (public) | `?target=web|phone`; active rows matching target or `both`. |
| `/api/version` | GET (public) | `?platform=android|ios`; highest active `version_code` row or null. |
| `/api/report` | POST (Bearer or device-id) | `{reported_content (req, ≤8000), user_query (≤2000), reason (≤500), message_id (≤200), session_id?}` → `reports` row. |
| `/api/log` | POST (Bearer or device-id) | Client telemetry echoed to server console (`[BROWSER LOG]:`), capped 4000 chars. Not persisted. |

### 7.6 Active Recall & Gamification
| Route | Method | Behavior |
|---|---|---|
| `/api/flashcards` | GET (Bearer) | Returns a list of flashcard decks for the authenticated user, including each deck's `total_count` and `due_count` (calculated using Leitner schedule: `box` intervals 1, 2, 7, 14, 30 days). |
| `/api/flashcards` | POST (Bearer) | `{subject_name, grade_level, title, cards: [{question, answer}]}`. Manually creates a flashcard deck and inserts card rows. |
| `/api/flashcards` | PATCH (Bearer) | `{id, title}`. Renames a flashcard deck. |
| `/api/flashcards` | DELETE (Bearer) | `?id=`. Deletes a flashcard deck and all its contained cards. |
| `/api/flashcards/card` | PATCH (Bearer) | `{id, question, answer}`. Edits a single flashcard's question and answer. |
| `/api/flashcards/card` | DELETE (Bearer) | `?id=`. Deletes a single flashcard. |
| `/api/flashcards/subject` | GET (Bearer) | `?subject_name=`. Returns all pooled flashcards and decks under a given subject for subject-level stacked review. |
| `/api/flashcards/generate` | POST (Bearer) | `{subject_name, grade_level, topic, count}`. Generates a new flashcard deck using AI. DeepSeek `deepseek-chat` temp 0.8 is prompted to produce a JSON array of QA cards. Deducts coins on success. |
| `/api/flashcards/review` | GET (Bearer) | `?deck_id=`. Returns flashcards from the specified deck that are currently due for review (`next_review_at <= now`). |
| `/api/flashcards/review` | POST (Bearer) | `{card_id, rating}`. Submits a review score (1-5) for a flashcard. Adjusts the card's Leitner `box` number and updates `next_review_at` accordingly (increases box on score >= 4, resets to box 1 on score <= 2). |
| `/api/leaderboard` | GET (Bearer) | `?grade_level=my|all`. Returns the leaderboard ranking ordered by `points DESC` (ranking points `"نقاط الترتيب"`), with `study_streak` and lifetime average exam accuracy as tiebreakers. |

### 7.5 Admin (all Bearer + role check; 401/403)
| Route | Methods | Behavior |
|---|---|---|
| `/api/admin/dashboard` | GET | Stats: totalUsers (students), usersByGrade, highestUsageUser (by coins consumed, fallback msg count), highestUsageGrade. Loads all profiles + all chat_history into memory (scaling risk). |
| `/api/admin/users` | GET `?search=` / PATCH `{id, unlimited_credit}` / DELETE `{id}` | Search via ilike on name/phone/email (**search string interpolated into `.or()` filter — injection-prone**); self-delete blocked; hashes excluded from responses. |
| `/api/admin/reports` | GET `?status=` / PATCH `{id,status}` / DELETE | Moderation. |
| `/api/admin/notifications` | GET / POST / PATCH `{id,active}` / DELETE | Title ≤200, body ≤2000, type/target whitelisted. |
| `/api/admin/versions` | GET / POST / DELETE | version_code>0, name ≤50, notes ≤4000, url ≤500; `mandatory` defaults true. |
| `/api/admin/curriculum` | GET / POST (multipart `file`(.md), `grade_level`, `subject_name`) / PATCH `{id, subject_name}` / DELETE `{id}` | Upload runs the v2 chunking pipeline (section 8.4). |
| `/api/admin/curriculum/detail` | GET `?id=` / POST `{id, grade_level, subject_name, content}` | GET reassembles Markdown from chunks; POST re-chunks with the **legacy v1 chunker — silently drops hierarchy/embeddings** (known issue). |

### 7.7 Kashier Payment Gateway (Live Checkout)
| Route | Method | Behavior |
|---|---|---|
| `/api/payment/kashier/initialize` | POST (Bearer) | Body `{plan_id: 'pro_1m'\|'pro_2m'\|'pro_3m'}`. Validates plan and user token. Generates a unique order ID `egs_sub_<id>_<time>`, calculates server-side HMAC-SHA256 order hash (`/?payment=mid.orderId.amount.currency`), creates a pending `payment_transactions` record, and returns the checkout payload and URLs. |
| `/api/payment/kashier/webhook` | POST (public/gateway) | Receives asynchronous server-to-server transaction notifications from Kashier. Verifies HMAC signature with `KASHIER_SECURITY_KEY`. If payment succeeded (`SUCCESS`/`CAPTURED`/`APPROVED`), marks the transaction `success`, upgrades user `plan_type` to `pro`, tops up coin balance (+500/1000/2500), and creates an in-app confirmation notification. |
| `/api/payment/kashier/callback` | GET / POST (public/gateway) | Handles customer redirect from Kashier checkout. Validates signature and status. Activates subscription on success and redirects to `/?payment_result=success&orderId=...&plan=...`; on failure redirects to `/?payment_result=failed`. |
| `/api/payment/kashier/verify` | POST (Bearer) | Client-side verification endpoint called when iframe modal emits a completion event. Validates and immediately activates the subscription, returning the updated profile and coin balance. |

---

## 8. AI Pipeline

### 8.1 Providers
- **DeepSeek** `https://api.deepseek.com/v1/chat/completions` — `deepseek-chat` ("flash"), `deepseek-reasoner` ("pro"). Streaming with `stream_options.include_usage`, `thinking:{type: enabled|disabled}`, `Accept-Encoding: identity`, no max_tokens on stream.
- **EdenAI** `https://api.edenai.run/v2/text/chat` (Gemini 2.5 Flash, temp 0.1), `/v2/text/embeddings` (text-embedding-004, 768-dim), `/v2/image/question_answer` (VQA google→openai), `/v2/audio/speech_to_text_async` (STT google→openai, Arabic, polled).
- **Resend** for OTP email.

### 8.2 Main system prompt (`buildSystemPrompt(context, mode)` in `deepseek.ts`)
Persona "أنت EGS AI" — Egyptian teacher. Rules baked into the prompt:
1. Explain vs. solve distinction (curriculum method: Given → laws → steps → result+unit for STEM; grammar-rule-first for languages; precise facts for humanities).
2. All math in LaTeX (`$$` block, `$`/`\(\)` inline).
3. Geometric diagrams as fenced ```` ```svg ```` blocks — whitelist `svg,path,circle,rect,line,polygon,polyline,text,g,ellipse`; ban scripts/handlers/foreignObject/external hrefs; neutral colors (`currentColor`, `#7DA146`); viewBox required; Arabic labels.
4. Optionally append one interactive quiz `[QUIZ_QUESTION]{json}[/QUIZ_QUESTION]`.
5. Full exams via `[CREATE_EXAM]{json}[/CREATE_EXAM]`.
6. Answer only from injected curriculum context; out-of-curriculum answers must start with the fixed Arabic warning; never mention "context"/"file" — act as a real teacher.
7. A mode-specific behavioral block (`MODE_INSTRUCTIONS`) is appended per the session's interaction mode: **socratic** (never give final answers; scaffolded questions with progressively more specific hints), **detailed** (default; textbook-style structure + real-world examples), **summary** (concise bullet points for pre-exam review).

### 8.3 RAG flow (per chat message, with live `search_step` SSE events)
1. `analyzeQueryIntelligence` (1 Gemini call, ≤600 tokens) → `{queryType: direct|inferential|overview|problem_solving, arabicKeywords ≤8, englishKeywords ≤5, hydePassage, searchAnnouncement}`. Fallback: naive word split.
2. Parallel: embed HyDE passage (768-d) + BM25 search (`rankChunksV2` in JS over ≤50 child chunks; Arabic keywords weighted 2x, heading bonus).
3. Vector search via RPC (top 30) when embedding exists.
4. `applyRRF(vector, bm25, k=60)` → top 8 child chunks → **parent expansion** (`getParentChunks`) so full sections go into context.
5. Routing: `overview` → curriculum summary + full outline + 4 chunks; `direct` with ≥3 chunks → 8 chunks straight; otherwise `assessContextGap` (Gemini) → up to 2 follow-up BM25 searches for missing topics → prepend summary if still thin.
6. Context format: `--- القسم N: [heading] ---\ncontent`. No chunks at all → hardcoded "no curriculum" context forcing the out-of-curriculum warning.
7. DeepSeek streams; `reasoning_content` → `thought` events, `content` → `content` events; usage tokens captured for billing.

### 8.4 Curriculum ingestion pipeline (admin upload)
Markdown → split on `#` headings into **parents** (default heading "مقدمة المنهج"; token approx = words x 1.4; PARENT_MAX 500 tokens, split with "(جزء N)" suffixes) → **children** via sentence-aware sliding window (CHILD_MAX 120 tokens, 24-token overlap, Arabic `؟` aware) → batch embeddings (20 per EdenAI call) → Gemini curriculum summary stored as parent chunk `__CURRICULUM_SUMMARY__` (position −1) → insert chunks in batches of 100 with rollback on failure.

### 8.5 Fallback chain
Gemini intelligence fails → regex keywords; embedding fails → BM25-only; RPC fails → BM25; gap check fails → fail-open (proceed); VQA google fails → openai.

---

## 9. Coin (Points) Economy & Merit Leaderboard

### 9.1 Coins (Usage Currency)
- EGP cost per chat: **pro** `prompt/1M x 150 + completion/1M x 200`; **flash** `prompt/1M x 30 + completion/1M x 50`. **Coins = EGP x 10.**
- Exams (generate + submit): flash rates **x 12.5**. Image analysis (`/api/chat/upload-image`): flat 0.5 coins.
- Floor at 0. `admin` role or `unlimited_credit` never deducted.
- Guests: 5.0 coins reset daily (lazy, on first request of the day).
- **Registered users: daily replenishment (lazy, in `checkAndResetDailyCoins` via `getProfile`)** — on the first request of a new day the balance is topped up to the plan's daily cap (`DAILY_COIN_CAPS` in `db.ts`: free 15.0, pro 50.0, max 100.0); balances above the cap are never reduced. New registrations start at 50.0.
- 429 `limit_reached` from `/api/chat` when coins ≤ 0; web UI then auto-opens the auth modal after 3 s for guests.
- All coin deductions happen server-side.

### 9.2 Ranking Points (`points` Merit System & Leaderboard)
- **Purpose:** A dedicated, non-depleting merit score tied directly to academic achievement and active participation (labeled `"نقاط الترتيب"` with a `Trophy` icon).
- **Exam First Attempt Scoring (`is_first_attempt = true`):**
  - **100% score:** 5 points
  - **>90% score:** 3 points
  - **>70% score:** 2 points
  - **>50% score:** 1 point
  - **≤50% score:** 0 points
  *(Points are awarded once on the student's first attempt per exam; subsequent retakes do not grant additional points).*
- **AI-Judged Chat Engagement:**
  - On chat completion (`/api/chat` done event), an asynchronous background classification evaluates the session's first meaningful user engagement (`classifyEngagement`).
  - If genuine engagement is detected in a new session (`engagement_points_awarded: false`), **+3 points** are awarded and synced to the profile and SSE done payload.
- **Leaderboard RPC (`get_leaderboard`):** Ranks students by `points DESC`, with `study_streak DESC` and `avg_accuracy DESC` as secondary tiebreakers. Test and trial accounts (non-student roles, or accounts with emails/names containing 'test', 'trial', 'اختباري', or 'تجريبي') are automatically filtered out from all leaderboard queries.

---

## 10. Authentication and Sessions

- **Password hashing:** PBKDF2-HMAC-SHA256 (WebCrypto, 100k iterations, 16-byte random salt, format `pbkdf2$iter$saltB64$hashB64`) in `auth_helpers.ts`. Legacy unsalted sha256 hashes are still verified and transparently re-hashed to PBKDF2 on successful login. Google accounts store `password_hash: ''`. Mobile no longer hashes or writes passwords — the password-change flow calls `/api/auth/update-profile`.
- **Web session token:** NOT a standard JWT. `base64("userId:expiry:HMAC-SHA256(JWT_SECRET, 'userId:expiry')")`, 30-day expiry, constant-time comparison, no revocation/refresh; logout is client-side only. Secret from `JWT_SECRET` (prod refuses to run without it; dev fallback string exists).
- **Mobile "token":** the value stored in SharedPreferences `auth_token` is used both as Bearer for web API calls and **directly as the user's UUID for raw Supabase queries** (e.g. `profiles.select().eq('id', token)`).
- **OTP:** 6-digit crypto-random (`crypto.getRandomValues`), 10-minute expiry (`OTP_TTL_MS`); Resend email via `src/lib/email.ts` (register + password-reset templates). No backdoor codes. Registration returns 502 if the email cannot be sent.
- **Google Sign-In:** web uses GSI button (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, hardcoded fallback ID in source); mobile uses `google_sign_in` plugin → idToken → `/api/auth/google`. Two-step grade selection for new Google users.
- **Guest identity:** web `egs_device_id` = `device_<random36>`; mobile `device_id` = `mobile_device_<epochMs>_<n>`. Client-supplied, spoofable.

---

## 11. Message Protocol Tags

These inline tags are the contract between AI output, storage, and both clients. Never change one side without the others (web `page.tsx` parser, mobile `MarkdownFormatterWidget`, backend prompt in `deepseek.ts`).

| Tag | Direction | Meaning |
|---|---|---|
| `[QUIZ_QUESTION]{json}[/QUIZ_QUESTION]` | AI → clients | Interactive quiz card (`multiple_choice` / `true_false` ("true"/"false") / `essay`) |
| `[CREATE_EXAM]{json}[/CREATE_EXAM]` | AI → clients | Exam invite card; client persists via POST `/api/exams` |
| `[CREATE_FLASHCARDS]{json}[/CREATE_FLASHCARDS]` | AI → clients | Flashcard deck invite card (`{subject_name, title, cards: [{question, answer}]}`); client persists deck via POST `/api/flashcards` and renders interactive review bubble |
| `<thought duration="N">...</thought>` | storage prefix on AI rows | Collapsible chain-of-thought + duration |
| `[AUDIO_MESSAGE:<mime>;<base64>]text` | legacy storage prefix | Historical voice note fallback (recording cut from chat on web & mobile) |
| `[IMAGE_MESSAGE:<mime>;<base64>;<uriEncodedDescription>]text` | user msg prefix | Image + AI description; backend keeps only the description in the prompt (`[وصف الصورة المرفقة من الطالب: ...]`) |
| ```` ```svg ```` fenced block | AI → clients | Sanitized inline SVG diagram (DOMPurify on web; XML sanitizer + InteractiveViewer zoom on mobile) |
| `data: {json}` SSE lines, terminator `data: [DONE]` | server → clients | Event types `search_step`, `thought`, `content`, `done` (includes `points_awarded` & `total_points`), `error` |

---

## 12. Web Frontend

Single client component `web/src/app/page.tsx` (~7,840 lines). Static routes for `/terms`, `/privacy`, and `/contact`. View switching via `activeTab` state: `'chat' | 'admin' | 'subscriptions' | 'beta' | 'profile' | 'exams' | 'flashcards' | 'leaderboard'`.

### 12.1 Layout and metadata (`layout.tsx`)
`<html lang="ar" dir="rtl">`; title "EGS AI | مساعدك الذكي في المنهج الدراسي المصري"; OG locale `ar_EG`; JSON-LD WebApplication (EducationalApplication, price 0 EGP); viewport `maximumScale 1` (pinch-zoom disabled — accessibility tradeoff), `viewportFit cover`, `interactiveWidget resizes-visual`; theme color `#0D0E0B`; GSI script; a MutationObserver strips extension-injected attributes to avoid hydration mismatches. PWA manifest (standalone, theme `#7DA146`). Fonts: Tajawal/Cairo (Arabic body), Outfit (Latin/code).

### 12.2 Module-level components in page.tsx
`CodeBlock` (LTR code + copy), `ThoughtBlock` (collapsible CoT with timer), `MathRenderer` (KaTeX, `trust:false`, macro `\RR`), `SvgDiagram` (DOMPurify svg profile; FORBID script/foreignObject/on-handlers/href), `parseInlineText` (inline math/bold/code), `MarkdownMessage` (hand-written line parser: headers, lists, RTL tables, block math, fences), `InteractiveQuizCard`, `InteractiveExamInviteCard`, `InteractiveFlashcardInviteCard`, `FormattedChatMessage` (tag extraction including `[CREATE_FLASHCARDS]`), `SearchStepsPanel` (live RAG steps), `ImageEditorModal` (canvas crop + brand-palette freehand brush + undo before upload; exports JPEG stepped under 5 MB).

### 12.3 Views
1. **Sidebar** (right, RTL): logo header (Beta pill removed), new chat, search, subscriptions page (باقات الاشتراك), exams, flashcards (المدرب الذكي), leaderboard (لوحة المتصدرين), profile, admin (role-gated), contact us (تواصل معنا), session list (subject chip, hover delete, grade-mismatch block; opening a session restores its interaction mode), theme switcher (light/dark/system), user card (plan badge, coins, points, logout) or login CTA. Desktop 320px collapsible; mobile 280px fixed overlay + backdrop.
2. **Chat:** header (Trophy points pill `"نقاط الترتيب"`, coins pill, notification bell dropdown, avatar); guest gate card; empty state (animated logo, suggestion chips: شرح درس/تلخيص/أسئلة/حل مسائل); message list; composer.
3. **Composer:** auto-grow textarea (Enter send / Shift+Enter newline, cap 200px), model dropdown (flash/pro — pro locked for guests), subject chip (locked once conversation starts; mobile bottom-sheet picker), grade chip (guests), interaction-mode pill (سقراطي/شرح مفصل/ملخص mini-menu), thinking toggle, image button (≤5 MB → editor modal → `/api/chat/upload-image` description preview), circular send button. (Voice mic recording cut/removed). Disclaimer line "قد يخطئ الذكاء الاصطناعي".
4. **Exams:** creator modal (topic required; modes auto/total_only ≤15/custom_types MCQ+TF+essay counts); grid of available exams + submission history (score colors: ≥80 green, ≥50 orange, else red); taking view (all questions required before submit; **no timer exists**); results view (conic-gradient score ring, AI evaluation as markdown, per-question corrections from `questions_review`).
5. **Flashcards (المدرب الذكي):** Dual-view study system with "جميع الكروت" (All Cards Grid/List view displaying all pooled cards with answer reveal toggles, deck filter pills, and Leitner box level badges) and "مراجعة تفاعلية" (3D interactive focus flip stack with progress bar, previous/next card navigation controls, Leitner 1-5 rating, and summary completion screen), inline card edit/delete, deck rename/delete, and AI + Manual creation modal.
6. **Leaderboard (لوحة المتصدرين):** Ordered by `points DESC` (`"نقاط الترتيب"`), displaying ranking position, avatar, student name, grade level, and points badge.
7. **Subscriptions & Pricing page:** 3 plan cards (Monthly Pro 50 EGP, 2-Month 100 EGP, 3-Month 250 EGP), Kashier payment gateway information card (Visa, Mastercard, Meeza, Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, Instapay), 3-day refund policy alert (requires 0 points consumed), current points balance card, and support banner.
8. **Profile:** name edit, grade select (clears chat), password change (real emailed OTP, 10-min expiry).
9. **Admin:** see section 16.
10. **Mobile bottom nav (4 tabs):** دردشة / بحث / الامتحانات / حساب. 60px + safe-area.

### 12.4 localStorage keys
`egs_theme`, `egs_token`, `egs_user` (JSON, coins kept in sync), `egs_device_id`, `egs_dismissed_notifications`, `egs_registered_before`, `egs_chat_mode`. No sessionStorage.

### 12.5 SSE consumption
`fetch` → `res.body.getReader()` → line-buffered `data:` JSON parse. Placeholder AI message with `isThinking:true`; 1 s timer increments thought duration; `done` updates coins, points, session id; handles `error` event by displaying visible error message bubbles in chat.

---

## 13. Mobile App

Flutter, one file: `mobile/lib/main.dart` (~9,440 lines). Material 3, `Locale('ar','EG')`, every screen wrapped in `Directionality(rtl)`, Cupertino page transitions, `setState` only, `ValueNotifier<ThemeMode>` + mutable `EgsTheme.current` for theming.

### 13.1 Identity
`egs_ai` 1.0.0+1; Android `com.egs.ai.egs_ai`; label "EGS AI"; `kAppVersionCode=1`, `kAppVersionName='1.0.0'` for force-update comparison. `speech_to_text` and `audioplayers` native dependencies removed.

### 13.2 Screen / navigation map (imperative, no named routes; NO bottom nav — AppBar + endDrawer)
```
ChatHomeScreen (hub)
├── endDrawer: grade picker, theme picker, → ExamsScreen, → PrivacyPolicyScreen,
│   ProfileBottomSheet, beta dialog, session list (filtered by grade) + delete, login/logout
├── AuthSheetWidget (DraggableScrollableSheet 0.5–0.92): login / register / OTP step
│   └── links → PrivacyPolicyScreen / TermsOfUseScreen; Google grade dialog
├── Notification center (bottom sheet, ≤70% height)
├── Force-update dialog (PopScope blocked when mandatory) → url_launcher
└── ExamsScreen → TakeExamScreen → GradedResultScreen
```

### 13.3 Key widgets
`_WelcomeScreen` (animated orbs, pulsing logo, suggestion cards, guest login card), `ChatBubbleWidget` (user olive-gradient bubble; AI card with accent stripe, SearchStepsPanel, ThoughtProcessWidget, MarkdownFormatterWidget, copy/report/retry), `_PremiumInputBar` (image chip → `ImageEditorScreen` → upload, audio chip, model menu with guest padlock, interaction-mode menu (سقراطي/شرح/ملخص), mic (Android-only native recorder + live `speech_to_text` ar_EG; recorded file transcribed via `POST /api/chat/transcribe`), thinking toggle, animated send; action row horizontally scrollable to avoid overflow on narrow screens), `ImageEditorScreen` (full-screen crop + `CustomPainter` brand-palette markup + undo before upload; exports PNG), `MarkdownFormatterWidget` (headers/lists/tables/fences/inline; `flutter_math_fork` for `$$`,`\[..\]` block + `$`,`\(..\)` inline math; `_SvgDiagram` with XML sanitizer + pinch zoom 0.5–4x), `InteractiveQuizWidget`, `ExamInviteWidget`, `AudioMessagePlayer` (base64 → temp file), `ProfileBottomSheet`, `_BootLoader` splash.

### 13.4 Data access (IMPORTANT architectural debt)
- Web API used for: chat SSE, image upload (Bearer), voice transcription (`/api/chat/transcribe`), login/register/OTP/Google, password change (`/api/auth/update-profile`), **all exam operations** (`GET/POST /api/exams`, `/api/exams/generate`, `/api/exams/submit`, `/api/exams/submissions`) and coin refresh via `/api/config`. **Policy: all NEW features go through the web API only.**
- **Direct Supabase SDK** still used for: profiles (read/update of name/grade), sessions, history, curriculums, system_settings, device_guests, notifications, app_versions, reports.
- `Supabase.initialize` embeds a key that is actually a **service_role JWT** — critical security issue (section 21); scope shrunk by the exam/password migration but the key must still be rotated.
- API base URL resolved from `system_settings.website_link` (fallback `http://localhost:3000`).

### 13.5 SharedPreferences keys
`auth_token` (user UUID), `auth_user` (profile JSON), `device_id`, `selected_grade`, `selected_subject`, `theme_mode`, `chat_mode`, `dismissed_notifications`, `egs_registered_before`.

### 13.6 Permissions
Android: `INTERNET`, `READ_EXTERNAL_STORAGE (maxSdk 32)`, `READ_MEDIA_AUDIO`, `RECORD_AUDIO`; runtime mic request. iOS: mic + speech-recognition usage strings (Arabic) — though recording is Android-only in code. Note: Info.plist contains a `SceneDelegste` misspelling (potential iOS issue).

### 13.7 Mobile defaults / limits
Grade `3_high`, subject `الفيزياء`, model `flash`, interaction mode `detailed`, guest coins 5.0, history window 6 messages, session title 30 chars, image ≤5 MB, audio ≤20 MB, transcription timeout 60 s.

---

## 14. Theming and Design System

Brand identity: **olive green on near-black**, Arabic-first, glassmorphism, no emojis in UI chrome (Lucide icons on web).

### 14.1 Brand colors (both platforms)
| Token | Value |
|---|---|
| Primary olive | `#7DA146` |
| Primary hover / accent | `#91B854` |
| Gradient | `135deg #7DA146 → #91B854 → #a8cc60` (web); `#7DA146 → #91B854` (mobile) |
| Dark olive (mobile) | `#5C7A34` |
| Secondary beige | `#EAD7B7` |
| Theme color / dark bg | `#0D0E0B` |

### 14.2 Web dark tokens (`:root` in globals.css)
bg `#0D0E0B`, elevated `#111209`, sidebar `#141510`, card `#1C1E17`, card-hover `#22251C`, input `#181A13`; text `#F0F2EC` / `#C8CCC0` / muted `#8A9080`, on-primary `#0D0E0B`; borders white-alpha 0.07/0.15, primary-border rgba(125,161,70,0.3); status: danger `#f87171`, warning `#fbbf24`, success `#7DA146`, info `#60a5fa`; radii 6/10/16/24/32/full; transitions fast .15s / base .22s / slow .35s / spring .4s; glass `rgba(28,30,23,0.85)` blur 14px.

### 14.3 Web light tokens (`html[data-theme='light']`)
bg `#F8F9F5`, surfaces `#FFFFFF`, sidebar `#F0F2EA`, text `#1C1E17`/`#5C6154`/`#8E9484`, on-primary `#FFFFFF`, black-alpha borders.

### 14.4 Mobile palettes (`EgsTheme.dark` / `EgsTheme.light`)
Dark: bgDeep `#0A0B08`, surface `#0D0E0B`, card `#141510`, elevated `#1A1C14`, input `#181A13`, border `#252720`, text `#EEEEEE`/`#9A9A8A`/`#5A5A4A`. Light: bgDeep `#F4F6F0`, surface `#F7F9F3`, card `#FFFFFF`, elevated `#F1F3EB`, input `#ECEFE6`, border `#E2E6D9`, text `#1B1D16`/`#5D6153`/`#8E9382`. Font family "Cairo" is referenced but **no font asset is bundled** (falls back to system font — known issue).

### 14.5 Score colors (both platforms)
≥80 green (ممتاز جداً), ≥50 orange (جيد — يحتاج تحسين), <50 red (ضعيف). Mobile submission tiles use green ≥50.

---

## 15. Responsive Design Requirements

These are hard product requirements (see `CODING_GUIDELINES.md` rules 2–3):

**Web** must render correctly with no missing/cut elements on all screen sizes. Current mechanisms:
- Breakpoints: `max-width: 768px` (mobile: bottom nav, overlay sidebar, 16px input font to kill iOS zoom, scrollable tables/pre/math), `480px`, `360px` (bottom-nav labels), `hover:none` (drop hover lifts), `prefers-reduced-motion`.
- JS `isMobile = window.innerWidth < 768` gates conditional rendering.
- Safe-area insets (`env(safe-area-inset-bottom)`) on bottom nav/composer/sheets; `100dvh` body.
- **Known gaps to fix when touched:** admin dashboard fixed 2-column grids and exams `1.2fr 0.8fr` grid never collapse to 1 column on phones; session delete button is hover-revealed (invisible on touch); pinch zoom disabled by `maximumScale: 1`.

**Mobile (Flutter)** must be fully responsive with **no overflow errors — the "yellow striped bar"** (Flutter's debug overflow stripes) must never appear, and element dimensions must fit all devices. Known overflow risks to fix when touched:
- `ExamsScreen` fixed two-column `Row` (flex 3/2) regardless of width — long Arabic titles overflow narrow screens.
- `AudioMessagePlayer` fixed `width: 280` inside a bubble with 52px margins.
- Markdown `Table` not width-constrained.
- Rule of thumb: wrap risky `Row` children in `Expanded`/`Flexible`, constrain with `LayoutBuilder`/`MediaQuery`, make wide content horizontally scrollable, and test at 320dp width.

---

## 16. Admin Panel

Web only (`activeTab==='admin'`, `role==='admin'`). Five sections:
1. **Overview (المناهج والإحصائيات):** stats cards (total students, per-grade counts, highest-usage user, most active grade); grade activation checkboxes; curriculum upload (.md only, grade+subject → chunking pipeline); website_link setting (this is what the mobile app reads as API base URL — changing it repoints every mobile client); curriculum table (inline rename, publish toggle, full Markdown editor modal "تعديل المحتوى", delete).
2. **Users (المستخدمون):** search, unlimited-credit toggle, delete (non-admin only).
3. **Notifications (الإشعارات):** create (title/body/type/target), activate/deactivate, delete.
4. **Reports (البلاغات):** filter by status, mark reviewed/dismiss, delete.
5. **Versions (إصدارات التطبيق):** create Android version rows (code, name, Play URL, notes, mandatory), delete. Drives mobile force-update.

---

## 17. Deployment and Environments

- **Production Hosting:** Vercel (`web/`). Deployed via `vercel --prod` to `https://www.egsaiedu.com` (`https://web-cw8lyrzdj-sohaib5.vercel.app`).
- **Target:** Next.js on Vercel platform. Build pipeline uses Next.js Turbopack compiler (`next build`).
- Nearly all API routes are edge runtime; `chat/upload-image` is Node (edge removed in commit 63a6dcb).
- Local dev: `npm run dev` in `web/` (works without Supabase using `db_data.json`); `flutter run` in `mobile/` (no dart-defines needed — exams now go through the web API).
- Vercel project link configured in `web/.vercel/`.
- **No CI/CD, no tests on web, 1 smoke test on mobile, no cron jobs** — all periodic behavior (guest coin reset, etc.) is lazy-on-read.

---

## 18. Environment Variables

| Name | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web `db.ts` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | web `db.ts` | Service-role key (bypasses RLS; server only) |
| `JWT_SECRET` | web `auth_helpers.ts` | HMAC session-token secret; prod refuses to run unset |
| `DEEPSEEK_API_KEY` | web `deepseek.ts`, `exams/*` | DeepSeek LLM (server-side only; mobile no longer embeds it) |
| `EDENAI_API_KEY` | web `gemini.ts`, `chat/upload-image`, `chat/transcribe` | Gemini chat + embeddings + VQA + STT via EdenAI |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | web `auth/register` | OTP email |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | web google route + GSI button | Google OAuth (hardcoded fallback ID exists in source) |
| `NEXT_PUBLIC_SITE_URL` | layout/sitemap/robots | Canonical URL (fallback `https://egsaiedu.com`) |
| `KASHIER_MERCHANT_ID` | web `kashier.ts`, API routes | Kashier Merchant ID (`MID-47766-857`) |
| `KASHIER_SECURITY_KEY` | web `kashier.ts`, webhook | Kashier Webhook & Callback HMAC Security Key |
| `KASHIER_API_KEY` | web `kashier.ts`, initialize | Kashier Payment API Key (Order Hash calculation) |
| `KASHIER_MODE` | web `kashier.ts` | Kashier Environment Mode (`live` / `test`) |
| `NEXT_PUBLIC_KASHIER_MERCHANT_ID` | web `page.tsx` | Kashier public merchant identifier |
| `NEXT_PUBLIC_KASHIER_MODE` | web `page.tsx` | Kashier client mode (`live`) |

`web/.env.example` documents these environment variables. Never commit real values.

---

## 19. Seed / Default Data

- **SQL default admin:** id `a3e0f065-9856-424d-8dc8-b4b3cf0b89cf`, phone `01147814652`, name `مدير النظام`, role admin, plan max, coins 1000, unlimited_credit.
- **External Testing / Payment Gateway Test Account:** id `f0000000-0000-4000-a000-000000000001`, email `test@egsaiedu.com`, password `TestAccount2026!`, phone `01000000000`, name `حساب اختباري (Test Account)`, grade `3_high`, role `admin`, plan `max`, `unlimited_credit: true`, `coins: 10000`. Present in production Supabase database and `db_data.json`.
- **Local-dev seeds (`db_data.json` / `db.ts` init):** admin `admin@egsaiedu.com` (id `admin-id-1234567890`) and test student `صهيب حسين` / `student@egsaiedu.com` (grade `1_high`).
- `system_settings.website_link = http://localhost:3000`.
- **No curriculum seed data** — curricula are uploaded via the admin panel post-deploy.

---

## 20. Known Issues and Technical Debt

(Keep this list current. Fix opportunistically when touching the affected area, per guideline 7.)

**Web:**
1. `console.log("RENDERING APP messages:", ...)` fires every render (page.tsx ~3531) — leaks chat content.
2. SSE `error` events swallowed by the partial-JSON catch.
3. `--card-border` self-referential var in dark mode (code blocks lose their border).
4. Typo "الاصعتاعي" in exam-generation error; two English error strings shown to Arabic users.
5. Admin + exams grids not responsive (section 15); hover-only session delete; `maximumScale:1`.
6. `page.module.css` dead code; guest-messaging plumbing built but guests fully gated (inconsistent product state).
7. Deleted-exam history view fabricates a mock exam with current subject metadata.
8. Native `alert()`/`confirm()` used throughout; no error boundary.

**Backend:**
11. `/api/admin/curriculum/detail` POST re-chunks with legacy v1 chunker — silently destroys v2 hierarchy + embeddings until re-upload.
12. Dashboard stats load all profiles + all chat history into memory.
13. Dead guest branches in chat route; `gpt-tokenizer` in config but never imported; `countTokens` is a x1.4 word-count approximation.
14. No rate limiting, no middleware.ts, no CORS config anywhere.
14b. `[CREATE_EXAM]` chat tag still carries `correct_answer`/`explanation` inline in the stored AI message (protocol-level leak readable in raw chat history); the `/api/exams*` payloads are stripped, but chat-emitted exams need server-side generation to close this fully.

**Mobile:**
15. Remaining direct Supabase table access (profiles name/grade updates, sessions, history, notifications, versions, reports, config) should move behind the web API (exams, coins, and password writes already migrated).
16. Release builds signed with debug keys; applicationId TODO.
17. "Cairo" font referenced but not bundled.
18. Hardcoded dark colors in some widgets break light mode (inline-code bg `#242620`, white text on guest login card, exam dialogs).
19. `IntrinsicHeight` in every AI bubble (perf on long chats); ListView keyed by index.
20. Quiz essay `onAnswerSubmit` wired to a no-op.
21. Version check filters `platform='android'` only — iOS would never see force updates.
22. iOS Info.plist `SceneDelegste` misspelling (potential iOS issue).
23. Overflow risks listed in section 15 (ExamsScreen Row, AudioMessagePlayer fixed width, tables).

---

## 21. Security Posture and Required Fixes

Per guideline 6, code must be free of critical vulnerabilities. Current state, ordered by severity — do not reintroduce any of these patterns, and fix them when working in the affected area:

1. **CRITICAL — service_role key embedded in the Flutter client** (`main.dart` `Supabase.initialize`). Grants full DB read/write to anyone who decompiles the APK. Exposure shrunk (exams, coins, password writes now go through the web API) but the key itself remains. Fix: rotate the key, use the anon key + RLS, or route the remaining direct queries (section 13.4) through the web API.
2. **HIGH — plaintext admin password formerly in a source comment** (removed from `db.ts`); its sha256 hash remains committed in `supabase_schema.sql` + `db_data.json`. Rotate the credential and purge from git history.
3. **HIGH — no RLS on any table** while a service key exists in a shipped client (compounds issue 1).
4. **MEDIUM — no rate limiting** on login/OTP/register (brute-forceable; OTPs now crypto-random with 10-min expiry, which mitigates but does not eliminate this).
5. **MEDIUM — admin users search interpolates user input into a PostgREST `.or()` filter** (filter injection).
6. **MEDIUM — `x-device-id` client-supplied** — guest quotas trivially resettable.
7. **LOW — hardcoded Google client ID fallback; sessions non-revocable for 30 days; `check-profiles.js` dumps password hashes to console; legacy sha256 password hashes persist for users who have not logged in since the PBKDF2 migration.**

Fixed (2026-07-16, do not reintroduce): universal OTP backdoor `111111` (all flows); unsalted-SHA-256-only password hashing (now PBKDF2 with transparent upgrade); unauthenticated/unmetered `/api/chat/upload-image` (now Bearer + coins + size cap); exam model answers leaking pre-submission from `/api/exams*` (now stripped, revealed only in the submit response); mobile client-side coin deduction and `password_hash` writes (now server-side via the web API).

Mitigations already in place (preserve them): PBKDF2 password hashing with transparent legacy upgrade; crypto-random expiring OTPs; server-side Google ID-token signature verification; constant-time HMAC token comparison; DOMPurify + prompt-level SVG whitelisting on both clients; payload caps on report/log/notification fields; admin role checks on all admin routes; session ownership checks; self-delete prevention; KaTeX `trust:false`; exam answers withheld until submission; auth + metering on the image-analysis proxy.

---

## 22. Coding Guidelines

The mandatory rules live in **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** in this folder. Summary: no emojis in design; web responsive on all screen sizes with nothing missing; Flutter UI must never overflow (no yellow striped bars) with correct dimensions; concise clean code with sparse comments and no emojis in code; latest stable technologies; zero critical vulnerabilities; when a change touches a feature linked to other pages/screens/layers, update those too so the feature works end-to-end — even when not explicitly asked (unless told not to); and after every completed task, update this PRD to reflect the change (rule 8).

Cross-cutting change map (what "linked" means in this project):
- **Chat protocol tags** (section 11): backend prompt (`deepseek.ts`) + web parser (`page.tsx`) + mobile parser (`main.dart` `MarkdownFormatterWidget`).
- **API contract:** any route change → web fetch calls in `page.tsx` + mobile calls in `main.dart`.
- **DB schema:** SQL migration + `db.ts` interfaces/queries + mobile direct queries + `db_data.json` local shape.
- **Theming:** web `globals.css` tokens + mobile `EgsTheme` palettes must stay visually consistent.
- **Grades/subjects/plans enums:** `GRADE_NAMES` (web), `_gradeNames`/`_planNames` (mobile), validation whitelists (auth routes), SQL comments.
- **Versioning:** bumping mobile version → update `pubspec.yaml` version, `kAppVersionCode`/`kAppVersionName` in `main.dart`, and create an `app_versions` row via the admin panel.

# EGS AI — Product Requirements Document (PRD)

> **Purpose of this file:** Single source of truth for the entire project. It is written so that an AI agent (or a new developer) can understand the whole product, architecture, data model, API surface, UI, and known issues **without reading the codebase first**. Read this file and `CODING_GUIDELINES.md` (same folder) before making any change.
>
> **Last updated:** 2026-09-02 (Interactive Multi-Screen Guided App Tour System: Implemented an intelligent, responsive App Tour triggered on first-time registration and per-screen first visits across Chat, Exams, Flashcards, Leaderboard, and Subscriptions. The Chat tour follows a strict 3-stage instructional sequence: 1) Welcome & screen definition, 2) Subject selector spotlight encouraging selection, and 3) Multi-stage interactive Submit Box walkthrough featuring automated question prefill ['اشرحلي بالتفصيل وبأمثلة واضحة أول درس في منهج...'], Deep Thinking & study mode explanation, AI model differentiation [Fast vs. Pro reasoning], and one-click Submit action to experience live AI streaming; all in authentic Egyptian Arabic with zero emojis and header/sidebar tour replay triggers).
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
7. [Backend API Reference](#7-backend-api-reference)
8. [AI Pipeline (RAG, Providers, Prompts, Streaming)](#8-ai-pipeline)
9. [Coin (Points) Economy](#9-coin-points-economy)
10. [Authentication and Sessions](#10-authentication-and-sessions)
11. [Message Protocol Tags](#11-message-protocol-tags)
12. [Web Frontend (Next.js)](#12-web-frontend)
13. [Theming and Design System](#13-theming-and-design-system)
14. [Responsive Design Requirements](#14-responsive-design-requirements)
15. [Admin Panel](#15-admin-panel)
16. [Deployment and Environments](#16-deployment-and-environments)
17. [Environment Variables](#17-environment-variables)
18. [Seed / Default Data](#18-seed--default-data)
19. [Known Issues and Technical Debt](#19-known-issues-and-technical-debt)
20. [Security Posture and Required Fixes](#20-security-posture-and-required-fixes)
21. [Coding Guidelines](#21-coding-guidelines)

---

## 1. Product Overview

**Name:** EGS AI (repo name "EGA-AI"). Official Release Version (Production Launch).

**What it is:** An Arabic-language AI tutor ("smart assistant / teacher") for students of the **Egyptian national curriculum** — middle school (اعدادي) and high school (ثانوي). Students chat with an AI that answers strictly from their grade's uploaded curriculum, take AI-generated exams, get AI grading with feedback, and upload images of problems for analysis.

**Subscriptions & Pricing:**
- **Monthly Pro Subscription (اشتراك شهر - باقة برو):** 50 EGP / month. Full access to Pro AI models, Deep Thinking, daily coin renewals, and unlimited exam generation.
- **Two-Month Subscription (اشتراك شهرين):** 100 EGP / 2 months.
- **Three-Month Subscription (اشتراك 3 أشهر):** 250 EGP / 3 months.
- **Cancellation & Refund Policy:** Requests allowed within 3 days (72 hours) of purchase strictly provided that the user has consumed 0 points from the subscription package.
- **Payment Processing:** **Kashier (كاشير)** payment gateway on Web (Visa, Mastercard, Meeza, Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, Instapay; SSL 256-bit PCI-DSS encrypted).
- **Support Contact Channels:** Phone / WhatsApp: `01037220587`, Email: `sohaib572010@gmail.com`, dedicated Web page `/contact`.

**Platforms:**
- **Web:** Next.js single-page app at `web/` + Progressive Web App (PWA) with offline Service Worker support and desktop/mobile installation — Arabic, RTL, dark/light themes. Production domain: `https://egsaiedu.com`.
- **Curriculum Generator:** Standalone Next.js application at `Curriculum Generator/` running on localhost (port 3005) for concurrent multi-curriculum PDF OCR extraction & RAG Markdown optimization.

**Target users:**
- **Students** (role `student`): 5 grade levels — Preparatory Stage: `1_middle`, `2_middle`, `3_middle` (الصف الأول/الثاني/الثالث الإعدادي); Secondary Stage: `1_high` (الصف الأول الثانوي), `2_high` (السنة الثانية بكالوريا مع 4 مسارات تخصصية: مسار الطب وعلوم الحياة، مسار الهندسة وعلوم الحاسب، مسار إدارة الأعمال، مسار الآداب والفنون). Default grade everywhere: `1_high`.
- **Admin** (role `admin`): manages curricula, placeholder subjects, tracks, users, notifications, reports via the web admin dashboard.
- **Guests:** device-ID-based; plumbing exists (5 free messages, 5.0 coins/day) but chat and exams currently hard-gate all guests behind login.

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
│   │   │   ├── globals.css    Design system tokens (#FFB703 / #00B4D8 / #7209B7 on #0D1B2A / #F8F9FA)
│   │   │   └── api/           
│   │   │       ├── process/   GET/POST multi-worker queue processor manager & markdown preview
│   │   │       ├── upload/    POST multipart PDF file uploader with instant page counts
│   │   │       └── download/  GET export processed Markdown files
│   │   └── lib/
│   │       ├── types.ts       GradeLevel, FileQueueItem, PageExtractionResult, JobCheckpoint, QueueStateData
│   │       ├── pdf_parser.ts  Cached PDFDocumentHandler & @napi-rs/canvas fast JPEG page renderer
│   │       ├── eden_vision.ts Multi-tier EdenAI Vision OCR API client with network disconnect exponential retry backoff
│   │       ├── deepseek_organizer.ts DeepSeek RAG optimization prompt with strict single-line unit cover extraction, ## lesson/chapter/topic title isolation, verbatim explanation preservation, and LaTeX formulas
│   │       ├── curriculum_cleaner.ts Sanitizer and deduplicator for sequential unit numbering repair, ## lesson/chapter/reader/topic header preservation, margin footer rejection, and unit cover clutter stripping
│   │       ├── checkpoint_manager.ts Persistent queue state (queue_state.json) & page-level checkpointing for zero data loss
│   │       └── queue_processor.ts Multi-Curricula Concurrent Worker Pool manager with speed metrics & fault isolation
│   └── output/                Stage-organized output Markdown files (output/<grade_level>/<subject>.md)
└── web/                       Next.js SPA & PWA Web Application
    ├── package.json           name "myapp-web", Next.js 16.2.9, React 19.2.4
    ├── wrangler.toml          Cloudflare: name "myapp-web", nodejs_compat
    ├── tsconfig.json          strict, paths @/* -> ./src/*
    ├── eslint.config.mjs      eslint-config-next core-web-vitals + typescript
    ├── supabase_schema.sql            Base schema v2 (destructive, full rebuild)
    ├── supabase_migration_beta.sql    Additive beta migration
    ├── supabase_migration_email_auth.sql  Email/Google auth migration
    ├── supabase_migration_security.sql    OTP expiry + password_resets table
    ├── supabase_migration_phase1.sql      chat_sessions.mode (interaction modes)
    ├── db_data.json           Local-dev JSON database (fallback when no Supabase env)
    ├── check-profiles.js      Dev utility: dumps profiles table via service key
    ├── CLAUDE.md -> @AGENTS.md    Next.js 16 breaking-changes warning
    ├── public/                logo.png (512x512), sw.js (PWA Service Worker), default SVGs
    └── src/
        ├── app/
        │   ├── layout.tsx     Root layout: metadata, ar/RTL, fonts, GSI script, JSON-LD, PWA SW registration
        │   ├── page.tsx       ENTIRE SPA (~6,880 lines): all views, components, state, PWA install prompt
        │   ├── globals.css    Full design system (1,527 lines): tokens, themes, breakpoints
        │   ├── page.module.css    DEAD CODE (unused create-next-app template)
        │   ├── terms/page.tsx     Terms of use & Return Policy (Arabic, 10 sections, #refund anchor)
        │   ├── privacy/page.tsx   Privacy policy (Arabic, 10 sections, standalone-page-scroll)
        │   ├── contact/page.tsx   Dedicated Contact Us Page (/contact) + ContactForm
        │   ├── download/page.tsx  Dedicated PWA Application Download & Install Guide (/download)
        │   ├── delete-account/page.tsx Dedicated Account Deletion Page
        │   ├── sitemap.ts / robots.ts / manifest.ts   SEO + PWA
        │   └── api/           Route handlers (see section 7)
        ├── components/
        │   └── ContactForm.tsx  Interactive contact & refund request form component
        └── lib/
            ├── db.ts          (~2,040 lines) All DB access + RAG search + coin logic
            ├── deepseek.ts    DeepSeek client + main system prompt builder
            ├── gemini.ts      Gemini-via-EdenAI: query intelligence, gap check, summaries
            ├── email.ts       Resend OTP email sender (register + password-reset templates)
            └── auth_helpers.ts    PBKDF2 hashing (+legacy sha256 verify), OTP gen, HMAC session tokens
```

**Critical fact:** the web client is effectively a single-file app (`page.tsx`). Any UI change happens in that file; any style change on web happens in `globals.css`.

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
| AI: transcription | EdenAI `speech_to_text_async` (`providers=google`, fallback `openai`, `language=ar`) | — | Via `POST /api/chat/transcribe` (polling ~1s, 45s budget) |
| Email | Resend REST API | — | OTP emails, sender `no-reply@egsaiedu.com` |
| Deployment | Cloudflare Pages via `@cloudflare/next-on-pages` 1.13.16, built with Vercel CLI Build Output v3 | — | Most API routes declare `runtime='edge'` |

---

## 4. Core Domain Concepts

- **Grade levels (fixed enum):** `1_middle`, `2_middle`, `3_middle`, `1_high`, `2_high`. (Third year secondary `3_high` has been removed). Arabic names map in `page.tsx` (`GRADE_NAMES`):
  - `1_middle`: الصف الأول الإعدادي
  - `2_middle`: الصف الثاني الإعدادي
  - `3_middle`: الصف الثالث الإعدادي
  - `1_high`: الصف الأول الثانوي
  - `2_high`: السنة الثانية بكالوريا (الصف الثاني الثانوي)
- **Baccalaureate Specialization Tracks (`2_high`):**
  1. **مسار الطب وعلوم الحياة (`medicine_life_sciences`)**
  2. **مسار الهندسة وعلوم الحاسب (`engineering_cs`)**
  3. **مسار إدارة الأعمال (`business`)**
  4. **مسار الآداب والفنون (`arts_literature`)**
  - **Dynamic Subject Assignment:** المواد الاختيارية والمشتركة لكل مسار لا تعتمد على أي قيم ثابتة مشفرة مسبقاً، بل تُستخرج ديناميكياً وحصرياً من المواد والمناهج التي يضيفها المسؤول عبر لوحة التحكم (`curriculums` حيث يتم تحديد المسار `track_id` وتحديد ما إذا كانت المادة اختيارية `is_elective = true` أو مشتركة `!track_id`).
- **Placeholder Curricula (المناهج قيد الإعداد والتجهيز):** Admin can register upcoming subjects without immediately uploading Markdown content (`is_placeholder = true`). Placeholder subjects display normally to students with a "قيد الإعداد" badge and a friendly modal notice, while chat messaging, exam generation, and flashcards are temporarily disabled until the admin attaches the curriculum file.
- **Subjects:** free-form Arabic text (e.g. الأحياء, الكيمياء, الرياضيات المتخصصة). A subject exists for a grade only if an admin added/uploaded a curriculum for `(grade_level, subject_name)`.
- **Curriculum:** one Markdown document per (grade, subject), chunked hierarchically (parent sections + embedded child chunks) for RAG. Admin can publish/unpublish via `active_curriculum_ids`, gate whole grades via `active_grade_levels`, and toggle active tracks via `active_tracks` (all in `system_settings`).
- **Coins:** usage currency. Registered default 50.0; replenished daily up to the plan cap (free 15 / pro 50 / max 100 — `DAILY_COIN_CAPS`); guests 5.0/day. Deducted per token usage (see section 9). `unlimited_credit` flag or `admin` role bypasses deduction.
- **Plans:** `free` / `pro` / `max` on `profiles.plan_type` — determine the daily coin cap (section 9); otherwise cosmetic during beta (badges; pro model unlocked for all registered users).
- **Session:** a chat conversation (`chat_sessions`), tied to a subject + grade; messages in `chat_history`.
- **Models:** `flash` (DeepSeek chat, default) and `pro` (DeepSeek reasoner). `thinking` boolean toggles chain-of-thought streaming.
- **Interaction modes:** `socratic` / `detailed` (default) / `summary` — per-session AI teaching style (`chat_sessions.mode`), selected in the chat composer and appended as a behavioral block to the system prompt.
- **Reports:** students can flag an AI answer; admin reviews (`pending`/`reviewed`/`dismissed`).
- **Notifications:** general platform broadcasts (`user_id NULL`) or targeted personal notifications (e.g. subscriber activation confirmations with `user_id UUID`), with types `info`/`success`/`warning`/`maintenance` targeted to `web`/`phone`/`both`; dismissals stored client-side.

---

## 5. System Architecture

```
┌─────────────┐        ┌──────────────────────────────┐       ┌──────────────────┐
│ Web browser │─HTTPS─▶│ Next.js app (Cloudflare/Vercel)│─────▶│ Supabase Postgres │
│ (page.tsx)  │  SSE   │ API routes + src/lib          │ svc   │ pgvector + RRF RPC│
└─────────────┘        │  key                          │       └──────────────────┘
                       │  ├── DeepSeek API (chat/exams)│
                       │  ├── EdenAI (Gemini, embed,   │
                       │  │    VQA)                    │
                       │  └── Resend (OTP email)       │
                       └──────────────────────────────┘
```

- The web client communicates **only** with its own `/api/*` routes.
- Server-side routes utilize the Supabase service-role key with secure validation and authentication.

---

## 6. Database Schema

Supabase PostgreSQL with `vector` extension. **No RLS anywhere** — all access goes through the service-role key with app-level authorization. Schema files (apply in order): `supabase_schema.sql` (destructive base), `supabase_migration_beta.sql` (additive), `supabase_migration_email_auth.sql` (email auth), `supabase_migration_security.sql` (OTP expiry + password resets), `supabase_migration_baccalaureate_tracks.sql` (Baccalaureate tracks & placeholders).

### 6.1 `profiles`
| Column | Type | Default / Constraint |
|---|---|---|
| id | UUID | PK |
| phone | TEXT | UNIQUE, nullable (was NOT NULL pre-email migration) |
| email | TEXT | UNIQUE (added by email migration) |
| name | TEXT | NOT NULL |
| grade_level | TEXT | NOT NULL, one of the 5 grades (`1_middle`, `2_middle`, `3_middle`, `1_high`, `2_high`) |
| track_id | TEXT | nullable (`medicine_life_sciences`, `engineering_cs`, `business`, `arts_literature`) |
| elective_subject | TEXT | nullable (student chosen elective subject) |
| plan_type | TEXT | NOT NULL default `'free'` (`free`/`pro_1m`/`pro_2m`/`pro_3m`/`pro`/`max`) |
| subscription_status | TEXT | NOT NULL default `'inactive'` (`'active'`/`'inactive'`/`'expired'`) |
| subscription_start_date | TIMESTAMPTZ | nullable (activation timestamp) |
| subscription_end_date | TIMESTAMPTZ | nullable (expiry timestamp, 30/60/90 days from activation) |
| subscription_plan_id | TEXT | nullable (`pro_1m`, `pro_2m`, `pro_3m`) |
| role | TEXT | NOT NULL default `'student'` (`student`/`admin`) |
| password_hash | TEXT | NOT NULL (sha256; empty string for Google accounts) |
| coins | NUMERIC | NOT NULL default 15.0 |
| points | NUMERIC | NOT NULL default 0 (ranking points merit score) |
| study_streak | INT | NOT NULL default 1 |
| last_active_date | DATE | NOT NULL default CURRENT_DATE |
| unlimited_credit | BOOLEAN | NOT NULL default false (admins set true) |
| terms_accepted_at | TIMESTAMPTZ | nullable |
| created_at | TIMESTAMPTZ | default NOW() |

### 6.2 `pending_registrations` (post email-auth migration)
`email TEXT PK`, `phone TEXT NULL`, `name TEXT NOT NULL`, `grade_level TEXT NOT NULL`, `track_id TEXT NULL`, `elective_subject TEXT NULL`, `password_hash TEXT NOT NULL`, `otp TEXT NOT NULL`, `expires_at TIMESTAMPTZ` (10-min OTP TTL; added by `supabase_migration_security.sql`), `terms_accepted_at TIMESTAMPTZ`, `created_at TIMESTAMPTZ DEFAULT NOW()`. Rows removed on successful OTP verify or on expired-OTP attempts.

### 6.2b `password_resets` (added by `supabase_migration_security.sql`)
`user_id UUID PK FK → profiles CASCADE`, `otp TEXT NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`. One active reset per user (upsert); deleted on success or expiry.

### 6.2c `account_deletions` (added by `supabase_migration_account_deletion.sql`)
`user_id UUID PK FK → profiles CASCADE`, `email TEXT NOT NULL`, `otp TEXT NOT NULL`, `expires_at TIMESTAMPTZ NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()`. Stores public email OTP deletion requests (10-min expiry); deleted on OTP verification or expiry.

### 6.3 `device_guests`
`device_id TEXT PK`, `free_message_count INTEGER NOT NULL DEFAULT 0`, `last_message_date DATE NOT NULL DEFAULT CURRENT_DATE`, `coins NUMERIC NOT NULL DEFAULT 5.0` (reset to 5.0 lazily on first request of a new day).

### 6.4 `curriculums`
`id UUID PK`, `grade_level TEXT NOT NULL`, `subject_name TEXT NOT NULL`, `file_name TEXT NOT NULL`, `units JSONB NOT NULL DEFAULT '[]'::jsonb`, `is_placeholder BOOLEAN NOT NULL DEFAULT false`, `track_id TEXT NULL`, `is_elective BOOLEAN NOT NULL DEFAULT false`, `created_at`, **UNIQUE(grade_level, subject_name)**. Holds curriculum metadata, units/lessons hierarchy, track associations, and placeholder state.

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
`key TEXT PK`, `value TEXT NOT NULL`. Known keys: `website_link` (seed `http://localhost:3000`), `active_grade_levels` (JSON array of enabled grades), `active_tracks` (JSON array of enabled Baccalaureate tracks: `['medicine_life_sciences', 'engineering_cs', 'business', 'arts_literature']`), `active_curriculum_ids` (JSON array).

### 6.7 `chat_sessions`
`id UUID PK`, `user_id UUID FK → profiles CASCADE`, `device_id TEXT NULL`, `title TEXT NOT NULL` (first ~35 chars of first message), `subject_name TEXT NOT NULL`, `grade_level TEXT NOT NULL`, `mode TEXT NOT NULL DEFAULT 'detailed'` (`socratic`/`detailed`/`summary`, added by `supabase_migration_phase1.sql`), `engagement_points_awarded BOOLEAN NOT NULL DEFAULT false`, `created_at`.

### 6.8 `chat_history`
`id UUID PK`, `user_id UUID FK → profiles SET NULL`, `device_id TEXT NULL`, `sender TEXT NOT NULL` (`'user'`/`'ai'`), `message TEXT NOT NULL`, `coins_cost NUMERIC NOT NULL DEFAULT 0.0`, `session_id UUID FK → chat_sessions CASCADE` (indexed), `created_at`. AI rows may embed `<thought duration="N">...</thought>` prefix.

### 6.9 `exams`
`id UUID PK gen_random_uuid()`, `title TEXT`, `subject_name TEXT`, `grade_level TEXT`, `questions JSONB NOT NULL` (array of `{id, type: multiple_choice|true_false|essay, question, options?, correct_answer, explanation}`), `session_id UUID FK SET NULL`, `user_id UUID FK SET NULL`, `device_id TEXT NULL`, `created_at`.

### 6.10 `exam_submissions`
`id UUID PK`, `exam_id UUID FK CASCADE`, `user_id UUID FK CASCADE`, `device_id TEXT NULL`, `answers JSONB NOT NULL` (`{questionId: answer}`), `score NUMERIC NOT NULL` (0–100), `evaluation TEXT NOT NULL` (Arabic AI feedback), `points_awarded NUMERIC NOT NULL DEFAULT 0`, `is_first_attempt BOOLEAN NOT NULL DEFAULT false`, `submitted_at`.

### 6.11 `reports`
`id UUID PK`, `user_id UUID FK SET NULL`, `device_id TEXT`, `message_id TEXT`, `session_id UUID FK SET NULL`, `reported_content TEXT NOT NULL`, `user_query TEXT`, `reason TEXT NOT NULL`, `status TEXT NOT NULL DEFAULT 'pending'` (`pending`/`action_taken`/`reviewed`/`dismissed`), `action_taken TEXT NULL`, `admin_notes TEXT NULL`, `created_at`. Indexes on status, created_at.

### 6.12 `notifications`
`id UUID PK`, `user_id UUID FK → profiles(id) ON DELETE CASCADE NULL` (null for general broadcasts, user UUID for targeted notifications), `title TEXT`, `body TEXT`, `type TEXT DEFAULT 'info'` (`info`/`success`/`warning`/`maintenance`), `target TEXT DEFAULT 'both'`, `active BOOLEAN DEFAULT true` (indexed), `created_at`. Indexes on `active`, `user_id`.

### 6.13 `flashcard_decks`
`id UUID PK`, `user_id UUID FK → profiles CASCADE`, `subject_name TEXT NOT NULL`, `grade_level TEXT NOT NULL`, `title TEXT NOT NULL`, `created_at TIMESTAMPTZ default NOW()`.

### 6.14 `flashcards`
`id UUID PK`, `deck_id UUID FK → flashcard_decks CASCADE`, `question TEXT NOT NULL`, `answer TEXT NOT NULL`, `box INTEGER NOT NULL DEFAULT 1`, `next_review_at TIMESTAMPTZ default NOW()`, `created_at TIMESTAMPTZ default NOW()`.

### 6.15 `payment_transactions` (added by `supabase_migration_payments.sql`)
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

### 6.16 `user_devices` (added by `supabase_migration_device_limit.sql`)
| Column | Type | Default / Constraint |
|---|---|---|
| id | UUID | PK `gen_random_uuid()` |
| user_id | UUID | FK → `profiles(id)` ON DELETE CASCADE NOT NULL |
| device_id | TEXT | NOT NULL |
| session_token | TEXT | nullable |
| device_name | TEXT | NOT NULL DEFAULT `'جهاز غير معروف'` |
| device_type | TEXT | NOT NULL DEFAULT `'desktop'` (`desktop`/`mobile`/`tablet`) |
| browser_fingerprint | TEXT | nullable |
| ip_address | TEXT | nullable |
| user_agent | TEXT | nullable |
| is_active | BOOLEAN | NOT NULL DEFAULT true |
| last_active_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

Constraints & Indexes:
- **`UNIQUE(user_id, device_id)`**
- Indexes on `(user_id, is_active)`, `device_id`, `session_token`, and `(user_id, last_active_at DESC)`.

### 6.17 `contact_messages` (added by `supabase_migration_customer_service.sql`)
| Column | Type | Default / Constraint |
|---|---|---|
| id | UUID | PK `gen_random_uuid()` |
| name | TEXT | NOT NULL |
| contact_info | TEXT | NOT NULL (phone or email) |
| category | TEXT | NOT NULL DEFAULT `'استفسار عام'` |
| message | TEXT | NOT NULL |
| user_id | UUID | nullable, FK → `profiles(id)` ON DELETE SET NULL |
| status | TEXT | NOT NULL DEFAULT `'pending'` (`pending`, `replied`, `resolved`, `dismissed`) |
| admin_notes | TEXT | nullable |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |

Indexes on `status`, `created_at DESC`, `user_id`.

### 6.18 Local-dev fallback
`web/src/lib/db.ts` uses `./db_data.json` when Supabase env vars are absent AND not on edge runtime. It mirrors the tables above and seeds a hardcoded admin. On edge without Supabase, all reads return empty — **Supabase is mandatory in deployment**.

---

## 7. Backend API Reference

All routes under `web/src/app/api/`. Conventions:
- **Bearer auth:** `Authorization: Bearer <token>` — custom HMAC token (section 10).
- **Guest header:** `x-device-id` (client-generated, spoofable).
- **Admin:** Bearer + DB check `profile.role === 'admin'` (an `authorizeAdmin()` helper duplicated per admin route).
- Nearly all routes declare `export const runtime = 'edge'` (exception: `chat/upload-image`, Node runtime).
- **No request rate limiting exists anywhere.** Error messages are Arabic.

### 7.1 Auth & Device Management
| Route | Method | Body / Params | Behavior |
|---|---|---|---|
| `/api/auth/register` | POST | `{email, password, terms_accepted, name?, grade_level?, track_id?, elective_subject?}` | Simplified signup: requires **email and password only** (+ terms). Validates email regex + terms; PBKDF2 password hash; 6-digit OTP (`crypto.getRandomValues`), 10-min expiry; sends Resend email (RTL Egyptian Arabic template, green branding) via `src/lib/email.ts`; **on email failure returns 502 (no fallback OTP)**; upserts `pending_registrations` with `grade_level` defaulting to `'unselected'` and `name` to `'طالب جديد'`. 400/502/500. |
| `/api/auth/otp` | POST | `{email, otp, has_registered_before, device_id?, browser_fingerprint?, platform?}` | Verifies OTP strictly against stored code; expired OTPs (10 min) are rejected and pending row deleted. Creates profile (`grade_level: 'unselected'` if not set), registers device session under `user_devices` (enforcing max 3 devices limit), deletes pending row, returns `{token, user, is_new_user: true}` to launch the post-registration sequential onboarding wizard. |
| `/api/auth/login` | POST | `{email, password, device_id?, browser_fingerprint?, platform?}` | Verifies via `verifyPassword` (PBKDF2; legacy sha256 accepted and transparently re-hashed to PBKDF2 on success); registers device under `user_devices`. **Max 3 devices limit enforcement**: if user already has 3 active devices, all previous devices are automatically revoked (`is_active = false`) and only this new device becomes active (activeCount = 1). Returns `{token, user}`. |
| `/api/auth/google` | POST | `{credential, grade_level?, track_id?, elective_subject?, device_id?, browser_fingerprint?, platform?}` | Full server-side Google ID-token verification (exp/iss/aud + RSA signature via JWKS, 1h cache). **Quick Registration**: if new user, creates profile directly (`grade_level: 'unselected'`, `name: googleName`, `password_hash: ''`), registers device, grants trial coins, and returns `{token, user, is_new_user: true}` without pre-login modal blocking; triggers the post-registration sequential onboarding wizard inside the platform. |
| `/api/auth/devices` | GET (Bearer) | `?device_id=` | Returns active devices list (`{id, device_id, device_name, device_type, ip_address, last_active_at, is_current_device}`) and active count (`count`). Checks if current device is revoked → 401 `device_session_revoked`. |
| `/api/auth/devices` | DELETE (Bearer) | `?device_id=` or `?action=logout_all_others` or `?action=logout_all` | Deactivates target device or all other devices. Returns `{success: true}`. |
| `/api/auth/logout` | POST (Bearer) | `{device_id?}` | Deactivates the specified device session (`is_active = false`) on user logout. |
| `/api/auth/update-grade` | POST (Bearer) | `{grade_level, track_id?, elective_subject?}` | Whitelist-validated grade update (5 valid grades); persists `track_id` and `elective_subject` for `2_high` (Baccalaureate). |
| `/api/auth/update-profile` | POST (Bearer) | `{action, ...}` | `update-name`; `complete-onboarding` (atomically updates `grade_level`, `track_id`, `elective_subject`, and `name`); `send-otp` (generates crypto-random OTP, emails it via Resend, stores in `password_resets` with 10-min expiry); `verify-otp` (validates stored OTP + expiry) + `new_password` (PBKDF2), deactivates all other devices on password change for security, deletes the reset row on success. |
| `/api/auth/delete-account` | POST (Public / Bearer) | `{action: 'send-otp'|'verify-otp'|'delete-current', email?, otp?}` | Public email OTP deletion or direct Bearer deletion. Permanently cascades/deletes profile, user devices, chat history, exams, submissions, flashcards, reports, and active subscriptions. |

### 7.2 Chat
| Route | Method | Behavior |
|---|---|---|
| `/api/chat` | POST (Bearer required; guests → 401 `login_required`) | Body `{message, subject_name (required), grade_level?, session_id?, model:'flash'|'pro', thinking:boolean, mode?:'socratic'|'detailed'|'summary' (default 'detailed'), history? (guest-only, dead)}`. Flow: validate → profile → coins>0 (else 429 `limit_reached` returning daily renewal message for active plan subscribers, or direct trial-exhausted Pro upgrade CTA for free accounts) → curriculum exists for (grade,subject) (else 400 `course_unavailable`) → auto-create session (title = first 35 chars, stores `mode`; existing sessions get their `mode` synced when it changes) → save user msg → last-6-message history → RAG (section 8) → DeepSeek stream. Messages carrying an `[AUDIO_MESSAGE:...]` prefix are stored raw but sent to the LLM as `[System Note: The following text is a transcription of the student's spoken voice message] <text>` (current message and history alike). **SSE response** (`text/event-stream`), events: `search_step {step,icon,message}`, `thought {content}`, `content {content}`, `done {session_id, duration, coins_used, remaining_coins}`, `error`. Post-stream: coin deduction, AI message saved with `<thought duration="N">` prefix and `coins_cost`. |
| `/api/chat/history` | GET (Bearer) | `?session_id=`; ownership check (403); last 100 messages. |
| `/api/chat/sessions` | GET/POST/DELETE (Bearer) | List (rows include `mode`); create `{title, subject_name, grade_level}`; delete by `?id=` with ownership check (cascade removes messages). |
| `/api/chat/upload-image` | POST (Bearer required) | `{base64, mimeType}` → EdenAI VQA (`google`, fallback `openai`) with a fixed Arabic "describe everything literally" question → `{description}`. Requires coins>0 (else 429); deducts a flat 0.5 coins per analysis; enforces the 5 MB cap server-side (413). |
| `/api/chat/transcribe` | POST (Bearer or `x-device-id`) | `{base64, mimeType, durationSeconds?}` ≤20 MB (413). Requires coins>0 (429). EdenAI `POST /v2/audio/speech_to_text_async` (`google`, fallback `openai`, `language=ar`), robust base64 cleanup (spaces, newlines, missing padding, url-safe conversion), polls job ~1 s within a 45 s budget (504 ONLY if job fails to finish, 502 on provider failure). Finished jobs with empty/silent transcripts return 200 with `{transcript: "", coins_used: 0}`. Standard fee: 0.25 coins per started minute, duration floored by size estimate (`bytes/2000` s). Edge runtime. |

### 7.3 Exams
| Route | Method | Behavior |
|---|---|---|
| `/api/exams` | GET (Bearer) | `?subject_name=`; grade from profile; returns exams **with `correct_answer` and `explanation` stripped from every question** (answers withheld until submission). |
| `/api/exams` | POST (Bearer) | Persist an exam object (used for chat-emitted `[CREATE_EXAM]`); response is answer-stripped. |
| `/api/exams/generate` | POST (Bearer) | `{subject_name, grade_level, topic?, mode: 'auto'|'total_only'|'custom_types', total_count?, mcq_count?, tf_count?, essay_count?}`. Coins>0 else 402. Context is intelligently retrieved via `getCurriculumContextForLesson(grade_level, subject_name, topic)` (extracts exact matching lesson sections from curriculum markdown). DeepSeek `deepseek-chat` temp 0.8 with automatic fallback to Gemini Flash via EdenAI if DeepSeek fails → strict JSON exam → parse & clean markdown fences → coin deduction (x12.5) → save. Response is answer-stripped. |
| `/api/exams/submit` | POST (Bearer) | `{exam_id, answers}`. Evaluates student answers using DeepSeek temp 0.3 with automatic fallback to Gemini Flash via EdenAI if DeepSeek is unavailable or returns an error → resilient JSON parser & regex fallback → `{score 0-100, evaluation Arabic}` → coin deduction (x12.5) → awards first-attempt ranking points (`is_first_attempt`) for leaderboard competition without increasing AI usage currency balance → save submission. Response includes `questions_review` (per-question `student_answer`, `correct_answer`, `explanation`). |
| `/api/exams/submissions` | GET (Bearer) | User's submissions (silently `[]` when logged out). |

### 7.4 Public / utility
| Route | Method | Behavior |
|---|---|---|
| `/api/config` | GET (optional auth) | `{website_link, active_grade_levels (default 5 grades), active_tracks (default 4 tracks), active_curriculum_ids, all_curriculums, guest_messages_count, guest_coins, user?}`. Never hard-fails. |
| `/api/config` | POST (Admin) | Persist `website_link` / `active_grade_levels` / `active_tracks` / `active_curriculum_ids` to `system_settings`. |
| `/api/notifications` | GET (public / optional auth) | `?target=web`; active rows matching target. If `Authorization: Bearer <token>` is present, returns active broadcasts (`user_id IS NULL`) plus targeted personal notifications matching the authenticated `user_id`. Otherwise returns only public broadcasts. |
| `/api/report` | POST (Bearer or device-id) | `{reported_content (req, ≤8000), user_query (≤2000), reason (≤500), message_id (≤200), session_id?}` → `reports` row. |
| `/api/contact` | POST (Public / Optional Bearer) | `{name, contact_info, category?, message}`. Validates fields, associates authenticated `user_id` if present, saves message to `contact_messages` with status `'pending'`. |
| `/api/log` | POST (Bearer or device-id) | Client telemetry echoed to server console (`[BROWSER LOG]:`), capped 4000 chars. Not persisted. |

### 7.5 Active Recall & Gamification
| Route | Method | Behavior |
|---|---|---|
| `/api/flashcards` | GET (Bearer) | Returns a list of flashcard decks for the authenticated user, including each deck's `total_count` and `due_count` (calculated using Leitner schedule: `box` intervals 1, 2, 7, 14, 30 days). |
| `/api/flashcards` | POST (Bearer) | `{subject_name, grade_level, title, cards: [{question, answer}]}`. Manually creates a flashcard deck and inserts card rows. |
| `/api/flashcards` | PATCH (Bearer) | `{id, title}`. Renames a flashcard deck. |
| `/api/flashcards` | DELETE (Bearer) | `?id=`. Deletes a flashcard deck and all its contained cards. |
| `/api/flashcards/card` | PATCH (Bearer) | `{id, question, answer}`. Edits a single flashcard's question and answer. |
| `/api/flashcards/card` | DELETE (Bearer) | `?id=`. Deletes a single flashcard. |
| `/api/flashcards/subject` | GET (Bearer) | `?subject_name=`. Returns all pooled flashcards and decks under a given subject for subject-level stacked review. |
| `/api/flashcards/generate` | POST (Bearer) | `{subject_name, grade_level, topic, count}`. Generates a new flashcard deck using AI. Injects targeted lesson textbook context via `getCurriculumContextForLesson`. DeepSeek `deepseek-chat` temp 0.8 is prompted to produce a JSON array of QA cards. Deducts coins on success. |
| `/api/flashcards/review` | GET (Bearer) | `?deck_id=`. Returns flashcards from the specified deck that are currently due for review (`next_review_at <= now`). |
| `/api/flashcards/review` | POST (Bearer) | `{card_id, rating}`. Submits a review score (1-5) for a flashcard. Adjusts the card's Leitner `box` number and updates `next_review_at` accordingly (increases box on score >= 4, resets to box 1 on score <= 2). |
| `/api/leaderboard` | GET (Bearer) | `?grade_level=my|all&limit=10`. Returns the top 10 leaderboard rankings ordered by `points DESC` (`"نقاط الترتيب"`), along with `user_rank` containing the student's exact ranking number, points, study streak, accuracy, and `is_in_top_10` status. |

### 7.6 Admin (all Bearer + role check; 401/403)
| Route | Methods | Behavior |
|---|---|---|
| `/api/admin/dashboard` | GET | Stats: totalUsers (students), usersByGrade, highestUsageUser (by coins consumed, fallback msg count), highestUsageGrade. Loads all profiles + all chat_history into memory (scaling risk). |
| `/api/admin/users` | GET `?search=` / PATCH `{id, unlimited_credit?, action?}` / DELETE `{id}` | Search via ilike on name/phone/email; responses include `active_devices_count` and active `devices` list; PATCH supports `action === 'reset_devices'` to immediately revoke all user devices; self-delete blocked; hashes excluded from responses. |
| `/api/admin/customer-service` | GET `?action=student_detail&userId=` / POST | Admin Customer Service Hub: (1) `action: 'student_detail'` returns detailed student profile, subscription start/end dates, elapsed hours, coin balance, devices count, and exact cancellation eligibility status with reason; (2) `action: 'cancel_subscription'` verifies the strict 3-day (72h) / 0-coin-spent condition, cancels subscription to `'free'`, resets timestamps, and marks payment transactions as `'refunded'`; (3) `action: 'recalculate_coins'` recalculates and sets today's coins to the active plan cap; (4) `action: 'add_coins'` adds arbitrary coins directly to student account; (5) `action: 'delete_student'` permanently purges student account and all cascades; (6) `action: 'update_report_action'` records admin resolution note and updates status. |
| `/api/admin/support-messages` | GET `?status=&category=` / PATCH `{id, status, admin_notes?}` / DELETE `{id}` | Support Ticket Desk: lists contact form submissions, updates ticket status (`pending`, `replied`, `resolved`, `dismissed`) and internal notes, or deletes tickets. |
| `/api/admin/reports` | GET `?status=` / PATCH `{id, status, action_taken?, admin_notes?}` / DELETE | AI Complaints Moderation: filters by status (`pending`, `action_taken`, `reviewed`, `dismissed`), saves action taken note, updates status, or permanently deletes report. |
| `/api/admin/notifications` | GET / POST / PATCH `{id,active}` / DELETE | Title ≤200, body ≤2000, type/target whitelisted, optional `user_id` targeting. |
| `/api/admin/curriculum` | GET / POST / PATCH `{id, subject_name}` / DELETE `{id}` | POST supports two modes: (1) Multipart upload (`file`, `grade_level`, `subject_name`, `track_id?`, `is_elective?`) or attaching to existing placeholder (`curriculum_id`, `file`), running hierarchical parent-child chunking & vector embedding; (2) JSON/multipart placeholder creation (`is_placeholder: true`, `grade_level`, `subject_name`, `track_id?`, `is_elective?`) without a file. |
| `/api/admin/curriculum/detail` | GET `?id=` / POST `{id, grade_level, subject_name, content}` | GET reassembles Markdown from chunks; POST re-chunks and generates batch embeddings using the unified hierarchical v2 pipeline (`processCurriculumChunks`), preserving full parent-child hierarchy in the database. |
| `/api/admin/curriculum/units` | POST / PUT (Admin) | Body `{id: curriculumId, units: CurriculumUnit[]}`. Updates and persists manually authored units and lessons for a curriculum. |

### 7.7 Kashier Payment Gateway (Live Checkout)
| Route | Method | Behavior |
|---|---|---|
| `/api/payment/kashier/initialize` | POST (Bearer) | Body `{plan_id: 'pro_1m'|'pro_2m'|'pro_3m'}`. Validates plan and user token. **Blocks duplicate checkouts**: if user already has an active, unexpired subscription (`subscription_status === 'active'` and `now < subscription_end_date`), rejects with 400 and Arabic error message. Otherwise generates a unique order ID `egs_sub_<id>_<time>`, calculates server-side HMAC-SHA256 order hash (`/?payment=mid.orderId.amount.currency`), creates a pending `payment_transactions` record, and returns the checkout payload and URLs. |
| `/api/payment/kashier/webhook` | POST (public/gateway) | Receives asynchronous server-to-server transaction notifications from Kashier. Verifies HMAC signature with `KASHIER_SECURITY_KEY`. If payment succeeded (`SUCCESS`/`CAPTURED`/`APPROVED`), marks transaction `success`, activates the exact duration (30/60/90 days), sets `subscription_status: 'active'`, `subscription_start_date`, `subscription_end_date`, `subscription_plan_id`, tops up daily coin balance to the plan cap (80/90/120), and creates an in-app confirmation notification targeted exclusively to the subscriber (`user_id: transaction.user_id`). |
| `/api/payment/kashier/callback` | GET / POST (public/gateway) | Handles customer redirect from Kashier checkout. Validates signature and status. Activates subscription on success and redirects to `/?payment_result=success&orderId=...&plan=...`; on failure redirects to `/?payment_result=failed`. |
| `/api/payment/kashier/verify` | POST (Bearer) | Client-side verification endpoint called when checkout modal emits a completion event. Validates HMAC signature against Kashier data or checks verified transaction status before activating subscription, preventing unauthorized or spoofed activations. |
| `/api/user/verify-currency` | POST (Bearer) | Authenticated currency and subscription verification endpoint. Evaluates Cairo calendar date (`Africa/Cairo`), checks exact subscription status and countdown, computes exact time to next renewal (00:00 Cairo time), generates HMAC signature, and returns verified state to synchronize client and server. |

### 7.8 Curriculum Structure API
| Route | Method | Behavior |
|---|---|---|
| `/api/curriculum/structure` | GET (Public / Edge) | `?grade_level=&subject_name=`. Reads the manually configured curriculum units and lessons from the database record for `(grade_level, subject_name)`. Returns `{ success: true, hasCurriculum: boolean, curriculumId?, gradeLevel, subjectName, units: CurriculumUnit[], totalLessons: number }`. |

---

## 8. AI Pipeline (RAG v3 & Curriculum Awareness)

### 8.1 Providers & Token Optimization Architecture
- **DeepSeek** `https://api.deepseek.com/v1/chat/completions` — `deepseek-chat` ("flash"), `deepseek-reasoner` ("pro"). Real-time streaming with `stream_options.include_usage`, `thinking:{type: enabled|disabled}`, `Accept-Encoding: identity`.
- **EdenAI** `https://api.edenai.run/v2/text/chat` (Gemini 2.5 Flash, temp 0.1), `/v2/text/embeddings` (text-embedding-004, 768-dim), `/v2/image/question_answer` (VQA google→openai), `/v2/audio/speech_to_text_async` (STT google→openai, Arabic, polled).
- **Token Efficiency & Meta-Prompting Strategy:** System prompts, metadata extraction schemas, and structural formatting rules across DeepSeek and Gemini are written in dense, unambiguous English instructions to reduce prompt token consumption by ~40-50% and enhance reasoning adherence. Gemini performs Arabic curriculum analysis and outputs Arabic HyDE passages and keywords, while DeepSeek operates under a strict high-priority directive mandating friendly, authentic Egyptian colloquial Arabic (`اللهجة المصرية التعليمية المهذبة`) for all student explanations.
- **Resend** for OTP email.

### 8.2 Main system prompt (`buildSystemPrompt(context, mode)` in `deepseek.ts`)
Persona "EGS AI" — master Egyptian teacher with deep familiarity with the official Egyptian curriculum:
1. Primary Persona Mandate: Speak in natural, polite Egyptian colloquial Arabic adapted for preparatory and secondary students (`يا بطل`, `يا دكتور/ة`, `يا بشمهندس/ة`).
2. Breadcrumb Grounding: Context includes exact Unit and Lesson paths (e.g. `[الوحدة X > الدرس Y > المفهوم Z]`), enabling the AI to explicitly reference the syllabus context.
3. Egyptian Curriculum Methodology: Given → laws in KaTeX LaTeX → steps → result+unit for STEM; grammar-rule-first + syntactic parsing for languages; precise facts, dates, and causes/results for humanities.
4. All math in LaTeX (`$$` block, `$`/`\(\)` inline).
5. Geometric diagrams as fenced ```` ```svg ```` blocks — whitelist `svg,path,circle,rect,line,polygon,polyline,text,g,ellipse`; theme colors (`#00B4D8`, `#FFB703`, `#7209B7`, `currentColor`); viewBox required; Arabic labels.
6. Interactive protocol tags: `[QUIZ_QUESTION]{json}[/QUIZ_QUESTION]`, `[CREATE_EXAM]{json}[/CREATE_EXAM]`, `[CREATE_FLASHCARDS]{json}[/CREATE_FLASHCARDS]`.
7. Calibrated Out-of-curriculum warning: Answers are primarily derived from the injected curriculum context. When answering queries genuinely beyond the curriculum, the response begins on the very first line with: `"تنبيه: هذه المعلومة خارج المنهج المقرر عليك يا بطل، ولكنها تفيدك في فهم الدرس..."`.
8. Mode-specific behavioral block (`MODE_INSTRUCTIONS`): **socratic** (scaffolded guiding questions without immediate final answers), **detailed** (default comprehensive textbook explanations), **summary** (high-yield exam review bullet points).

### 8.3 RAG flow (RAG v3 per chat message, with live `search_step` SSE events)
1. `analyzeQueryIntelligence` (1 Gemini call, ≤600 tokens) → `{queryType: direct|inferential|overview|problem_solving, arabicKeywords ≤8, englishKeywords ≤5, hydePassage, searchAnnouncement, metadata}` with Arabic stop-word removal fallback. Dynamic grade/subject routing if explicitly indicated.
2. Parallel: embed HyDE passage (768-d) + full-curriculum BM25/FTS search (`rankChunksV2` in JS with Arabic diacritic stripping, Alef unification, Hamza preservation `ء`, and prefix-aware variants `ال`, `وال`, `فال`, `كال`, `بال`, `لل`, `و`, `ف`, `ب`, `ك`).
3. Vector search via RPC (top 30) when embedding exists.
4. `applyRRF(vector, bm25, k=60)` with unit/chapter metadata boosting → top 8 child chunks → **parent expansion** (`getParentChunks`) with full hierarchical breadcrumbs.
5. Injected Context: includes curriculum outline (unit and lesson map) + full parent section text without redundant duplicated sentence highlights.
6. Routing: `overview` → curriculum summary + full outline + 6 chunks; `direct` with ≥3 chunks → 8 chunks straight; otherwise `assessContextGap` (Gemini) → follow-up BM25 searches for missing topics.
7. Real-time DeepSeek streaming: `reasoning_content` → `thought` events, `content` → `content` events; usage tokens captured for billing.

### 8.4 Curriculum ingestion pipeline (`curriculum_processor.ts`)
Unified for initial upload (`/api/admin/curriculum`) and detail edits (`/api/admin/curriculum/detail`):
Markdown → split into **parents** with full breadcrumb hierarchy (`# Unit > ## Lesson > ### Subtitle`; PARENT_MAX 500 tokens) → **children** via sentence-aware sliding window (CHILD_MAX 120 tokens, 24-token overlap, Arabic `؟` aware) → batch embeddings (20 per EdenAI call via `text-embedding-004`) → Gemini curriculum summary stored as parent chunk `__CURRICULUM_SUMMARY__` (position −1) → batch insert with parent-child ID mapping.

### 8.5 Fallback chain
Gemini intelligence fails → regex stop-word-filtered keywords; embedding fails → BM25-only; RPC fails → BM25 full-curriculum scan; gap check fails → fail-open (proceed); VQA google fails → openai.

---

## 9. Coin (Points) Economy & Merit Leaderboard

### 9.1 Coins (Usage Currency & Renewal Integrity)
- EGP cost per chat: **pro** `prompt/1M x 150 + completion/1M x 200`; **flash** `prompt/1M x 30 + completion/1M x 50`. **Coins = EGP x 10.**
- Exams (generate + submit): flash rates **x 12.5**. Image analysis (`/api/chat/upload-image`): flat 0.5 coins.
- Floor at 0 with 2-decimal-place precision math (`toPreciseCoins`) preventing floating-point drift. `admin` role or `unlimited_credit` never deducted.
- Guests: 5.0 coins reset daily on Egyptian Standard Date (`Africa/Cairo`).
- **Registered users: daily replenishment and subscription expiry check (lazy, in `checkAndResetDailyCoins` via `getProfile`)**:
  - Automatically verifies `subscription_end_date`. If past expiration (`Date.now() >= subscription_end_date`), strictly downgrades `plan_type` to `'free'`, sets `subscription_status = 'expired'`, and stops all subsequent daily replenishments, preventing overstay.
  - Active subscribers are guaranteed daily renewal up to their plan cap (`DAILY_COIN_CAPS`: `pro_1m` 80.0, `pro_2m` 90.0, `pro_3m` 120.0, legacy `pro` 80.0, `max` 120.0) at 12:00 AM Cairo Time (`Africa/Cairo`) each calendar day throughout the active subscription. Free plans have non-replenishing 15.0 trial coins (`free = 0.0`).
  - Balances above the cap are never reduced.
- Anti-tampering: Central server validation and HMAC-signed verification payloads guarantee accurate balances, prevent client-clock manipulation, and enforce strict expiration.
- 429 `limit_reached` from `/api/chat` when coins ≤ 0; web UI then auto-opens the auth modal after 3 s for guests.
- All coin deductions happen server-side.

### 9.2 Ranking Points (`points` Merit System & Leaderboard)
- **Purpose:** A dedicated, non-depleting merit score tied directly to academic achievement and active participation (labeled `"نقاط الترتيب"` with a `Trophy` icon).
- **Currency Isolation:** Competition points (from exams and chat engagement) strictly increase ranking points (`points`) only; they never increase or award AI usage currency balance (`coins`). Usage currency is replenished exclusively via daily subscription renewals and package activations.
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
- **Leaderboard RPC (`get_leaderboard` & `get_user_leaderboard_rank`):** Ranks students by `points DESC`, with `study_streak DESC` and `avg_accuracy DESC` as secondary tiebreakers. Leaderboard results are strictly capped to the **Top 10** students. When an authenticated student is not in the Top 10, the server computes and returns their exact overall position (`user_rank`) along with points gap to the 10th rank. Test and trial accounts (non-student roles, or accounts with emails/names containing 'test', 'trial', 'اختباري', or 'تجريبي') are automatically filtered out from all leaderboard queries.

---

## 10. Authentication and Sessions

- **Password hashing:** PBKDF2-HMAC-SHA256 (WebCrypto, 100k iterations, 16-byte random salt, format `pbkdf2$iter$saltB64$hashB64`) in `auth_helpers.ts`. Legacy unsalted sha256 hashes are still verified and transparently re-hashed to PBKDF2 on successful login. Google accounts store `password_hash: ''`. The password-change flow calls `/api/auth/update-profile`.
- **Web session token:** `base64("userId:expiry:HMAC-SHA256(JWT_SECRET, 'userId:expiry')")`, 30-day expiry, constant-time comparison, no revocation/refresh; logout is client-side only. Secret from `JWT_SECRET` (prod refuses to run without it; dev fallback string exists).
- **Multi-Device Limit Security System (Max 3 Concurrent Devices):**
  - Accounts are strictly limited to a maximum of **3 active concurrent devices** (`user_devices` table).
  - Devices are identified by client UUIDs (`localStorage.getItem('egs_device_id')` on web) coupled with device metadata (browser fingerprint, IP address, user agent, Arabic OS/browser label).
  - **Auto-Revocation on 4th Device**: When a user registers or logs in on a new device while already having 3 active devices, the system automatically revokes all previous devices (`is_active = false`) and activates **only** the single new device (active count drops strictly to 1).
  - **Session Validation & Interception**: Protected endpoints validate the active device session via `validateUserSessionDevice`. Revoked devices receive a `401` response with `{error: 'device_session_revoked', code: 'device_session_revoked'}` and are immediately logged out with an informative Arabic explanation dialog.
  - **Device Self-Service Management**: The profile screen features an `"الأجهزة المتصلة والجلسات النشطة"` section with live active counts (`N / 3 أجهزة`), device list with device-type icons (`Smartphone`, `Tablet`, `Laptop`), last active timestamps, and remote single/all-other logout buttons.
  - **Admin Device Reset**: Administrators can view active device counts in the admin users table and reset a user's devices with a single click.
- **Deleted Account & Orphan Session Auto-Logout:**
  - When an account is deleted (via Admin Users, Admin Customer Service, or student self-service `/delete-account`), all database records including `user_devices` are immediately purged.
  - **Deterministic Initial Validation (`/api/config`)**: On browser startup or page load, if a token is provided in `localStorage` for a deleted or non-existent profile, `/api/config` explicitly returns `{ authenticated: false, user: null, user_not_found: true, session_invalid: true }`. The client immediately executes `handleForceLogout`, purging `egs_token`, `egs_user`, `egs_chat_sessions`, `egs_active_exam_id`, etc., and transitions to guest mode with an Arabic session-terminated dialog (`accountDeletedModal`).
  - **Live Heartbeat & Tab Focus Invalidation**: Active sessions automatically verify with `/api/config` whenever the tab regains focus (`visibilitychange` / `window.onfocus`) and via a recurring 60-second background heartbeat. Deleted users are logged out immediately without needing to perform manual actions.
  - **Universal 401 Interception**: All protected API endpoints (`/api/chat`, `/api/chat/sessions`, `/api/chat/history`, `/api/exams/*`, `/api/flashcards/*`, `/api/auth/devices`, `/api/auth/update-*`, `/api/user/verify-currency`) verify that `db.getProfile(userId)` exists. If not, they return `401 Unauthorized` with `{ error: 'user_not_found', code: 'user_not_found' }`, which triggers `handleForceLogout` across the web client.
- **Simplified Registration Options & Egyptian Arabic Onboarding Flow:**
  - **Option 1 (Top — "تسجيل سريع"):** Google Quick Registration prominently displayed at the very top of the account creation modal. Clicking Google sign-in directly authenticates the student and creates their initial profile without blocking them with pre-login forms.
  - **Option 2 (Bottom):** Registration with **email and password only** (+ privacy/terms acceptance). No upfront stage, track, or name inputs are requested.
  - **OTP Verification (Email):** 6-digit crypto-random (`crypto.getRandomValues`), 10-minute expiry (`OTP_TTL_MS`); Resend email via `src/lib/email.ts` (register + password-reset templates). User enters 6-digit code with friendly Egyptian Arabic instructions ("وصلك كود على إيميلك!").
  - **Sequential Post-Registration Onboarding (Inside the Platform):** Upon completing signup via either Google or Email+OTP, the platform opens, and a neat sequential 2-screen onboarding wizard guides the student:
    - **Screen 1 (Stage):** Student selects their educational stage (`GRADE_NAMES`), and if Secondary/Baccalaureate (`2_high`), selects their specialized track and elective subject.
    - **Screen 2 (Name):** Student inputs or confirms their full name ("اسمك الكريم إيه؟").
    - Submitting screen 2 calls `/api/auth/update-profile` (`action: 'complete-onboarding'`) to atomically persist the stage, track, elective, and name, closing the onboarding screen and welcoming the student to their customized curriculum study hub.
- **Google Sign-In:** web uses GSI button (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, hardcoded fallback ID in source). Prominently rendered at the top of both register and login views.
- **Guest identity:** web `egs_device_id` = `device_<random36>`. Client-supplied, spoofable.

---

## 11. Message Protocol Tags

These inline tags are the contract between AI output, storage, and the web client. Never change one side without the others (web `page.tsx` parser, backend prompt in `deepseek.ts`).

| Tag | Direction | Meaning |
|---|---|---|
| `[QUIZ_QUESTION]{json}[/QUIZ_QUESTION]` | AI → clients | Interactive quiz card (`multiple_choice` / `true_false` ("true"/"false") / `essay`) |
| `[CREATE_EXAM]{json}[/CREATE_EXAM]` | AI → clients | Exam invite card; client persists via POST `/api/exams` |
| `[CREATE_FLASHCARDS]{json}[/CREATE_FLASHCARDS]` | AI → clients | Flashcard deck invite card (`{subject_name, title, cards: [{question, answer}]}`); client persists deck via POST `/api/flashcards` and renders interactive review bubble |
| `<thought duration="N">...</thought>` | storage prefix on AI rows | Collapsible chain-of-thought + duration |
| `[AUDIO_MESSAGE:<mime>;<base64>]text` | legacy storage prefix | Historical voice note fallback (recording cut from chat) |
| `[IMAGE_MESSAGE:<mime>;<base64>;<uriEncodedDescription>]text` | user msg prefix | Image + AI description; backend keeps only the description in the prompt (`[وصف الصورة المرفقة من الطالب: ...]`) |
| ```` ```svg ```` fenced block | AI → clients | Sanitized inline SVG diagram (DOMPurify on web) |
| `data: {json}` SSE lines, terminator `data: [DONE]` | server → clients | Event types `search_step`, `thought`, `content`, `done` (includes `points_awarded` & `total_points`), `error` |

---

## 12. Web Frontend

Single client component `web/src/app/page.tsx`. Static routes for `/terms`, `/privacy`, `/contact`, `/download`, and `/delete-account`. View switching via `activeTab` state: `'chat' | 'admin' | 'subscriptions' | 'beta' | 'profile' | 'exams' | 'flashcards' | 'leaderboard'`.

### 12.0 Application Lifecycle & Deterministic Auth Resolution
- **Zero-Flash Initialization:** On initial client mount, the app enters an `isInitialLoading: true` state for ~120ms while synchronously recovering stored credentials (`egs_token` & `egs_user`) and local layout settings (`egs_theme`, `isMobile`, `sidebarOpen`) from `localStorage`.
- **Branded Preloader:** While `isInitialLoading` is active, renders a lightweight, elegant branded splash screen (deep obsidian `#0E0D0D`, clean framed logo, gradient title, and `Loader2` indicator) preventing Flash of Unauthenticated Content (FOUC) or premature display of registration/login cards for authenticated students.
- **Progressive Transition:** Once auth state is deterministically established, transitions smoothly via `animate-fade-in` directly into the student's personal workspace (if logged in) or the clean guest/login interface (if unauthenticated).

### 12.1 Layout and metadata (`layout.tsx`)
`<html lang="ar" dir="rtl">`; title "EGS AI | مساعدك الذكي في المنهج الدراسي المصري"; OG locale `ar_EG`; JSON-LD WebApplication (EducationalApplication, price 0 EGP); viewport `maximumScale 1` (pinch-zoom disabled — accessibility tradeoff), `viewportFit cover`, `interactiveWidget resizes-visual`; theme color `#0D1B2A`; GSI script; a MutationObserver strips extension-injected attributes to avoid hydration mismatches. PWA manifest (standalone, theme `#FFB703`, background `#0D1B2A`, portrait orientation, education category), Service Worker registration (`sw.js`). Fonts: Tajawal/Cairo (Arabic body), Outfit (Latin/code).

### 12.2 Module-level components in page.tsx
`CodeBlock` (LTR code + copy), `ThoughtBlock` (collapsible CoT with timer), `MathRenderer` (KaTeX, `trust:false`, macro `\RR`), `SvgDiagram` (DOMPurify svg profile; FORBID script/foreignObject/on-handlers/href), `parseInlineText` (inline math/bold/code), `MarkdownMessage` (hand-written line parser: headers, lists, RTL tables, block math, fences), `CurriculumLessonPicker` (student-friendly, streamlined curriculum browser for Exams and Flashcards modals featuring 1-click full curriculum selection, instant live search with query clearing, lightweight unit accordions with 1-tap whole-unit selection, minimal lesson list rows with concept subtitle summaries, and compact pinned/docked active selection summary), `InteractiveQuizCard`, `InteractiveExamInviteCard`, `InteractiveFlashcardInviteCard`, `MotivationalPaywallCard` (high-conversion psychological paywall card for depleted coins with Egyptian payment badges and 3-day refund guarantee), `FormattedChatMessage` (tag extraction including `[CREATE_FLASHCARDS]` and `[UPGRADE_PAYWALL]`), `SearchStepsPanel` (live RAG steps), `ImageEditorModal` (canvas crop + brand-palette freehand brush + undo before upload; exports JPEG stepped under 5 MB), `AppTour` (interactive guided walkthrough system with responsive cutout spotlight overlays and authentic Egyptian Arabic instructions).

### 12.3 Views
1. **Sidebar** (right, RTL): logo header (Beta pill removed), new chat, search, subscriptions page (`باقات الاشتراك` for free users, `اشتراكي الحالي` for active subscribers), exams, flashcards (المدرب الذكي), competition & leaderboard (المسابقة ولوحة المتصدرين), profile, admin (role-gated), contact us (تواصل معنا), app download & installation link (`تحميل وتثبيت التطبيق` routing to `/download`), delete account link (حذف الحساب), app tour shortcut (`جولة في المنصة` with Compass icon), session list (subject chip, hover delete, grade-mismatch block; opening a session restores its interaction mode), user card (plan badge, coins, points, logout) or login CTA. Desktop 320px collapsible; mobile 280px fixed overlay + backdrop.
2. **Chat & Study Hub (Mobile-Ergonomic):** header (Streamlined uncluttered top bar with sidebar menu toggle, subject chip on desktop, and user action cluster: interactive points trophy pill `"نقاط الترتيب"` and coins balance pill `header-coins-chip` rendering exclusively for logged-in students, notifications bell dropdown, App Tour help replay button `<HelpCircle size={15} />`, theme switch button with 1-tap Sun/Moon toggle between light and dark modes, user avatar / login CTA); empty state (enlarged crisp brand logo, student greeting, prominent centered Registration/Login hero banner `.guest-auth-banner` for unregistered visitors, horizontal swipeable compact subject chips rail `.subject-cards-grid` with 20px icons, and 'ماذا تريد أن تفعل الآن؟' action section featuring 2 dedicated wide feature cards `.study-feature-card` for 'امتحان تقييمي ذكي' and 'المدرب الذكي والكروت' with clear outward-pointing navigation arrows `←` and action buttons `ابدأ الاختبار الآن` / `ابدأ المراجعة الآن` clearly conveying navigation to dedicated pages/tools); non-intrusive mobile PWA install banner (shown only on mobile browsers when not running in standalone mode and not dismissed); message list with smart floating scroll-to-bottom FAB (`.scroll-bottom-fab`) with pulse glow when new content arrives; composer dock.
3. **Composer (Ergonomic Dock) & In-Stream Image Submission:** Directly above the input box on the submission screen are interactive quick-prompt tags (`.composer-prompt-tags-wrapper`, `.composer-prompt-tag`) for "شرح وتفصيل درس" and "حل مسألة أو سؤال" equipped with `+` prefix icons and downward-pointing arrow indicators (`↓`) that auto-fill prompt templates into the textarea and focus the caret at the end. Primary row with auto-grow textarea (16px base font preventing iOS zoom, Enter send / Shift+Enter newline, cap 160px), 38x38px image attach button (≤5 MB → editor modal → instant preview attachment with 0 blocking pre-reading delay), and 38x38px circular send button. When submitted with an attached image, sends immediately and displays `"تحليل الصورة"` (`image_analysis` search step) while server-side VQA extracts problems and feeds into curriculum RAG + DeepSeek stream. For free accounts with depleted coins, displays a motivational paywall banner above the input dock celebrating their daily progress and offering 1-click Kashier subscription checkout (hidden for active subscribers whose daily coins replenish automatically). Beneath is the horizontal swipeable feature toolbar (`.composer-features-toolbar` with gradient edge fade masks) containing: Mode/Template pill (opens interactive teaching explanation modal on desktop / bottom sheet on mobile), Deep Thinking toggle pill (`.active-glow`), AI Model selector pill (Flash vs. Pro with `.active-gold`), Subject picker pill (opens subject picker modal/sheet), and Grade pill for guests.
4. **Exams:** creator modal (dual mode: "اختيار من المنهج" with modern student-friendly picker supporting 1-click whole-curriculum selection, instant search, lightweight unit accordions with 1-tap whole-unit selection, streamlined lesson rows with concept subtitles, and docked scope summary; "موضوع مخصص" for custom topics; modes auto/total_only ≤15/custom_types MCQ+TF+essay counts); grid of available exams + submission history (score colors: ≥80 green, ≥50 orange, else red; mobile responsive single-column layout); taking view (all questions required before submit; **no timer exists**; on mobile includes sticky bottom action dock `.exam-taking-sticky-bar` with answered question progress and instant submission CTA; bottom navigation automatically hides during active exam answering for full immersion); results view (conic-gradient score ring, AI evaluation as markdown, per-question corrections from `questions_review`).
5. **Flashcards (المدرب الذكي):** Dual-view study system with "جميع الكروت" (All Cards Grid/List view displaying all pooled cards with answer reveal toggles, deck filter pills, and Leitner box level badges) and "مراجعة تفاعلية" (3D interactive focus flip stack with progress bar, previous/next card navigation controls, touch-ergonomic Leitner 1-5 rating buttons, and summary completion screen), inline card edit/delete, deck rename/delete, and AI + Manual creation modal (featuring the same streamlined student-friendly Unit & Lesson Picker with whole-curriculum, whole-unit, and specific lesson selection with live search and concept subtitles for AI card generation; container styled with `.mobile-main-with-nav` for safe bottom clearance).
6. **Leaderboard & Competition (المسابقة ولوحة المتصدرين):** Ordered strictly by `points DESC` (`"نقاط الترتيب"`) and capped to the **Top 10** students.
   - **Out-of-Top-10 Student Ranking Banner (`.user-current-rank-card`):** If the logged-in student is ranked outside the Top 10 (or has rank > 10), renders a prominent glowing card at the very top of the page displaying their exact overall rank (`#N`), name, "أنت" tag, grade level, points, streak, points gap required to reach the 10th spot, and an instant exam action button (`زيادة نقاطي بالامتحانات`).
   - **Universal Top 3 Podium (`.leaderboard-podium-container`):** Rendered on both Desktop and Mobile with Gold 1st center elevated with Crown, Silver 2nd, and Bronze 3rd with individual glowing border badges, student name, grade name, points with Trophy, and streak counter.
   - **Ranks 4-10 Listing:** Displayed as a clean glass table on desktop (Rank, Name, Grade Level, Points, Streak) and compact mobile cards on phones. Container constrained to `maxWidth: 960px` with back-to-chat button and grade/global filters.
7. **Subscriptions & Pricing page (`subscriptions` tab):**
   - **For active subscribers:** Renders the **Active Subscription Dashboard** showing the active plan name (1 Month / 2 Months / 3 Months), start date, expiration date, remaining days counter, daily coins allowance (80/90/120), policy notice stating renewal unlocks upon period completion, and direct return-to-chat button. Blocks checkout redirection and duplicate plan selection.
   - **For unsubscribed users:** 3 plan cards (Monthly Pro 60 EGP / 80 daily coins / 30 days, 2-Month 100 EGP / 90 daily coins / 60 days, 3-Month 140 EGP / 120 daily coins / 90 days), Kashier payment gateway information card (Visa, Mastercard, Meeza, Vodafone Cash, Orange Cash, Etisalat Cash, WE Pay, Instapay), 3-day refund policy alert (requires 0 points consumed), current points balance card, and support banner.
8. **Profile:** name edit, grade select (clears chat), password change (real emailed OTP, 10-min expiry), **Connected Devices Management Card** (displays `N / 3 أجهزة` badge, device list with device-type icons, last active timestamps, remote device logout buttons, and bulk logout for other devices), account deletion danger zone (links to `/delete-account`), and subscription management status card.
9. **Dedicated Application Download & Install Page (`/download`):** Standalone page with device and standalone mode auto-detection, platform switcher tabs (Android, iOS, Desktop), interactive 1-click PWA install triggers, Safari iOS step-by-step visual guidance, Chrome/Edge desktop install directions, and FAQ accordion.
10. **Account Deletion page (`/delete-account`):** Dedicated standalone public page for permanent account removal via email OTP verification. Clearly warns of irreversible deletion, subscription cancellation, and immediate data purge.
11. **Admin:** see section 15.
12. **Mobile bottom nav (5 thumb-reachable tabs):** دردشة (Chat), الامتحانات (Exams), المسابقة (Competition with Trophy icon), المدرب (Smart Coach), حسابي (Profile). 62px + safe-area insets, `backdrop-filter: blur(24px)`, active scale-down (`:active { transform: scale(0.92); }`), and top active pill indicator. All tabs employ `.mobile-main-with-nav` with `calc(84px + env(safe-area-inset-bottom, 0px))` bottom padding so content scrolls completely clear above the bar.
13. **Universal Modal & Sheet Pickers:** `renderSubjectSheet` (subject + grade picker), `renderModeSheet` (detailed explanation vs socratic scaffolding vs quick summary capsules), `renderModelSheet` (Flash vs Pro reasoner), `renderUpgradeSheet` (instant plan selection with Egyptian e-wallets, InstaPay, Meeza, Visa/Mastercard, and 3-day refund guarantee; returns `null` for active subscribers).
14. **App Tour System (Interactive Guided Walkthrough):** Lightweight, zero-dependency, RTL-native guided tour engine (`AppTour.tsx`) featuring animated cutout spotlight overlays, target auto-scroll into view, dynamic multi-tier positioning (with mobile bottom-docking), step progress indicators, and authentic Egyptian Arabic instructions for all primary screens (`chat`, `exams`, `flashcards`, `leaderboard`, `subscriptions`). On the main chat screen, delivers a non-fatiguing 4-part progressive micro-stepper for the composer dock (pre-filled sample prompt, Deep Thinking toggle & modes, Fast vs. Pro model capabilities, and instant submit action). Includes per-screen localStorage persistence (`egs_tour_completed_{screen}`), automatic triggers upon first-time onboarding completion, skippable actions at every step, and top header/sidebar replay shortcuts.

### 12.4 localStorage keys
`egs_theme`, `egs_token`, `egs_user` (JSON, coins kept in sync), `egs_device_id`, `egs_browser_id`, `egs_dismissed_notifications`, `egs_registered_before`, `egs_chat_mode`, `egs_pwa_banner_dismissed`, `egs_tour_completed_{screen}`, `egs_just_registered`. No sessionStorage.

### 12.5 SSE consumption
`fetch` → `res.body.getReader()` → line-buffered `data:` JSON parse. Placeholder AI message with `isThinking:true`; 1 s timer increments thought duration; `done` updates coins, points, session id; handles `error` event by displaying visible error message bubbles in chat.

### 12.6 Progressive Web App (PWA) Architecture & Smart Device Detection
- **Detection Matrix:**
  - **Standalone Mode (`isStandalone`):** Checks `window.matchMedia('(display-mode: standalone)').matches`, `navigator.standalone === true` (iOS Safari standalone), and Android TWA referrer (`document.referrer.includes('android-app://')`). When true, all download prompts and home screen install banners are completely suppressed across the app, and `/download` displays an informative "Already Installed" badge.
  - **Device Type (`isMobileDevice`):** Differentiates between mobile touch devices (phones/tablets via User Agent and touch capabilities) and desktop computers.
- **Adaptive Install Surfaces:**
  - **Mobile Browsers:** Non-intrusive install banner displayed on the home study hub with 1-click install action (`deferredPrompt.prompt()`), dismiss action with localStorage memory (`egs_pwa_banner_dismissed`), and iOS Safari step-by-step modal guide.
  - **Desktop Browsers:** Home screen is strictly kept clean with no install banners; desktop users can install via the sidebar navigation item (`تحميل وتثبيت التطبيق`), footer links, or directly via `/download`.

---

## 13. Theming and Design System

Brand identity: **Educational Tech Palette — Neon Amber/Yellow CTA, Deep Tech Blue, Medium Slate Blue, Snow Grey, Vivid Cyan, and Digital Violet**, Arabic-first typography with **Tajawal / Cairo / Readex Pro**, tactile layered buttons, glassmorphic surfaces, and zero emojis in UI chrome (Lucide icons on web). Designed to maximize focus, contrast, and visual clarity for students.

### 13.1 Brand colors & Component Color Mapping Guide

#### Light Mode Palette & Component Distribution
* **Main Background (`#F8F9FA`):** App body, central chat canvas, and global layout wrapper.
* **Sidebar Background (`#EFF3F6`):** Soft cool grayish-blue sidebar surface providing subtle contrast with the main content area.
* **Card & Content Background (`#FFFFFF`):** Lesson cards, prompt dock container, modal sheets, and header bar.
* **Headings & Body Text (`#0D1B2A`):** Primary headings (`h1`–`h6`), subject titles, action card titles, table headers, and body copy.
* **Platform Primary Color (`#00B4D8` / Sky Blue):** Primary color of the platform for all chrome, active links, nav items, icons, borders, avatars, chips, and tech highlights.
  - **Logo & AI Avatar Frames:** Pastel cyan / blue surface (`#E1F6FB`), `1.5px solid #00B4D8` border, and soft glow (`.brand-logo-frame`, `.message-avatar-ai`).
  - **Sidebar Active Nav Item:** Pastel cyan surface (`#E1F6FB`), `1.5px solid #00B4D8` border, and `#00B4D8` text and icon. Inactive items use `#0D1B2A` text and `#0D1B2A` icons.
  - **Selected Subject Card:** Pastel cyan surface (`#E1F6FB`), `2px solid #00B4D8` border, and a solid filled `#00B4D8` icon container with a pure white icon inside.
  - **Quick Study Feature Cards & Prompt Tags:** `#FFFFFF` card surface in light mode (`#1E2E3D` in dark mode), `#0D1B2A` title, pastel icon containers with Vivid Cyan `#00B4D8` and Digital Violet `#7209B7` badges, and dedicated action CTAs with outward-pointing arrows (`←`) for wide cards, alongside tactile prompt pills (`.composer-prompt-tag`) directly above the composer text box.
  - **Header Subscriptions Button:** Pastel cyan surface (`#E1F6FB`), `1px solid #00B4D8` border, and `#00B4D8` text and card icon.
* **Platform Secondary Color (`#FFB703` / Yellow):** Dedicated secondary color used exclusively for action/CTA buttons (`.btn-primary`), button highlights, and alert indicators.
* **Button Text (on Yellow CTA) (`#0D1B2A`):** High-contrast Deep Blue text and icons on primary yellow CTA buttons.
* **Low-Coin Balance Alert (`#EF4444`):** Soft coral pill (`#FDE8E8` background, `rgba(239, 68, 68, 0.35)` border, and `#EF4444` text and icon).
* **Logo Branding:** Dual-tone / cyan-to-violet gradient (`#00B4D8` to `#7209B7`) for "EGS AI".

#### Dark Mode Palette
* **Main Background:** `#0D1B2A` (Deep Tech Blue) — app body, page background, and sidebar wrapper.
* **Card & Content Background:** `#1E2E3D` (Medium Slate Blue) — card surfaces, prompt input container, modal dialogs, and secondary buttons.
* **Headings & Body Text:** `#F8F9FA` (Snow Gray) — primary titles, section headings, body text, and table content.
* **Call to Action (CTA) & Alerts:** `#FFB703` (Neon Amber / Yellow) — primary CTA buttons, alerts, and notice indicators.
* **Button Text (on Yellow CTA):** `#0D1B2A` (Deep Blue Text) — high-contrast text and icons on primary yellow CTA buttons.
* **Tech Accents & Gradients:** `#7209B7` (Digital Violet) — border glow on hero card, focus rings, AI mode pill highlights (`تفكير عميق`), and digital gradients.

### 13.2 Typography
- **Primary Arabic Font:** `Tajawal`, `Cairo`, `Readex Pro` — modern, highly legible geometric Arabic typography.
- **Latin, Math & Code Font:** `Outfit`, KaTeX.

### 13.3 Tactile Button System
- `.btn-primary`: Action/CTA button background (`#FFB703` / `--btn-primary-bg`), Deep Blue text (`#0D1B2A`), hover lift `-1px` with expanded glow `0 6px 20px rgba(255, 183, 3, 0.45)`, active spring scale `0.97`. In Light Mode, yellow serves as the dedicated secondary color for buttons, while sky blue (`#00B4D8`) acts as the platform primary color.
- `.btn-secondary`: Light Mode `#FFFFFF` with `1.5px solid rgba(13,27,42,0.12)` border; Dark Mode `#1E2E3D` with `1.5px solid rgba(248,249,250,0.15)` border, active scale `0.97`.

### 13.4 Web dark tokens (`:root, html[data-theme='dark']` in globals.css)
bg `#0D1B2A`, elevated `#1E2E3D`, sidebar `#0D1B2A`, header `#0D1B2A`, card `#1E2E3D`, card-hover `#26384A`, input `#1E2E3D`; text `#F8F9FA` / `#C5D1DE` / muted `#8899A6`; primary `#FFB703`, text-on-primary `#0D1B2A`, secondary (accent) `#7209B7`, btn-primary-bg `#FFB703`, info `#00B4D8`, send-btn `linear-gradient(135deg, #00B4D8 0%, #7209B7 100%)`.

### 13.5 Web light tokens (`html[data-theme='light']`)
bg `#F8F9FA`, elevated `#FFFFFF`, sidebar `#EFF3F6`, header `#FFFFFF`, card `#FFFFFF`, card-hover `#F8F9FA`, input `#FFFFFF`; text `#0D1B2A` / `#2A3B4C` / muted `#5C6F84`; primary (platform) `#00B4D8`, secondary (buttons) `#FFB703`, btn-primary-bg `#FFB703`, text-on-primary `#FFFFFF`, icon & active links `#00B4D8`, info `#00B4D8`, send-btn `#00B4D8`.

### 13.6 Score colors
≥80 green (ممتاز جداً), ≥50 orange (جيد — يحتاج تحسين), <50 red (ضعيف).

---

## 14. Responsive Design Requirements

These are hard product requirements (see `CODING_GUIDELINES.md` rule 2):

**Web** must render correctly with no missing/cut elements on all screen sizes:
- Breakpoints: `max-width: 768px` (mobile viewport: 62px bottom nav with active pill & scale-down feedback, overlay sidebar, 16px input font to prevent iOS auto-zoom, scrollable tables/pre/math, swipeable `.composer-features-toolbar` with gradient edge masks, compact Study Hub with horizontal swipeable subject rail, Top 3 Podium + mobile leaderboard ranking cards, sticky exam taking action dock, single-column exams grid), `480px`, `360px` (bottom-nav labels and header badge compactness), `hover:none` (drop hover lifts), `prefers-reduced-motion`.
- JS `isMobile = window.innerWidth < 768` gates conditional rendering and modal sheet interactions.
- Safe-area insets (`env(safe-area-inset-bottom)`) on bottom nav/composer/sheets/sticky exam bar; `100dvh` body.
- Touch ergonomics: All interactive controls (send, image upload, feature pills, sheet actions, Leitner rating capsules) satisfy minimum touch targets ≥38px-48px with instant active feedback.
- Smart Floating Scroll-to-Bottom Button: `.scroll-bottom-fab` floats cleanly above the composer and bottom nav, showing only when scrolled up, with pulse animation when generating new answers.
- Depleted coin / rate-limit flow: Automatically triggers psychological paywall card (`MotivationalPaywallCard`) and mobile slide-up sheet (`renderUpgradeSheet`) highlighting student achievement, Kashier e-wallet options (Vodafone Cash, InstaPay, Meeza, Visa/Mastercard), and 3-day money-back guarantee.

---

## 15. Admin Panel

Web only (`activeTab==='admin'`, `role==='admin'`). Six primary sections:
1. **Overview (المناهج والإحصائيات):** stats cards (total students, per-grade counts, highest-usage user, most active grade); grade activation checkboxes; Baccalaureate Specialization Tracks activation toggles (Medicine & Life Sciences, Engineering & CS, Business, Arts & Literature); curriculum upload with mode switch (File upload vs Placeholder subject without file, with track selector and elective flag for `2_high`); website_link setting; curriculum table (inline rename, publish toggle, placeholder badges with "رفع الملف الآن" modal file-attachment button, manual units & lessons index editor modal "الوحدات والدروس" with multi-line sequential textarea input and live numbered auto-ordering, full Markdown editor modal "تعديل المحتوى", delete).
2. **Customer Service (خدمة العملاء والدعم الفني):** Divided into 3 dedicated sub-pages:
   - **AI Response Complaints (شكاوى ردود الذكاء الاصطناعي):** Displays all student complaints regarding AI answers, user queries, flagged AI output, and student reasons; supports status filtering (`pending`, `action_taken`, `reviewed`, `dismissed`) and a dedicated modal for documenting official admin resolution actions (`action_taken`) with quick-suggestion chips (curriculum revision, scientific validation, etc.).
   - **Student Page & Operations (صفحة وعمليات الطلاب):** Searchable student directory (name, email, phone, grade) linked to a detailed student profile and operations hub:
     * **Action 1 (Subscription Cancellation & Refund):** Enforces strict policy — allowed within 3 days (72 hours) of subscription activation *provided* the user has consumed 0 coins from the package. Displays real-time eligibility badge, remaining hours, and safe confirmation modal that cancels subscription, reverts to free plan, and marks transaction as refunded.
     * **Action 2 (Recalculate & Add Coins):** Sub-action A recalculates and sets daily coins due today according to active plan cap (80/90/120); Sub-action B adds direct coins to user account with quick preset pills (+25, +50, +100, +200) or custom numeric input.
     * **Action 3 (Permanently Delete Student Account):** Danger zone operation that permanently purges student profile, chat history, exams, submissions, flashcards, devices, and subscriptions with safe confirmation modal.
   - **Technical Support (صفحة الدعم الفني):** Central inbox for messages submitted via the public `/contact` form; category and status filtering; direct 1-click communication triggers (Direct Phone Call `tel:`, WhatsApp chat `https://wa.me/`, Email `mailto:`); admin resolution notes logging modal and status updates (`pending`, `replied`, `resolved`, `dismissed`).
3. **Users (المستخدمون):** search, active connected devices count & device session reset, unlimited-credit toggle, delete (non-admin only).
4. **Notifications (الإشعارات):** create (title/body/type/target), activate/deactivate, delete.
5. **Reports (البلاغات):** legacy reports listing, filter by status, mark reviewed/dismiss, delete.
6. **Versions (إصدارات التطبيق):** publish version updates, mandatory upgrade flags, release notes.

---

## 16. Deployment and Environments

- **Production Hosting:** Vercel (`web/`). Deployed via `vercel --prod` to `https://www.egsaiedu.com` (`https://web-cw8lyrzdj-sohaib5.vercel.app`).
- **Target:** Next.js on Vercel platform. Build pipeline uses Next.js Turbopack compiler (`next build`).
- Nearly all API routes are edge runtime; `chat/upload-image` is Node (edge removed in commit 63a6dcb).
- Local dev: `npm run dev` in `web/` (works without Supabase using `db_data.json`).
- Vercel project link configured in `web/.vercel/`.
- **No CI/CD, no tests on web, no cron jobs** — all periodic behavior (guest coin reset, etc.) is lazy-on-read.

---

## 17. Environment Variables

| Name | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web `db.ts` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | web `db.ts` | Service-role key (bypasses RLS; server only) |
| `JWT_SECRET` | web `auth_helpers.ts` | HMAC session-token secret; prod refuses to run unset |
| `DEEPSEEK_API_KEY` | web `deepseek.ts`, `exams/*` | DeepSeek LLM (server-side only) |
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

## 18. Seed / Default Data

- **SQL default admin:** id `a3e0f065-9856-424d-8dc8-b4b3cf0b89cf`, phone `01147814652`, name `مدير النظام`, role admin, plan max, coins 1000, unlimited_credit.
- **External Testing / Payment Gateway Test Account:** id `f0000000-0000-4000-a000-000000000001`, email `test@egsaiedu.com`, password `TestAccount2026!`, phone `01000000000`, name `حساب اختباري (Test Account)`, grade `1_high`, role `admin`, plan `max`, `unlimited_credit: true`, `coins: 10000`. Present in production Supabase database and `db_data.json`.
- **Local-dev seeds (`db_data.json` / `db.ts` init):** admin `admin@egsaiedu.com` (id `admin-id-1234567890`) and test account `test@egsaiedu.com` (id `f0000000-0000-4000-a000-000000000001`).
- `system_settings.website_link = http://localhost:3000`.
- **Uploaded Curricula (28 curricula across 1_middle, 2_middle, 3_middle, 1_high, & 2_high):** All national curricula are populated with structured units and lessons, 768-dim vector embeddings, and active IDs in `system_settings.active_curriculum_ids`.

---

## 19. Known Issues and Technical Debt

(Keep this list current. Fix opportunistically when touching the affected area, per guideline 7.)

**Web:**
1. `console.log("RENDERING APP messages:", ...)` fires every render (page.tsx ~3531) — leaks chat content.
2. SSE `error` events swallowed by the partial-JSON catch.
3. `--card-border` self-referential var in dark mode (code blocks lose their border).
4. Typo "الاصعتاعي" in exam-generation error; two English error strings shown to Arabic users.
5. Admin + exams grids not responsive (section 14); hover-only session delete; `maximumScale:1`.
6. `page.module.css` dead code; guest-messaging plumbing built but guests fully gated (inconsistent product state).
7. Deleted-exam history view fabricates a mock exam with current subject metadata.
8. Native `alert()`/`confirm()` used throughout; no error boundary.

**Backend:**
9. Dashboard stats load all profiles + all chat history into memory.
10. Dead guest branches in chat route; `gpt-tokenizer` in config but never imported; `countTokens` is a x1.4 word-count approximation.
11. No rate limiting, no middleware.ts, no CORS config anywhere.
12. `[CREATE_EXAM]` chat tag still carries `correct_answer`/`explanation` inline in the stored AI message (protocol-level leak readable in raw chat history); the `/api/exams*` payloads are stripped, but chat-emitted exams need server-side generation to close this fully.

---

## 20. Security Posture and Required Fixes

Per guideline 6, code must be free of critical vulnerabilities. Current state, ordered by severity — do not reintroduce any of these patterns, and fix them when working in the affected area:

1. **HIGH — plaintext admin password formerly in a source comment** (removed from `db.ts`); its sha256 hash remains committed in `supabase_schema.sql` + `db_data.json`. Rotate the credential and purge from git history.
2. **HIGH — no RLS on any table** (compounds database exposure risk).
3. **MEDIUM — no rate limiting** on login/OTP/register (brute-forceable; OTPs now crypto-random with 10-min expiry, which mitigates but does not eliminate this).
4. **MEDIUM — admin users search interpolates user input into a PostgREST `.or()` filter** (filter injection).
5. **MEDIUM — `x-device-id` client-supplied** — guest quotas trivially resettable.
6. **LOW — hardcoded Google client ID fallback; sessions non-revocable for 30 days; `check-profiles.js` dumps password hashes to console; legacy sha256 password hashes persist for users who have not logged in since the PBKDF2 migration.**

Fixed (2026-08-31, Launch Security Hardening):
- Enforced mandatory cryptographic HMAC SHA-256 signature verification on all Kashier payment callbacks, webhooks, and verification endpoints; removed hardcoded secret fallbacks and insecure paymentStatus-only bypasses.
- Closed IDOR vulnerabilities in flashcards API (`/api/flashcards/card`, `/api/flashcards/review`) by validating user ownership of decks before all update, delete, and review operations.
- Implemented sliding-window rate limiting (`rate_limiter.ts`) across authentication endpoints (`login`, `register`, `otp`, `delete-account`) and resource-intensive endpoints (`upload-image`).
- Sanitized admin user search input against PostgREST filter injection.
- Added comprehensive HTTP security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) in `next.config.ts`.
- Patched path traversal vulnerability in Curriculum Generator download handler.

Mitigations already in place (preserve them): PBKDF2 password hashing with transparent legacy upgrade; crypto-random expiring OTPs; server-side Google ID-token signature verification; constant-time HMAC token comparison; DOMPurify + prompt-level SVG whitelisting on web; payload caps on report/log/notification fields; admin role checks on all admin routes; session ownership checks; self-delete prevention; KaTeX `trust:false`; exam answers withheld until submission; auth + metering on the image-analysis proxy.

---

## 21. Coding Guidelines

The mandatory rules live in **[CODING_GUIDELINES.md](CODING_GUIDELINES.md)** in this folder. Summary: no emojis in design; web responsive on all screen sizes with nothing missing; concise clean code with sparse comments and no emojis in code; latest stable technologies; zero critical vulnerabilities; when a change touches a feature linked to other pages/screens/layers, update those too so the feature works end-to-end — even when not explicitly asked (unless told not to); and after every completed task, update this PRD to reflect the change (rule 8).

Cross-cutting change map (what "linked" means in this project):
- **Chat protocol tags** (section 11): backend prompt (`deepseek.ts`) + web parser (`page.tsx`).
- **API contract:** any route change → web fetch calls in `page.tsx`.
- **DB schema:** SQL migration + `db.ts` interfaces/queries + `db_data.json` local shape.
- **Theming:** web `globals.css` tokens.
- **Grades/subjects/plans enums:** `GRADE_NAMES` (web), validation whitelists (auth routes), SQL comments.

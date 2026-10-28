# GDGoC BUSB — Chapter Management System

A production-grade, internal management web application built for **Google Developer Groups on Campus — BUSB** to manage chapter activities, technical tracks, leadership teams, student attendance, and workshop session reports.

![GDGoC Brand](https://img.shields.io/badge/GDGoC-BUSB_Chapter-4285F4?style=for-the-badge&logo=google)
![Frontend](https://img.shields.io/badge/Frontend-React_18_•_TypeScript_•_Vite_•_Tailwind-34A853?style=for-the-badge)
![Backend](https://img.shields.io/badge/Backend-Bun_•_Elysia_•_Drizzle_•_PostgreSQL-FBBC04?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-100%25_Passing-EA4335?style=for-the-badge)

---

## 🏛️ Mandatory Project Structure

This repository strictly adheres to the required two-tier architecture:

```text
gdgoc-busb/
├── Frontend/             # React, TypeScript, Vite, Tailwind CSS, shadcn/ui application
├── Backend/              # Bun, Elysia, Drizzle ORM, Supabase PostgreSQL API
├── render.yaml           # Infrastructure-as-code for Render deployment
├── .gitignore            # Root ignore rules
└── README.md             # Complete platform documentation
```

---

## ⚡ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript (strict mode), Vite 6, Tailwind CSS, Radix UI primitives, Lucide React, React Router 6, TanStack Query 5, Sonner toasts, Motion |
| **Backend** | Bun 1.4, ElysiaJS, TypeScript, Drizzle ORM, PostgreSQL driver (`postgres.js`), JWT, bcrypt |
| **Database & Storage** | Supabase PostgreSQL, Supabase Storage (with local filesystem fallback for offline development) |
| **Deployment** | Frontend on **Vercel**, Backend on **Render**, Database on **Supabase** |

---

## 🎯 Key Features & Modules

### 1. Dedicated Dual Authentication Entry
- **Organizer Entry:** Administrative access point for chapter administrators to manage tracks, review registration requests, inspect audit logs, and approve session reports.
- **Head / Vice Head Entry:** Authorized portal for track leadership to create drafts, record attendance, upload event photos, and submit reports.
- Access mode is independently validated server-side against the user's verified database permissions.

### 2. Registration & Organizer Approval Workflow
- Aspiring Heads and Vice Heads apply by selecting an official active track.
- Registrations are created in `account_status: 'pending'` and membership `status: 'pending'`.
- Dedicated **Approval Queue** allows the Organizer to inspect applicant details, approve (activating the account and logging an audit record), or reject with optional feedback.
- Pending applicants are securely blocked from accessing protected track resources.

### 3. Password Recovery
- Complete forgot-password and reset-password workflow.
- Secure, single-use, 1-hour expiration tokens stored with SHA-256 hashes.
- Never discloses account existence to unauthenticated callers.

### 4. Comprehensive Session Lifecycle
Every session report captures complete operational details across 4 structured sections:
- **Section A — Session Information:** Track name, academic season, unique session number per `(track, season)`, title, and technical content covered.
- **Section B — Date & Location:** Date, start/end time validation, format selector (In-Person vs Virtual), with conditional rendering for physical campus location or online meeting URL.
- **Section C — Materials & Media:** Session recording link, multiple photo uploads with live previews.
- **Section D — Attendance & Notes:** Non-negative student attendance count, key learning outcomes, challenges faced, and internal notes.

#### Workflow States:
```text
[Draft] ──(Submit)──> [Submitted (Under Review)] ──(Approve)──> [Approved]
                             │
                      (Request Changes)
                             │
                             ▼
                  [Changes Requested] ──(Resubmit)──> [Submitted]
```

### 5. Role-Tailored Dashboards
- **Organizer Dashboard:** Active track counts, leadership roster, pending approvals preview, session breakdown (awaiting review, returned for correction, approved), verified attendance sums, and recent chapter activities.
- **Head / Vice Head Dashboard:** Focused overview for their assigned track only, draft resumption widget, approved session counts, and quick "Create Session Report" shortcut.

### 6. Analytics & CSV Export
- Reporting summaries filtered by track, season, status, and format.
- One-click CSV export with RFC-4180 escaping and UTF-8 encoding.

### 7. Premium Google Visual Identity & Responsiveness
- Official GDGoC color tokens: Blue (`#4285F4`), Red (`#EA4335`), Yellow (`#FBBC04`), Green (`#34A853`).
- **Light, Dark, and System appearance modes** with instant persistence and zero theme flashing.
- Optimized responsive layouts tested down to **320px width** with accessible mobile navigation drawers and responsive table cards.

---

## 🛠️ Local Development Setup

### Step 1: Clone and Configure Environment

#### Backend:
```bash
cd Backend
cp .env.example .env
```
Edit `Backend/.env` with your Supabase PostgreSQL connection string or use local PostgreSQL:
```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gdgoc_busb
JWT_SECRET=super_secret_jwt_key_change_in_production_min_32_chars!
INITIAL_ORGANIZER_EMAIL=organizer@gdgoc-busb.org
INITIAL_ORGANIZER_PASSWORD=OrganizerGDG2025!
INITIAL_ORGANIZER_NAME="Chapter Organizer"
```

#### Frontend:
```bash
cd ../Frontend
cp .env.example .env
```
Ensure `VITE_API_BASE_URL` points to your backend:
```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

---

### Step 2: Install Dependencies & Run Database Seed

Install backend dependencies and seed default Organizer, Tracks, and Seasons:
```bash
cd ../Backend
bun install
bun run db:push
bun run db:seed
```

Install frontend dependencies:
```bash
cd ../Frontend
bun install
# or
pnpm install
```

---

### Step 3: Run the Development Servers

In terminal 1 (Backend API):
```bash
cd Backend
bun run dev
```
> API starts at `http://localhost:3001` with Swagger docs at `http://localhost:3001/swagger`.

In terminal 2 (Frontend React App):
```bash
cd Frontend
bun run dev
```
> Web application starts at `http://localhost:5173`.

---

## 🧪 Automated Testing & Verification

Both the backend and frontend have test suites covering critical workflows:

### Backend Tests
```bash
cd Backend
bun test
```
**Test Coverage:**
- `GET /health` service monitoring
- Rejection of invalid credentials with 401
- Password confirmation matching
- Prevention of unauthorized role escalations during registration
- Account existence concealment on password recovery
- Route protection against missing or invalid bearer tokens
- Organizer-only route access controls
- Track authorization unit tests (Organizer universal access vs Head track-level restriction)
- Pending applicant access blocking

### Frontend Tests & Production Build
```bash
cd Frontend
bun x vitest run
bun x vite build
```
**Verified Results:**
- 100% of Vitest unit and component tests passing
- TypeScript compilation passing with strict mode
- Vite production build generating optimized chunks (all under 210 kB gzipped)

---

## 🚀 Deployment Guide

### 1. Database & Storage (Supabase)
1. Create a project at [supabase.com](https://supabase.com).
2. Under **Project Settings > Database**, retrieve your PostgreSQL URI (use the **Connection Pooling / Session** string for serverless/Render).
3. Under **Storage**, create a bucket named `session-assets`.
4. Apply Drizzle migrations from the Backend directory:
   ```bash
   bun run db:push
   bun run db:seed
   ```

### 2. Backend (Render)
1. Create a new **Web Service** on [render.com](https://render.com).
2. Connect your Git repository.
3. Configure settings:
   - **Root Directory:** `Backend`
   - **Environment:** `Node` (or Bun Docker image)
   - **Build Command:** `bun install`
   - **Start Command:** `bun run start`
   - **Health Check Path:** `/health`
4. Set Environment Variables in Render:
   - `PORT`: `10000`
   - `HOST`: `0.0.0.0`
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Supabase PostgreSQL URI
   - `JWT_SECRET`: Random 32+ character string
   - `FRONTEND_URL`: Your Vercel frontend URL
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`: Supabase credentials
   - `INITIAL_ORGANIZER_EMAIL` & `INITIAL_ORGANIZER_PASSWORD`: Initial Organizer login

### 3. Frontend (Vercel)
1. Import repository to [vercel.com](https://vercel.com).
2. Set **Root Directory** to `Frontend`.
3. Set **Framework Preset** to `Vite`.
4. Configure Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-render-backend.onrender.com/api/v1`
5. Deploy! Single-page app routing is managed via `Frontend/vercel.json`.

---

## 📋 Default Seed Credentials (Development)

| Role | Email | Password | Assigned Track |
|---|---|---|---|
| **Organizer** | `organizer@gdgoc-busb.org` | `OrganizerGDG2025!` | *All Chapter Tracks* |
| **Track Head** | `web.head@gdgoc-busb.org` | `HeadGDG2025!` | Web Development |

---

## 📄 License

This software is developed exclusively for **Google Developer Groups on Campus — BUSB Chapter Operations**. All rights reserved.


# GDGoC BUSB Backend API

High-performance, secure REST API for the **GDGoC BUSB Chapter Management System**, built using Bun, Elysia, Drizzle ORM, and Supabase PostgreSQL.

---

## 🛠️ Tech Stack

- **Runtime:** [Bun](https://bun.sh/) (v1.4+)
- **Framework:** [ElysiaJS](https://elysiajs.com/)
- **Database ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Database Driver:** PostgreSQL (`postgres.js`)
- **Persistence:** Supabase PostgreSQL
- **Storage:** Supabase Storage (with automatic local uploads fallback in dev)
- **Authentication:** JWT (JSON Web Tokens) & bcrypt password hashing
- **Documentation:** Interactive OpenAPI / Swagger UI at `/swagger`

---

## 🚀 Quick Start

### 1. Prerequisites
- [Bun](https://bun.sh/) installed locally (`curl -fsSL https://bun.sh/install | bash` or on Windows: `powershell -c "irm bun.sh/install.ps1 | iex"`)
- Supabase account or local PostgreSQL instance

### 2. Environment Configuration
Copy `.env.example` to `.env` and fill in your database credentials:

```bash
cp .env.example .env
```

Key environment variables:
```env
PORT=3001
HOST=0.0.0.0
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase PostgreSQL Connection String
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require

# Authentication Secrets
JWT_SECRET=super_secret_jwt_key_change_in_production_min_32_chars!
JWT_EXPIRES_IN=7d

# Initial Organizer Seed Credentials
INITIAL_ORGANIZER_EMAIL=organizer@gdgoc-busb.org
INITIAL_ORGANIZER_PASSWORD=OrganizerGDG2025!
INITIAL_ORGANIZER_NAME="Chapter Organizer"

# Supabase Storage (Optional - falls back to local uploads if omitted)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_STORAGE_BUCKET=session-assets
```

### 3. Install Dependencies
```bash
bun install
```

### 4. Database Setup & Migrations
Push schema directly or run migrations:
```bash
bun run db:push
```

### 5. Idempotent Database Seeding
Seed initial Organizer account, official Chapter tracks, active academic season, and sample data:
```bash
bun run db:seed
```

### 6. Start Development Server
```bash
bun run dev
```
The server will start at `http://0.0.0.0:3001`.
Swagger API docs are available at `http://localhost:3001/swagger`.

### 7. Run Automated Tests
```bash
bun test
```

---

## 🏛️ Architecture & Modules

```text
Backend/src/
├── config/             # Typed environment configuration
├── db/
│   ├── schema/         # Drizzle PostgreSQL schema definitions & relations
│   ├── seed/           # Idempotent database seed script
│   └── index.ts        # Database connection pool & client
├── lib/
│   ├── auth.ts         # Secure password hashing & reset token utilities
│   ├── storage.ts      # Supabase Storage client & local fallback
│   └── audit.ts        # Chapter audit logging service
├── middleware/
│   ├── auth.ts         # JWT resolution, role & track authorization checks
│   └── error.ts        # Centralized HTTP error handler
├── modules/
│   ├── auth/           # Login, registration, forgot/reset password
│   ├── tracks/         # Track creation, updates, and leadership assignments
│   ├── seasons/        # Academic season management & active season toggle
│   ├── approvals/      # Applicant approval/rejection queue (Organizer only)
│   ├── sessions/       # Session reporting lifecycle (Draft -> Submit -> Review -> Approve)
│   ├── session-assets/ # Multi-photo upload, file validation, and asset removal
│   ├── dashboard/      # Role-tailored metrics (Organizer vs Track Head)
│   ├── reports/        # Aggregated reporting metrics & CSV file exports
│   └── audit/          # System audit logs inspection
└── index.ts            # Elysia application entry point, CORS, and healthcheck
```

---

## 🌐 Production Deployment (Render)

1. Create a **Web Service** on [Render](https://render.com/).
2. Select your repository and set the **Root Directory** to `Backend`.
3. Set **Runtime** to `Node` (or Bun container).
4. **Build Command:** `bun install`
5. **Start Command:** `bun run start`
6. Set the **Health Check Path** to `/health`.
7. Configure environment variables in the Render dashboard:
   - `PORT`: 10000 (supplied by Render)
   - `HOST`: 0.0.0.0
   - `DATABASE_URL`: Supabase Transaction/Session pooler URL
   - `JWT_SECRET`: Secure 32+ character key
   - `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://gdgoc-busb.vercel.app`)
   - `SUPABASE_URL` & `SUPABASE_SERVICE_ROLE_KEY`


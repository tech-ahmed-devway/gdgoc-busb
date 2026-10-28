# GDGoC BUSB Frontend Application

Production-ready web application for the **GDGoC BUSB Chapter Management System**, built with React, TypeScript, Vite, Tailwind CSS, and TanStack Query.

---

## 🎨 Design System & Visual Identity

- **Google Developer Groups Colors:**
  - Primary Blue: `#4285F4` (Hover `#3367D6`)
  - Red: `#EA4335`
  - Yellow: `#FBBC04`
  - Green: `#34A853`
- **Theme Modes:** Light, Dark, and System (with zero flash and localStorage persistence)
- **Responsive Viewports:** Tested down to 320px with mobile drawer navigation and touch targets >= 44px
- **Icons:** Lucide React
- **Notifications:** Sonner lightweight toasts
- **Animations:** Lightweight micro-interactions via Motion

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+) or Bun (v1.4+)
- pnpm or bun

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Set the API base URL:
```env
VITE_API_BASE_URL=http://localhost:3001/api/v1
```

### 3. Install Dependencies
```bash
bun install
# or
pnpm install
```

### 4. Development Server
```bash
bun run dev
# or
pnpm run dev
```
Open `http://localhost:5173` in your browser.

### 5. Run Unit & Component Tests
```bash
bun x vitest run
# or
pnpm run test
```

### 6. Production Build
```bash
bun x vite build
# or
pnpm run build
```
Outputs optimized, code-split bundles to `dist/`.

---

## 🏛️ Directory Structure

```text
Frontend/src/
├── app/                # App component, React Router routes, TanStack Query & Theme providers
├── assets/             # Brand logos & graphics
├── components/
│   ├── ui/             # Reusable primitives (Button, Input, Card, Dialog, Table, Tabs, Select, Badge, Sheet)
│   ├── layout/         # Collapsible Sidebar, Header, MobileNav, ThemeToggle, UserMenu
│   ├── feedback/       # EmptyState, ErrorState
│   └── data-display/   # StatusBadge, StatsCard
├── features/
│   ├── auth/           # Login (dual access mode), Registration, Pending Approval, Password Reset
│   ├── dashboard/      # Role-tailored dashboards (Organizer Overview vs Head Dashboard)
│   ├── tracks/         # Chapter tracks list & creation modal
│   ├── seasons/        # Academic seasons list & active cycle manager
│   ├── sessions/       # 4-section Session Form, Session List (cards/table), and Session Detail view
│   ├── approvals/      # Dedicated Applicant Approval Queue (Organizer)
│   ├── reports/        # Analytics summary & CSV export download
│   ├── audit/          # System audit logs
│   └── settings/       # Profile & appearance settings
├── hooks/              # useAuth, useTheme
├── layouts/            # AppLayout container
├── lib/                # utils (cn, date formatters)
├── services/           # Centralized API client (api.ts) with bearer token handling
├── types/              # TypeScript types & interface contracts
└── styles/             # Tailwind CSS tokens & globals.css
```

---

## 🌐 Production Deployment (Vercel)

1. Import the repository into [Vercel](https://vercel.com/).
2. Set **Root Directory** to `Frontend`.
3. Framework Preset: **Vite**.
4. **Build Command:** `bun x vite build` or `npm run build`.
5. **Output Directory:** `dist`.
6. Add Environment Variable:
   - `VITE_API_BASE_URL`: Your deployed Render backend URL (e.g. `https://gdgoc-busb-api.onrender.com/api/v1`)
7. Deploy! SPA routing rewrites are configured in `Frontend/vercel.json`.


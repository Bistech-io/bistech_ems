<div align="center">

# BisTech EMS

**Modern Employee Management System Web Application**

Built with **Next.js 16 (App Router + Turbopack)**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Zod** — delivering role-scoped dashboards, attendance tracking, task workflows, and workforce governance.

[![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5.x-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)](https://tanstack.com/query)
[![Vitest](https://img.shields.io/badge/Vitest-4.x-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.x-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

---

## Key Features

- **Role-Scoped Workspaces**: Tailored dashboards and navigation for `super_admin`, `hr_manager`, `department_head`, and `employee` roles, hydrated strictly from server `/auth/me` and `/dashboard/summary`.
- **Secure Cookie & CSRF Client**: Same-origin `/api/v1/*` proxy rewrites (`next.config.ts`), `X-CSRF-Token` header attachment, single-flight token refresh on `TOKEN_EXPIRED`, and strict runtime contract validation via `@ems/contracts`.
- **Attendance & Live Shift Tracking**: One-click daily check-in, live shift stopwatch synced to organization shift settings, monthly attendance calendar, and HR/Admin employee attendance views.
- **Task Boards & Review Workflow**: Manage deliverables across **My Tasks**, **My Team**, and **Department** boards with priority badges, status transitions, work submissions, review requests, and threaded comments.
- **Employee Directory & Profile Management**: Employee onboarding & work-record updates, self-service database-backed **Personal Details** (`/account/profile`), password management, and Cloudinary avatar uploads.
- **Organization & Leadership Governance**: Manage departments, department heads, designations, user roles, and organization-wide shift/weekend schedules.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js `16.4.6` (App Router, Turbopack, Cache Components, Partial Prefetching) |
| **UI & Animation** | React `19.3`, Tailwind CSS `4.3`, Framer Motion `14`, Lucide Icons |
| **State & Forms** | TanStack React Query `5`, React Hook Form `7`, `@hookform/resolvers` |
| **Contracts & Validation** | Zod `4` & internal `@ems/contracts` package |
| **API Mocking** | Mock Service Worker (`msw` `2.15`) |
| **Testing & Quality** | Vitest `4`, Testing Library, Playwright + `@axe-core/playwright`, ESLint `9` |

---

## Project Structure

```text
bistech_ems/
├── e2e/                        # Playwright E2E & accessibility test suite
├── packages/
│   └── contracts/              # Shared Zod request/response schemas (@ems/contracts)
├── public/                     # Static assets, fonts & icons
├── src/
│   ├── app/
│   │   ├── (auth)/login/       # Authentication route
│   │   ├── (app)/              # Authenticated app shell routes
│   │   └── page.tsx            # Root entry route
│   ├── components/             # Shared layout & UI primitives
│   ├── features/               # Domain modules (account, admin, attendance, auth,
│   │                           # dashboard, employees, tasks, team, organization, etc.)
│   ├── lib/                    # API client, CSRF helpers, RBAC permissions & utils
│   ├── mocks/                  # MSW handlers for offline/mocked development
│   └── providers/              # AuthProvider, QueryProvider & ThemeProvider
├── next.config.ts              # /api/:path* proxy rewrites to bistech_ems_server
└── package.json
```

---

## App Routes

| Route | Area | Description |
| :--- | :--- | :--- |
| `/login` | Auth | Sign in with organization credentials |
| `/dashboard` | Overview | Role-scoped summary metrics & task overview |
| `/attendance` | Attendance | Daily check-in, live stopwatch & personal calendar |
| `/attendance/employees` | Attendance | Organization/department employee attendance board |
| `/tasks` | Tasks | My Tasks, My Team & Department task boards + detail drawer |
| `/team` | Team | Team roster & live availability status |
| `/employees` | Employees | Employee directory, onboarding & profile editing |
| `/account/profile` | Account | Professional details, Personal Details & password update |
| `/admin/leadership` | Admin | Manage HR managers, department heads & departments |
| `/admin/organization` | Admin | Configure shift hours, grace period & organization settings |

---

## Getting Started

### Prerequisites

- **Node.js** `>= 20`
- Running instance of [`bistech_ems_server`](https://github.com/Bistech-io/bistech_ems_server) (locally on `http://localhost:4000` or deployed)

### 1. Install Dependencies

```bash
git clone https://github.com/Bistech-io/bistech_ems.git
cd bistech_ems
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and configure the backend server URL:

```bash
cp .env.example .env.local
```

```env
API_INTERNAL_URL="http://localhost:4000"
NEXT_PUBLIC_SERVER_ORIGIN="http://localhost:4000"
SESSION_COOKIE_NAME="ems_access"
NEXT_PUBLIC_API_MOCKING="disabled"
CLOUDINARY_URL="cloudinary://<api_key>:<api_secret>@<cloud_name>"
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. Next.js automatically rewrites `/api/:path*` requests to `API_INTERNAL_URL`.

---

## Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build production bundle (`next build`) |
| `npm run start` | Serve production build (`next start`) |
| `npm run lint` | Run ESLint across the codebase |
| `npm run typecheck` | Run TypeScript type checking (`tsc --noEmit`) |
| `npm test` | Run Vitest unit & component tests |
| `npm run test:e2e` | Run Playwright E2E tests (`e2e/playwright.config.ts`) |

---

<div align="center">
  <sub>Maintained by the BisTech Engineering Team</sub>
</div>

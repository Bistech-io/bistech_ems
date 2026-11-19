# MSW Auth Mock Layer

This directory contains a **completely removable** Mock Service Worker (MSW) layer for local frontend development while the NestJS backend is not running.

## Enable / Disable

Mocks are **disabled by default**. To enable them in local dev, create `.env.local` in `bistech_ems/`:

```env
NEXT_PUBLIC_API_MOCKING=enabled
```

Set `NEXT_PUBLIC_API_MOCKING=disabled` (or omit it) to talk to the real API.

## Test Accounts & Scenarios

All valid accounts use password: `DevPassword123!`

| Username | Scenario |
|---|---|
| `admin` | Valid login as **Super Admin** |
| `hr.manager` | Valid login as **HR Manager** |
| `dept.head` | Valid login as **Dept Head** |
| `employee` | Valid login as **Employee** |
| Any valid account + wrong password | `401 INVALID_CREDENTIALS` |
| `locked` | `403 ACCOUNT_LOCKED` |
| `ratelimited` | `429 RATE_LIMITED` |
| `validation` | `422 VALIDATION_ERROR` with `details[].field` |
| `expired` | Next `GET /auth/me` returns `401 TOKEN_EXPIRED` once -> `POST /auth/refresh` succeeds -> `GET /auth/me` retries and succeeds |
| `refreshfail` | Next `GET /auth/me` returns `401 TOKEN_EXPIRED` -> `POST /auth/refresh` returns `401 UNAUTHENTICATED` -> UI redirects to `/login` |

## How to Remove Completely

1. Delete `src/mocks/` and `public/mockServiceWorker.js`.
2. Remove `<MockProvider>` from `src/app/layout.tsx` and delete `src/providers/mock-provider.tsx`.
3. Remove `msw` from `package.json` if no longer needed for tests.

No feature code imports from `src/mocks/`.

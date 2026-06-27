# TEC Analytics

**System of Intelligence** for the **TEC Federated Platform** — the dashboard app
that turns raw economic activity (payments, orders, logins) into structured
intelligence: metrics, trends, and signals for merchants and platform admins.

This repo is the **Next.js frontend**. The intelligence backend is
`tec-analytics-service` (Port 4007, in `tec-core-backend`), consumed through the
API Gateway via `/api/bff/analytics/*`.

> Architecture rules and rationale live in [`CLAUDE.md`](./CLAUDE.md).
> Charter of record: `yasira82/tec-knowledge-base` → `C-105___ANALYTICS_INSTITUTIONAL_CHARTER.md`.

---

## Identity

| Field | Value |
|-------|-------|
| Domain | `https://analytics.tecosystem.app` |
| Pi App ID | `TBD` (register in Pi Developer Portal) |
| APP_SOURCE | `analytics` |
| PI_SANDBOX (prod) | `false` |

---

## Stack

- Next.js 15 App Router + TypeScript strict · React 18
- `@yasser172/tec-ui` · `@yasser172/tec-auth` · `@yasser172/tec-sdk`
- Vitest (unit) + Playwright (e2e) · Deploy: Vercel

---

## Quick start

```bash
cp .env.example .env.local
npm install --legacy-peer-deps
npm run dev
```

---

## What's included (template v2 core)

| Area | Files |
|------|-------|
| Auth / SSO | `middleware.ts` (CSRF + page guard), `api/auth/sso-callback`, `api/auth/refresh` |
| Payments | `api/bff/payment/{create,approve,complete,resolve-incomplete}`, `lib/pi-payment.ts` |
| Pi runtime | `lib/pi/PiRuntime.ts` (PAL), `lib/pi/PiCircuitBreaker.ts` |
| Observability | `api/health` (fail-safe), `lib/observability/{logger,reportError}.ts` |
| Platform | `lib/flags.ts`, `lib/bff/createHandler.ts`, `styles/tec-design-tokens.css` |
| Legal | `app/privacy`, `app/terms` (Pi Portal) |
| CI | `.github/workflows/` — payment-policy + CSRF guard + lint/typecheck/test/build + e2e |

---

## Roadmap (C-105 §11)

- ✅ **Phase 0** — App customized from template (identity, domain, slug, legal pages)
- ✅ **Phase 1** — Analytics dashboard MVP: `/api/bff/analytics/{overview,payments,users,events}`
  → `tec-analytics-service` (via gateway); `/app` dashboard (overview cards + 30d payment
  volume + recent events); inline bar chart (tec-ui charts pending C-105 §5)
- ☐ **Phase 2** — Parity (Drift Detection CI gate) + governance updates (C-105 → Current)
- ☐ **Backend gap** — merchant data-isolation (C-105 §6) needs `tec-analytics-service` to
  scope by `merchantId`; today the service returns platform-level aggregates
- ☐ **Deferred/ops** — Pi Portal registration · Supabase RLS · ALERT integration

---

## Commands

```bash
npm run dev            # dev server
npm run build          # production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit (strict)
npm run test           # vitest
npm run test:coverage  # vitest + coverage (60% floor)
npm run test:e2e       # Playwright
```

See [CHANGELOG.md](./CHANGELOG.md). Licensed [MIT](./LICENSE).

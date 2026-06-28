# Changelog

All notable changes to TEC Analytics are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/)

---

## [Unreleased]

### Added
- **Admin-gating the dashboard (C-122 §5 disclosure boundary, UX mirror):** the
  platform aggregate sections (Overview, Payments) now render only for `role === 'admin'`
  (from `usePiAuth`) — a non-admin sees an "admin-only" notice plus their own-scope
  Recent events. The platform endpoints are not fetched by non-admins (the
  `tec-analytics-service` remains the authority and 403s regardless).
- **Phase 1 — Analytics dashboard MVP (C-105 — standalone surface, §5 / §11a):**
  - BFF routes `/api/bff/analytics/{overview,payments,users,events}` — server-only
    proxy to `tec-analytics-service` via the gateway (`forwardAnalyticsGet`), Bearer
    token + `x-internal-key`, fail-closed (401 without session).
  - `/app` replaced the template demo buy page with the platform dashboard:
    overview cards (events/payments/users), 30-day payment volume + inline bar chart,
    recent events — with loading/error/retry states (C-96, no silent failures).
  - `lib-client/analytics/useAnalytics` typed hooks mirroring the service shapes.
  - +6 BFF tests (auth, gateway path, internal-key, status passthrough, limit clamp).
- **Phase 0 — app customized from `tec-template-base` v2 (C-105):** set app
  identity (`tec-analytics`, domain `analytics.tecosystem.app`, APP_SOURCE
  `analytics`), SSO audiences, page/legal metadata, and Analytics-specific
  `CLAUDE.md` + `README` (data-ownership boundary, merchant isolation, roadmap).

### Inherited (template hygiene)
- Packaging: `LICENSE` (MIT), CHANGELOG, Dependabot (`npm` + `github-actions`, weekly).
- `tsconfig`: `noUncheckedIndexedAccess` (stricter index access).

## [2.0.0] - 2026-06 — production-ready by default

### Added
- `/api/health` — uniform C-92 health signal (fail-safe, public, never 500s).
- Structured `log` + `reportError` (C-96) — no silent error handlers.
- `PiRuntime` (PAL) + `PiCircuitBreaker` — single choke-point for `window.Pi.*`.
- `lib/flags.ts` — feature flags (`NEXT_PUBLIC_FLAG_*`) from day one.
- Coverage gate (`test:coverage`, 60% floor).

## [1.0.0] - initial

- Portal-ready skeleton: Hub SSO, dual-mode Pi payments (ADR-007), CSRF
  (middleware-only, C-12 §11), unified payment contract (ADR-009), legal pages,
  and CI policy guards (payment-policy + CSRF + lint/typecheck/test/build).

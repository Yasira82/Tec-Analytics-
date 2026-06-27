# TEC Analytics — Claude Code Instructions

> ⚡ **SESSION START — أول حاجة:** اقرأ `knowledge-base/C-02___CURRENT_STATE_.md` من `yasira82/tec-knowledge-base` (branch: `main`) — ده مصدر الحقيقة للوضع الحالي. لا تعتمد على الذاكرة أو الملخص.
> **App charter:** `knowledge-base/C-105___ANALYTICS_INSTITUTIONAL_CHARTER.md`.

---

## What This App Is

**System of Intelligence** for the TEC Federated Platform — the frontend dashboard
that turns raw economic activity (payments, orders, logins) into structured
intelligence: metrics, trends, and signals for merchants and platform admins.

This repo is the **Next.js frontend**. The intelligence backend is
`tec-analytics-service` (Port 4007, in `tec-core-backend`), consumed through the
API Gateway via `/api/bff/analytics/*`.

**Current Phase: Phase 0 — built from `tec-template-base` v2.** Charter C-105 is
`[Planned State]`; building this app moves it toward `[Current State]`.

---

## Pi App Identity

| Field | Value |
|-------|-------|
| **App** | TEC Analytics |
| **Domain** | `https://analytics.tecosystem.app` |
| **Pi App ID** | `TBD` — register in Pi Developer Portal |
| **APP_SOURCE slug** | `analytics` |
| **PI_SANDBOX** | `false` (Mainnet) |

---

## Stack

- Next.js 15 App Router + TypeScript strict · React 18
- `@yasser172/tec-ui` (design system) · `@yasser172/tec-auth` · `@yasser172/tec-sdk`
- Vitest (unit) + Playwright (e2e) · Deployment: Vercel

---

## Architecture Rules (non-negotiable)

### CSRF — middleware ONLY (P2 single source of truth)
CSRF is enforced in **`middleware.ts`** and **nowhere else**: a request is trusted
if the double-submit token matches **OR** it is first-party (Origin host === Host /
`*.tecosystem.app`).
- ❌ **NEVER** add a CSRF check inside a route handler — it 403's legit Mode-2
  payments in Pi Browser (drops `sameSite=None` cookies). CI `payment-policy` fails
  the build if you do. (KB C-12 §11)
- ✅ A route may *forward* `x-csrf-token` downstream; it must never *validate* it.

### ADR-007 — Dual-mode payment (Pi foreign session)
Every buy handler MUST guard before touching `window.Pi`:
```typescript
const isHubNavigation = () =>
  document.referrer.toLowerCase().includes('hub.tecosystem.app');
if (isHubNavigation() || !(window as any).Pi || !piReady) {
  redirectToHubPayment(...);   // Mode 1: Hub modal → /hub?pay=1&...
  return;
}
// Mode 2: standalone — createPaymentRecord() then createU2APayment() (src/lib/pi-payment.ts)
```
> **Note:** Analytics monetization (C-105 §7) is subscription-based (Merchant Pro /
> Enterprise) via Hub. The payment scaffold is kept for compliance + optionality;
> if a direct buy flow is added, it MUST keep the ADR-007 guard.

### ADR-009 — Unified payment contract
`amount` is a **number**; gateway path is **`/api/payment/*`** (singular); the only
inter-service header is **`x-internal-key`** + `INTERNAL_SECRET`. Don't re-declare
payment Zod locally — shapes live in `@yasser172/tec-sdk`.

### Two-SDK boundary
```
Client components → src/lib-client/*  (browser state, Pi hooks)
API routes (BFF)  → @yasser172/tec-sdk via /api/bff/*  (server-only)
```

### Auth / cookies (LOCKED)
SSO via Hub cookies `tec_access_token`, `tec_csrf`, `tec_user`. Never localStorage.
Identity is derived from the `tec_user` cookie server-side — **never from the request body**.

---

## Analytics-Specific Rules (C-105)

### Data ownership boundary
Analytics **OWNS**: metric aggregation, trend/signal computation, dashboard delivery.
Analytics does **NOT OWN**: transaction truth (`tec-payment-service`), order truth
(`tec-commerce-service`), identity truth (`tec-auth-service`). Read those as
**ID-only references** — never re-derive or mutate them here.

### Merchant data isolation (C-105 §6) — enforce at BFF layer
- A merchant sees **ONLY their own** metrics — derive `merchantId` from the
  `tec_user` session cookie, **never** from a query param or request body.
- Platform-admin aggregate access requires AdminActor + audit trail.
- No cross-merchant data leakage. Fail closed (P6): no session → no data.

### Consistency model
Analytics is **eventual consistency** (C-47 §6) — aggregations tolerate lag. Never
present analytics figures as financial truth; the source of truth is the owning service.

### Logging (Invariant #9)
Analytics data is non-sensitive **but still logged** — every query carries actor
context. Use `log.*` / `reportError` (src/lib/observability), never silent catches.

---

## What's included (from template v2)

```
middleware.ts                              CSRF (double-submit OR Origin) + page guard
src/app/api/auth/sso-callback/route.ts     Hub SSO landing (open-redirect-safe)
src/app/api/auth/refresh/route.ts          token refresh
src/app/api/bff/payment/{create,approve,complete,resolve-incomplete}/route.ts
src/app/api/bff/items/route.ts             example domain route (copy for /analytics/*)
src/app/api/health/route.ts                health endpoint (C-92/C-96) — never 500s
src/lib/pi-payment.ts                      createPaymentRecord + createU2APayment
src/lib/pi/PiRuntime.ts                    PAL — single choke-point for window.Pi.*
src/lib/pi/PiCircuitBreaker.ts             CLOSED→OPEN→HALF_OPEN (3 fails → 60s)
src/lib/flags.ts                           feature flags (NEXT_PUBLIC_FLAG_*)
src/lib/observability/{logger,reportError}.ts   structured logs (C-96) + Sentry hook
src/app/privacy · terms                    Pi Portal legal pages
.github/workflows/                         payment-policy + CSRF guard + lint/typecheck/test/build + e2e
```

---

## Roadmap (C-105 §11)

```
✅ Phase 0 — App customized from template (identity, domain, slug, legal pages)
✅ Phase 1 — Analytics dashboard MVP
     · /api/bff/analytics/{overview,payments,users,events} → tec-analytics-service (via gateway)
     · /app dashboard: overview cards + payment volume (30d) + recent events
     · inline bar chart (Pi-Browser safe; tec-ui charts pending C-105 §5)
□  Phase 2 — Parity + governance: Drift Detection CI gate · update C-105 → Current,
     rollout-registry to-build → live, C-01 Pi App ID once registered
□  Backend gap — tec-analytics-service is PLATFORM-level (no merchantId scoping). Merchant
     data-isolation (C-105 §6) needs the SERVICE to filter by merchant before the BFF can.
□  Deferred/ops — Pi Portal registration · Supabase RLS (P2-1) · ALERT integration (P2-2)
```

---

## Development Commands

```bash
npm run dev            # dev server
npm run build          # production build
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit (strict)
npm run test           # vitest
npm run test:coverage  # vitest + coverage (60% floor)
npm run test:e2e       # Playwright
```

---

## What NOT To Do

- Do NOT validate CSRF in a route handler — middleware only (CI blocks it)
- Do NOT send `amount` as a string, or use `/payments` / `x-service-secret`
- Do NOT skip the ADR-007 `isHubNavigation()` guard before `window.Pi`
- Do NOT store tokens in localStorage; do NOT derive identity (or `merchantId`) from the body
- Do NOT add `NEXT_PUBLIC_*` for internal service URLs or `INTERNAL_SECRET`
- Do NOT present analytics aggregates as financial truth — owning service is source of truth
- Do NOT leak cross-merchant data — isolate by session `merchantId` at the BFF layer

---

## Commit Convention

```
feat(analytics):  new dashboard / metric feature
fix(analytics):   bug fix          fix(payment): payment flow fix (test carefully)
chore(scope):     build/config
```

---

## Knowledge Base Reference
→ `yasira82/tec-knowledge-base` (branch: `main`)
→ **Current State: `knowledge-base/C-02___CURRENT_STATE_.md`** — اقرأه أول كل session
→ App charter: `knowledge-base/C-105___ANALYTICS_INSTITUTIONAL_CHARTER.md`
→ Dual-Mode Payment + anti-regression: `knowledge-base/C-12_Dual_Mode_Payment.md`
→ Payment ownership (ADR-007): `knowledge-base/C-76___ADR-007.md`
→ Event governance (Redis Streams): `knowledge-base/C-70___EVENT_GOVERNANCE_SPEC.md`
→ Domain ownership matrix: `knowledge-base/C-68___DOMAIN_OWNERSHIP_MATRIX.md`

---

## Skills

Available via plugin — invoke automatically when the situation matches:

| Situation | Skill |
|-----------|-------|
| Writing new feature or fixing a bug → use TDD | `/tdd` |
| Bug, regression, or unexpected behavior | `/diagnose` |
| Writing or modifying tests | `/test-guard` |
| Writing or modifying BFF routes, payment handlers, or API contracts | `/clean-code-guard` |
| Updating docs, CLAUDE.md, or knowledge-base entries | `/docs-guard` |
| Planning a new feature or architectural decision | `/grill-with-docs` |
| Breaking down a roadmap item into GitHub Issues | `/to-issues` |
| Session is getting long or context is filling up | `/handoff` |
| Adding pre-commit hooks to this repo | `/setup-pre-commit` |

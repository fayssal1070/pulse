# Plan de PRs - Transformation Pulse en produit FinOps complet

## PR1: Data Model + CostEvent + KPIs basiques
**Fichiers créés:**
- `prisma/migrations/XXXX_add_cost_event_model/migration.sql` (via `prisma migrate`)
- `lib/cost-events/query.ts` (agrégations KPIs)
- `lib/cost-events/types.ts` (types TypeScript)

**Fichiers modifiés:**
- `prisma/schema.prisma` (ajout CostEvent, Budget, AiGatewayKey, AiPolicy, AiRequestLog + extensions Organization/CloudAccount)
- `app/api/build-info/route.ts` (déjà OK, vérifier)

**Objectif:** Modèle de données unifié prêt + fonctions de requête KPIs (today, MTD, MoM)

---

## PR2: Ingestion AWS CUR
**Fichiers créés:**
- `lib/aws/cur.ts` (parser CUR S3 CSV/Parquet)
- `lib/aws/cur-normalizer.ts` (normalisation → CostEvent)
- `app/api/aws/cur/sync-now/route.ts` (endpoint manuel)
- `app/api/cron/sync-aws-cur/route.ts` (job cron)

**Fichiers modifiés:**
- `prisma/schema.prisma` (si besoin ajustements)
- `lib/organizations.ts` (helpers CUR config)

**Objectif:** Sync CUR S3 → CostEvents AWS avec déduplication

---

## PR3: AI Gateway + SDK
**Fichiers créés:**
- `lib/ai/gateway.ts` (proxy + policy enforcement)
- `lib/ai/pricing.ts` (estimation coûts LLM)
- `app/api/ai/gateway/route.ts` (endpoint gateway)
- `packages/pulse-sdk/src/index.ts` (SDK JS minimal)
- `packages/pulse-sdk/package.json`

**Fichiers modifiés:**
- `prisma/schema.prisma` (si besoin ajustements)

**Objectif:** Gateway HTTP + SDK qui logue AiRequestLog + crée CostEvents AI

---

## PR4: Dashboard exécutif + Pages UX
**Fichiers créés:**
- `app/costs/page.tsx` (drilldown unifié)
- `app/aws/accounts/page.tsx` (connexions CUR + status)
- `app/ai/page.tsx` (gateway keys + policy)
- `app/audit/page.tsx` (logs IA)
- `app/settings/roles/page.tsx` (RBAC)
- `components/dashboard/executive-kpis.tsx`
- `components/dashboard/top-consumers.tsx`
- `components/dashboard/recommended-actions.tsx`

**Fichiers modifiés:**
- `app/dashboard/page.tsx` (refonte executive)
- `app/alerts/page.tsx` (basé sur CostEvent)
- `app/budgets/page.tsx` (basé sur CostEvent)
- `components/app-shell.tsx` (navigation globale)

**Objectif:** UX complète avec dashboard action-first

---

## PR5: Budgets & Alertes CostEvent + RBAC
**Fichiers créés:**
- `lib/budgets/evaluator.ts` (évaluation budgets CostEvent)
- `lib/alerts/cost-event-alerts.ts` (alertes basées CostEvent)
- `app/api/budgets/route.ts` (CRUD)
- `app/api/costs/query/route.ts` (filtres + groupBy)

**Fichiers modifiés:**
- `lib/alerts-evaluator.ts` (intégration CostEvent)
- `app/api/alerts/route.ts` (basé sur CostEvent)
- `lib/auth-helpers.ts` (RBAC: admin/finance/manager/user)

**Objectif:** Budgets & alertes fonctionnels + RBAC minimal

---

## Validation finale
- `/api/build-info` → 200 JSON
- `/dashboard` → KPIs AWS+AI (même si 0)
- Gateway AI → crée AiRequestLog + CostEvent
- Sync CUR → crée CostEvents AWS
- `/costs` → filtre par source/date/project/team/user/model


# PR13 Validation Checklist

## 1) Prisma model CronRun + Migration

### Migration SQL Safe
- [ ] Migration file created: `prisma/migrations/20250130000000_add_cron_run/migration.sql`
- [ ] Uses `CREATE TABLE IF NOT EXISTS` (safe)
- [ ] Uses `CREATE INDEX IF NOT EXISTS` (safe)
- [ ] Foreign key constraint uses DO block with IF NOT EXISTS check
- [ ] Migration can be run multiple times without errors

### Model Prisma
- [ ] Model `CronRun` added to `prisma/schema.prisma`
- [ ] Fields: id (cuid), orgId (nullable), type, status (SUCCESS|FAIL), startedAt, finishedAt, error (nullable), metaJson (nullable)
- [ ] Indexes: type, status, startedAt, type+startedAt, orgId
- [ ] Relation to Organization (nullable, SetNull on delete)

## 2) Cron endpoints logging

### /api/cron/run-alerts
- [ ] Creates CronRun at start (type: RUN_ALERTS, status: FAIL initially)
- [ ] Updates on success: status=SUCCESS, finishedAt, metaJson
- [ ] Updates on error: status=FAIL, finishedAt, error
- [ ] Never fails cron response if logging fails (try/catch around logging)

### /api/cron/apply-retention
- [ ] Creates CronRun at start (type: APPLY_RETENTION, status: FAIL initially)
- [ ] Updates on success: status=SUCCESS, finishedAt, metaJson
- [ ] Updates on error: status=FAIL, finishedAt, error
- [ ] Never fails cron response if logging fails (try/catch around logging)

### /api/cron/sync-aws-cur
- [ ] Creates CronRun at start (type: SYNC_AWS_CUR, status: FAIL initially)
- [ ] Updates on success: status=SUCCESS, finishedAt, metaJson
- [ ] Updates on error: status=FAIL, finishedAt, error
- [ ] Never fails cron response if logging fails (try/catch around logging)

## 3) API /api/admin/health

### Admin only
- [ ] Returns 403 if not admin
- [ ] Returns JSON with all required fields

### Response structure
- [ ] `ok`: boolean
- [ ] `env`: { nodeEnv, vercelEnv, commitSha }
- [ ] `db`: { ok, latency, host, port, dbname, connectionType }
- [ ] `migrations`: { lastMigration, appliedAt }
- [ ] `cron`: { RUN_ALERTS, APPLY_RETENTION, SYNC_AWS_CUR } (last run per type)
- [ ] `recentErrors`: last 10 FAIL cron runs

## 4) UI /admin/health

### Admin only
- [ ] Redirects to /dashboard?error=admin_required if not admin
- [ ] Shows DB status + latency
- [ ] Shows migrations: last migration name + appliedAt
- [ ] Shows cron: last run time + status + error for each type
- [ ] Copy JSON button works
- [ ] data-testid présents:
  - health-db-status
  - health-migrations
  - health-cron-alerts
  - health-cron-retention
  - health-cron-cur

## 5) Diagnostics card on /dashboard

### Admin only
- [ ] Card visible only for admin users
- [ ] Shows last alerts cron status
- [ ] Shows last CUR sync batch status
- [ ] Shows last retention cron status
- [ ] Link "View Details →" goes to /admin/health
- [ ] Auto-refreshes every 60 seconds

## Tests rapides (5 étapes)

1. **Migration**: Run migration SQL manually or via `npx prisma migrate deploy`, verify table created
2. **Cron logging**: Trigger a cron endpoint (e.g., /api/cron/run-alerts with CRON_SECRET), verify CronRun created in DB
3. **Health API**: GET /api/admin/health as admin, verify JSON response with all fields
4. **Health UI**: Visit /admin/health as admin, verify all sections visible + Copy JSON works
5. **Dashboard card**: Visit /dashboard as admin, verify Diagnostics card visible with cron statuses

## Notes

- Multi-tenant: orgId nullable (crons can be org-agnostic)
- Never fail cron response if logging fails (try/catch around all logging)
- Build TypeScript doit passer (`npm run build`)


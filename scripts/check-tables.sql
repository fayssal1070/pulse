-- Check if tables exist
SELECT
  to_regclass('public."AiGatewayKey"') AS "AiGatewayKey",
  to_regclass('public."AiPolicy"') AS "AiPolicy",
  to_regclass('public."AiRequestLog"') AS "AiRequestLog",
  to_regclass('public."CostEvent"') AS "CostEvent",
  to_regclass('public."Budget"') AS "Budget",
  to_regclass('public."IngestionBatch"') AS "IngestionBatch";

-- Check migration status
SELECT migration_name, finished_at, applied_steps_count 
FROM "_prisma_migrations" 
ORDER BY started_at DESC 
LIMIT 10;


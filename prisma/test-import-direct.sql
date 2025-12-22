-- Test import direct dans la DB pour vérifier que le dashboard se met à jour
INSERT INTO "CostRecord" (id, "orgId", date, provider, service, "amountEUR", currency, "createdAt")
VALUES 
  ('test-import-1', 'seed-org-1', '2024-12-21', 'AWS', 'EC2', 300.00, 'EUR', NOW()),
  ('test-import-2', 'seed-org-1', '2024-12-20', 'Azure', 'Storage', 200.00, 'EUR', NOW()),
  ('test-import-3', 'seed-org-1', '2024-12-19', 'GCP', 'Compute', 400.00, 'EUR', NOW())
ON CONFLICT (id) DO NOTHING;

-- Vérifier après import
SELECT COUNT(*) as count_after, COALESCE(SUM("amountEUR"), 0) as total_after
FROM "CostRecord"
WHERE "orgId" = 'seed-org-1';


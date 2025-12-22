-- Import avec dates récentes (dans les 7 derniers jours)
INSERT INTO "CostRecord" (id, "orgId", date, provider, service, "amountEUR", currency, "createdAt")
VALUES 
  ('test-recent-1', 'seed-org-1', NOW() - INTERVAL '2 days', 'AWS', 'EC2', 300.00, 'EUR', NOW()),
  ('test-recent-2', 'seed-org-1', NOW() - INTERVAL '1 day', 'Azure', 'Storage', 200.00, 'EUR', NOW()),
  ('test-recent-3', 'seed-org-1', NOW() - INTERVAL '3 days', 'GCP', 'Compute', 400.00, 'EUR', NOW())
ON CONFLICT (id) DO NOTHING;

-- Vérifier les totaux après import
SELECT 
  COALESCE(SUM(CASE WHEN date >= NOW() - INTERVAL '7 days' THEN "amountEUR" ELSE 0 END), 0) as total_7_days,
  COALESCE(SUM(CASE WHEN date >= NOW() - INTERVAL '30 days' THEN "amountEUR" ELSE 0 END), 0) as total_30_days
FROM "CostRecord"
WHERE "orgId" = 'seed-org-1';


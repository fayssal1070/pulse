-- Vérifier les totaux après import
-- Total 7 jours
SELECT COALESCE(SUM("amountEUR"), 0) as total_7_days
FROM "CostRecord"
WHERE "orgId" = 'seed-org-1'
AND date >= NOW() - INTERVAL '7 days';

-- Total 30 jours
SELECT COALESCE(SUM("amountEUR"), 0) as total_30_days
FROM "CostRecord"
WHERE "orgId" = 'seed-org-1'
AND date >= NOW() - INTERVAL '30 days';

-- Top services
SELECT provider, service, SUM("amountEUR") as total
FROM "CostRecord"
WHERE "orgId" = 'seed-org-1'
AND date >= NOW() - INTERVAL '30 days'
GROUP BY provider, service
ORDER BY total DESC
LIMIT 5;


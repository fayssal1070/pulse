-- Vérifier les données pour le dashboard
SELECT COUNT(*) as total_records FROM "CostRecord";

SELECT "orgId", COUNT(*) as count FROM "CostRecord" GROUP BY "orgId";

SELECT 
  DATE(date) as day,
  SUM("amountEUR") as total
FROM "CostRecord"
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY DATE(date)
ORDER BY day DESC
LIMIT 10;


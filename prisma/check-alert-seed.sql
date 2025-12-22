-- Vérifier la règle d'alerte seed
SELECT id, "orgId", "thresholdEUR", "windowDays", triggered, "triggeredAt"
FROM "AlertRule"
WHERE "orgId" = (SELECT "orgId" FROM "Membership" m JOIN "User" u ON m."userId" = u.id WHERE u.email = 'owner@example.com' LIMIT 1);

-- Calculer le total des 7 derniers jours pour cette org
SELECT COALESCE(SUM("amountEUR"), 0) as total_7_days
FROM "CostRecord"
WHERE "orgId" = (SELECT "orgId" FROM "Membership" m JOIN "User" u ON m."userId" = u.id WHERE u.email = 'owner@example.com' LIMIT 1)
AND date >= NOW() - INTERVAL '7 days';


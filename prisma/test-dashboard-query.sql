-- Test des requêtes du dashboard pour l'utilisateur seed
-- 1. Total 7 jours
SELECT COALESCE(SUM("amountEUR"), 0) as total_7_days
FROM "CostRecord"
WHERE "orgId" IN (SELECT "orgId" FROM "Membership" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'owner@example.com'))
AND date >= NOW() - INTERVAL '7 days';

-- 2. Total 30 jours
SELECT COALESCE(SUM("amountEUR"), 0) as total_30_days
FROM "CostRecord"
WHERE "orgId" IN (SELECT "orgId" FROM "Membership" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'owner@example.com'))
AND date >= NOW() - INTERVAL '30 days';

-- 3. Top services (30 jours) - exemple
SELECT provider, service, SUM("amountEUR") as total
FROM "CostRecord"
WHERE "orgId" IN (SELECT "orgId" FROM "Membership" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'owner@example.com'))
AND date >= NOW() - INTERVAL '30 days'
GROUP BY provider, service
ORDER BY total DESC
LIMIT 5;


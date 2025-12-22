-- Compter les coûts avant import
SELECT COUNT(*) as count_before, COALESCE(SUM("amountEUR"), 0) as total_before
FROM "CostRecord"
WHERE "orgId" = (SELECT "orgId" FROM "Membership" m JOIN "User" u ON m."userId" = u.id WHERE u.email = 'owner@example.com' LIMIT 1);


-- Vérifier que l'utilisateur seed a accès à l'organisation
SELECT u.email, m."orgId", o.name
FROM "User" u
JOIN "Membership" m ON u.id = m."userId"
JOIN "Organization" o ON m."orgId" = o.id
WHERE u.email = 'owner@example.com';

-- Vérifier les coûts pour cette organisation
SELECT COUNT(*) as total_costs, SUM("amountEUR") as total_amount
FROM "CostRecord"
WHERE "orgId" = (SELECT "orgId" FROM "Membership" m JOIN "User" u ON m."userId" = u.id WHERE u.email = 'owner@example.com' LIMIT 1);


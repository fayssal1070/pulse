-- Vérification des données seed
SELECT 'User' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'Organization', COUNT(*) FROM "Organization"
UNION ALL
SELECT 'Membership', COUNT(*) FROM "Membership"
UNION ALL
SELECT 'CostRecord', COUNT(*) FROM "CostRecord"
UNION ALL
SELECT 'AlertRule', COUNT(*) FROM "AlertRule";

-- Détails User
SELECT email FROM "User";

-- Détails Organization
SELECT name FROM "Organization";

-- Détails Membership
SELECT role FROM "Membership";

-- Répartition CostRecord par provider
SELECT provider, COUNT(*) as count FROM "CostRecord" GROUP BY provider ORDER BY count DESC;

-- Période des CostRecords
SELECT MIN(date) as oldest, MAX(date) as newest, COUNT(*) as total FROM "CostRecord";

-- Détails AlertRule
SELECT "thresholdEUR", "windowDays", triggered FROM "AlertRule";


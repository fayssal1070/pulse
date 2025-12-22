-- Vérifier que la règle d'alerte seed a été déclenchée
SELECT id, "orgId", "thresholdEUR", "windowDays", triggered, "triggeredAt"
FROM "AlertRule"
WHERE "orgId" = 'seed-org-1';


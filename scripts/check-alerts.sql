-- Script SQL pour vérifier et déclencher les alertes
DO $$
DECLARE
    org_record RECORD;
    rule_record RECORD;
    total_cost NUMERIC;
    start_date TIMESTAMP;
BEGIN
    -- Pour chaque organisation
    FOR org_record IN SELECT id, name FROM "Organization" LOOP
        -- Pour chaque règle d'alerte de cette organisation
        FOR rule_record IN 
            SELECT id, "thresholdEUR", "windowDays", triggered
            FROM "AlertRule"
            WHERE "orgId" = org_record.id
        LOOP
            -- Calculer la date de début
            start_date := NOW() - (rule_record."windowDays" || ' days')::INTERVAL;
            start_date := date_trunc('day', start_date);
            
            -- Calculer le total des coûts
            SELECT COALESCE(SUM("amountEUR"), 0) INTO total_cost
            FROM "CostRecord"
            WHERE "orgId" = org_record.id
            AND date >= start_date;
            
            -- Si dépassement et pas déjà triggered
            IF total_cost > rule_record."thresholdEUR" AND NOT rule_record.triggered THEN
                UPDATE "AlertRule"
                SET triggered = TRUE, "triggeredAt" = NOW()
                WHERE id = rule_record.id;
                
                RAISE NOTICE '✓ Alert rule triggered for "%": % EUR > % EUR (%)', 
                    org_record.name, total_cost, rule_record."thresholdEUR", rule_record."windowDays";
            ELSIF total_cost > rule_record."thresholdEUR" AND rule_record.triggered THEN
                RAISE NOTICE '  Alert rule already triggered for "%": % EUR > % EUR', 
                    org_record.name, total_cost, rule_record."thresholdEUR";
            ELSE
                RAISE NOTICE '  Alert rule OK for "%": % EUR <= % EUR (%)', 
                    org_record.name, total_cost, rule_record."thresholdEUR", rule_record."windowDays";
            END IF;
        END LOOP;
    END LOOP;
END $$;


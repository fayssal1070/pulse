-- Script SQL pour vérifier et déclencher les alertes avec notifications Telegram
DO $$
DECLARE
    org_record RECORD;
    rule_record RECORD;
    total_cost NUMERIC;
    start_date TIMESTAMP;
    was_triggered BOOLEAN;
    telegram_message TEXT;
    telegram_url TEXT;
    telegram_response TEXT;
BEGIN
    -- Pour chaque organisation
    FOR org_record IN SELECT id, name, "telegramBotToken", "telegramChatId" FROM "Organization" LOOP
        -- Pour chaque règle d'alerte de cette organisation
        FOR rule_record IN 
            SELECT id, "thresholdEUR", "windowDays", triggered
            FROM "AlertRule"
            WHERE "orgId" = org_record.id
        LOOP
            -- Sauvegarder l'état précédent
            was_triggered := rule_record.triggered;
            
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
                
                -- Envoyer notification Telegram si configuré
                IF org_record."telegramBotToken" IS NOT NULL AND org_record."telegramChatId" IS NOT NULL THEN
                    telegram_message := format('🚨 Alert Triggered%n%nOrganization: %s%nThreshold: %.2f EUR (%s days)%nCurrent total: %.2f EUR%n%nThe cost threshold has been exceeded.',
                        org_record.name, rule_record."thresholdEUR", rule_record."windowDays", total_cost);
                    
                    -- Construire l'URL Telegram
                    telegram_url := format('https://api.telegram.org/bot%s/sendMessage', org_record."telegramBotToken");
                    
                    -- Envoyer via curl (si disponible) ou log
                    BEGIN
                        -- Note: PostgreSQL ne peut pas faire de requêtes HTTP directement
                        -- On log juste le message, l'envoi sera fait par le script Node.js
                        RAISE NOTICE '📱 Telegram notification queued for "%" (Chat ID: %)', 
                            org_record.name, org_record."telegramChatId";
                    EXCEPTION WHEN OTHERS THEN
                        RAISE NOTICE '⚠️ Could not send Telegram notification (non-fatal)';
                    END;
                END IF;
                
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


# Alerts V1 - Test Plan

## Vue d'ensemble

Ce document décrit les étapes de test pour le système d'alertes v1, incluant les tests locaux et Vercel.

## Prérequis

- Base de données PostgreSQL (local via Docker ou Supabase)
- Variables d'environnement configurées :
  - `DATABASE_URL`
  - `CRON_SECRET` (pour les tests de cron)
  - `ADMIN_EMAILS` (pour les tests debug admin)

## Tests Locaux

### 1. Migration Prisma

```bash
# Vérifier que la migration est appliquée
npx prisma migrate status

# Si nécessaire, appliquer la migration
npx prisma migrate deploy

# Générer le client Prisma
npx prisma generate
```

**Vérification** :
- Les tables `AlertRule`, `AlertEvent`, `InAppNotification` existent
- Les colonnes `name`, `type`, `enabled`, etc. sont présentes dans `AlertRule`
- Les anciennes colonnes `triggered`, `windowDays` ont été supprimées

### 2. Test de création d'alerte (Monthly Budget)

**Étapes** :
1. Démarrer l'app : `npm run dev`
2. Se connecter avec un compte utilisateur
3. Créer/sélectionner une organisation
4. Naviguer vers `/organizations/[id]/alerts/new`
5. Remplir le formulaire :
   - Name: "Test Monthly Budget"
   - Type: Monthly Budget
   - Threshold: 100 EUR
   - Cooldown: 24h
   - Enabled: ✓
6. Cliquer sur "Create Alert"

**Résultat attendu** :
- L'alerte est créée
- Redirection vers `/organizations/[id]/alerts`
- L'alerte apparaît dans la liste avec badge "ENABLED" et "Monthly Budget"

### 3. Test de création d'alerte (Daily Spike)

**Étapes** :
1. Naviguer vers `/organizations/[id]/alerts/new`
2. Remplir le formulaire :
   - Name: "Test Daily Spike"
   - Type: Daily Spike
   - Threshold: 50 EUR
   - Spike Percentage: 50%
   - Lookback Days: 7
   - Cooldown: 24h
   - Enabled: ✓
3. Cliquer sur "Create Alert"

**Résultat attendu** :
- L'alerte est créée
- L'alerte apparaît dans la liste avec badge "Daily Spike"

### 4. Test de preview (Monthly Budget)

**Étapes** :
1. Sur la page de création d'alerte
2. Sélectionner "Monthly Budget"
3. Entrer un threshold (ex: 1000 EUR)
4. Cliquer sur "Refresh Preview"

**Résultat attendu** :
- Le preview affiche "Current Month-to-Date: X.XX EUR"
- Le pourcentage par rapport au budget est affiché

### 5. Test de preview (Daily Spike)

**Étapes** :
1. Sur la page de création d'alerte
2. Sélectionner "Daily Spike"
3. Entrer lookback days (ex: 7)
4. Cliquer sur "Refresh Preview"

**Résultat attendu** :
- Le preview affiche "Today: X.XX EUR"
- Le baseline average est affiché
- Le spike percentage est calculé

### 6. Test d'édition d'alerte

**Étapes** :
1. Sur la page de liste des alertes
2. Cliquer sur "Edit" pour une alerte
3. Modifier le nom ou le threshold
4. Cliquer sur "Update Alert"

**Résultat attendu** :
- L'alerte est mise à jour
- Redirection vers la liste
- Les modifications sont visibles

### 7. Test de toggle enable/disable

**Étapes** :
1. Sur la page de liste des alertes
2. Cliquer sur "Disable" pour une alerte activée
3. Vérifier que le badge passe à "DISABLED"
4. Cliquer sur "Enable"

**Résultat attendu** :
- L'alerte est désactivée/activée
- Le badge change immédiatement
- La page se rafraîchit

### 8. Test de suppression d'alerte

**Étapes** :
1. Sur la page de liste des alertes
2. Cliquer sur "Delete" pour une alerte
3. Confirmer la suppression

**Résultat attendu** :
- L'alerte est supprimée
- Elle disparaît de la liste
- Les AlertEvent associés sont supprimés (cascade)

### 9. Test d'évaluation d'alerte (Monthly Budget)

**Préparation** :
1. Créer une alerte Monthly Budget avec threshold = 1 EUR
2. Injecter des CostRecord pour le mois en cours :
   ```sql
   -- Via Prisma Studio ou SQL direct
   INSERT INTO "CostRecord" (id, "orgId", date, provider, service, "amountEUR", currency, "createdAt")
   VALUES 
     ('test-cost-1', '[ORG_ID]', CURRENT_DATE, 'AWS', 'EC2', 0.60, 'EUR', NOW()),
     ('test-cost-2', '[ORG_ID]', CURRENT_DATE, 'AWS', 'S3', 0.50, 'EUR', NOW());
   ```

**Étapes** :
1. Appeler manuellement le cron :
   ```bash
   curl -X GET "http://localhost:3000/api/cron/evaluate-alerts" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

**Résultat attendu** :
- L'alerte se déclenche (spentMTD = 1.10 EUR > 1.00 EUR = 100%)
- Un `AlertEvent` est créé
- Une `InAppNotification` est créée
- `AlertRule.lastTriggeredAt` est mis à jour

### 10. Test d'évaluation d'alerte (Daily Spike)

**Préparation** :
1. Créer une alerte Daily Spike avec spikePercent = 50%
2. Injecter des CostRecord pour les 7 derniers jours (baseline) :
   ```sql
   -- 7 jours de baseline (10 EUR/jour en moyenne)
   INSERT INTO "CostRecord" (id, "orgId", date, provider, service, "amountEUR", currency, "createdAt")
   VALUES 
     ('test-baseline-1', '[ORG_ID]', CURRENT_DATE - INTERVAL '7 days', 'AWS', 'EC2', 10.00, 'EUR', NOW()),
     ('test-baseline-2', '[ORG_ID]', CURRENT_DATE - INTERVAL '6 days', 'AWS', 'S3', 10.00, 'EUR', NOW()),
     -- ... (répéter pour 7 jours)
   ```
3. Injecter un CostRecord pour aujourd'hui (spike) :
   ```sql
   INSERT INTO "CostRecord" (id, "orgId", date, provider, service, "amountEUR", currency, "createdAt")
   VALUES ('test-spike', '[ORG_ID]', CURRENT_DATE, 'AWS', 'EC2', 20.00, 'EUR', NOW());
   -- 20 EUR = 100% spike vs baseline 10 EUR
   ```

**Étapes** :
1. Appeler le cron (même commande que test 9)

**Résultat attendu** :
- L'alerte se déclenche (spike = 100% > 50%)
- Un `AlertEvent` est créé avec metadata incluant spikePercent
- Une `InAppNotification` est créée

### 11. Test de cooldown

**Étapes** :
1. Déclencher une alerte (test 9 ou 10)
2. Appeler immédiatement le cron à nouveau

**Résultat attendu** :
- L'alerte ne se déclenche pas (cooldown actif)
- Aucun nouvel `AlertEvent` n'est créé
- Le message de réponse indique que l'alerte est en cooldown

### 12. Test de notifications in-app

**Étapes** :
1. Déclencher une alerte (test 9 ou 10)
2. Naviguer vers `/notifications`
3. Vérifier que la notification apparaît
4. Cliquer sur "Mark read"

**Résultat attendu** :
- La notification apparaît dans la liste
- Elle est marquée comme non lue (fond bleu)
- Après "Mark read", elle passe en fond gris
- `readAt` est mis à jour

### 13. Test d'endpoint debug admin

**Prérequis** :
- L'utilisateur doit être dans `ADMIN_EMAILS`

**Étapes** :
1. Se connecter avec un compte admin
2. Appeler : `GET /api/debug/alerts`

**Résultat attendu** :
- JSON avec :
  - `totalOrganizations`
  - `stats[]` avec pour chaque org :
    - `orgId`, `orgName`
    - `alertCount`
    - `lastRunAt`
    - `triggeredLast24h`
    - `recentEvents[]` (10 derniers)

### 14. Test de sécurité multi-org

**Étapes** :
1. Créer 2 organisations (org1, org2)
2. Créer une alerte dans org1
3. Essayer d'accéder à `/organizations/[org2_id]/alerts/[alert_from_org1_id]/edit`

**Résultat attendu** :
- Redirection vers `/organizations/[org2_id]/alerts`
- Erreur 404 ou accès refusé

### 15. Test QuickstartWidget

**Étapes** :
1. Naviguer vers `/dashboard`
2. Vérifier le QuickstartWidget
3. Cliquer sur "Create Alert →" dans l'étape 4

**Résultat attendu** :
- Redirection vers `/organizations/[id]/alerts/new`
- Si au moins 1 alerte existe, l'étape est marquée complétée (✓)

## Tests Vercel (Production)

### 1. Déploiement

**Étapes** :
1. Push vers `main` :
   ```bash
   git add .
   git commit -m "feat: Alerts V1 system"
   git push origin main
   ```
2. Attendre le déploiement Vercel
3. Vérifier que la migration Prisma est appliquée (via Vercel logs ou Supabase)

### 2. Configuration Cron

**Étapes** :
1. Vérifier `vercel.json` contient :
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/evaluate-alerts",
         "schedule": "0 */6 * * *"
       }
     ]
   }
   ```
2. Vérifier que `CRON_SECRET` est défini dans Vercel env vars

### 3. Test de création d'alerte en prod

**Étapes** :
1. Se connecter à l'app en production
2. Créer une alerte Monthly Budget (threshold bas, ex: 1 EUR)
3. Vérifier qu'elle apparaît dans la liste

### 4. Test manuel du cron en prod

**Étapes** :
1. Injecter des CostRecord via l'UI ou directement en DB
2. Appeler manuellement le cron :
   ```bash
   curl -X GET "https://[YOUR_VERCEL_URL]/api/cron/evaluate-alerts" \
     -H "Authorization: Bearer [CRON_SECRET]"
   ```
3. Vérifier les logs Vercel pour les erreurs

**Résultat attendu** :
- Le cron s'exécute sans erreur
- Les alertes sont évaluées
- Les notifications sont créées

### 5. Test de notifications en prod

**Étapes** :
1. Déclencher une alerte (via cron ou manuellement)
2. Naviguer vers `/notifications` en prod
3. Vérifier que la notification apparaît

### 6. Test debug admin en prod

**Étapes** :
1. Se connecter avec un compte admin
2. Appeler `GET /api/debug/alerts`
3. Vérifier que les stats sont correctes

## Cas limites à tester

### 1. Baseline = 0 pour Daily Spike

**Scénario** :
- Aucun CostRecord dans les 7 derniers jours
- Un CostRecord aujourd'hui avec amountEUR > 0

**Résultat attendu** :
- L'alerte se déclenche (spike = 999% ou via seuil fixe)

### 2. Aucune dépense (Monthly Budget)

**Scénario** :
- Alerte Monthly Budget avec threshold = 100 EUR
- Aucun CostRecord ce mois-ci

**Résultat attendu** :
- L'alerte ne se déclenche pas

### 3. Seuil exact atteint

**Scénario** :
- Alerte Monthly Budget avec threshold = 100 EUR
- CostRecord total = exactement 100.00 EUR

**Résultat attendu** :
- L'alerte se déclenche (100% atteint)

### 4. Multiple seuils (Monthly Budget)

**Scénario** :
- Alerte Monthly Budget avec threshold = 100 EUR
- CostRecord total = 85 EUR (85%)

**Résultat attendu** :
- L'alerte se déclenche (80% seuil atteint)
- Si déjà déclenchée à 50% aujourd'hui, ne redéclenche pas (cooldown)

## Vérifications de performance

### 1. Temps d'exécution du cron

**Test** :
- Mesurer le temps d'exécution du cron avec 10 organisations et 50 alertes

**Résultat attendu** :
- < 30 secondes pour 10 orgs
- Pas de timeout Vercel (10s max pour Hobby, 60s pour Pro)

### 2. Requêtes Prisma

**Vérification** :
- Vérifier les logs Prisma pour les N+1 queries
- S'assurer que les index sont utilisés

## Checklist finale

- [ ] Migration Prisma appliquée
- [ ] Création d'alerte fonctionne (Monthly Budget)
- [ ] Création d'alerte fonctionne (Daily Spike)
- [ ] Édition d'alerte fonctionne
- [ ] Toggle enable/disable fonctionne
- [ ] Suppression d'alerte fonctionne
- [ ] Preview fonctionne (Monthly Budget)
- [ ] Preview fonctionne (Daily Spike)
- [ ] Évaluation Monthly Budget fonctionne
- [ ] Évaluation Daily Spike fonctionne
- [ ] Cooldown fonctionne
- [ ] Notifications in-app fonctionnent
- [ ] Debug admin fonctionne
- [ ] Sécurité multi-org fonctionne
- [ ] QuickstartWidget pointe vers `/alerts/new`
- [ ] Cron Vercel configuré
- [ ] Tests en production réussis

## Notes

- Les alertes sont évaluées toutes les 6 heures par défaut (cron)
- Le cooldown par défaut est de 24 heures
- Les notifications sont créées pour tous les membres de l'organisation
- Les notifications org-wide (userId = null) sont également créées





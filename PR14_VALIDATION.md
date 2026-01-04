# PR14 Validation Checklist

## Onboarding Wizard + Seed + E2E validation

### A) Onboarding Wizard

1. ✅ **Step 1: Directory**
   - [ ] Page `/onboarding` accessible
   - [ ] Step 1 affiche formulaire pour créer App, Project, Client (Team optionnel)
   - [ ] Bouton "Continue" désactivé tant que conditions non remplies (min 1 App + 1 Project + 1 Client)
   - [ ] `data-testid="onboarding-step-1"` présent sur le container

2. ✅ **Step 2: Budgets**
   - [ ] Step 2 permet création budget APP (prioritaire) OU ORG
   - [ ] Validation: au moins 1 budget actif requis pour continuer
   - [ ] `data-testid="onboarding-step-2"` présent

3. ✅ **Step 3: Alert Rules**
   - [ ] Step 3 permet création 2 règles par défaut:
     - DAILY_SPIKE (spikePercent=50, lookbackDays=7)
     - CUR_STALE (threshold: 2 days)
   - [ ] Les règles sont créées avec `enabled: true`
   - [ ] Bouton Continue désactivé tant que les 2 règles ne sont pas créées
   - [ ] `data-testid="onboarding-step-3"` présent

4. ✅ **Step 4: Notifications**
   - [ ] Step 4 permet activation In-App + option Email/Telegram
   - [ ] In-App toujours activé (non modifiable)
   - [ ] Email/Telegram optionnels
   - [ ] CTA final: "Run end-to-end test" → redirige vers `/admin/e2e`
   - [ ] `data-testid="onboarding-step-4"` présent

5. ✅ **Progression**
   - [ ] 4 étapes visibles avec indicateur de progression (1-4)
   - [ ] Chaque step marqué comme complété (✓) après validation
   - [ ] Navigation entre steps fonctionnelle

### B) Seed & Test Generator

6. ✅ **Endpoint `/api/admin/seed`**
   - [ ] POST `/api/admin/seed` accessible (admin-only)
   - [ ] Crée 1 Team, 1 Project, 1 App, 1 Client si absent (idempotent)
   - [ ] Retourne JSON avec `results` indiquant ce qui a été créé/existant
   - [ ] Protection RBAC: erreur 403 si non-admin

7. ✅ **Endpoint `/api/admin/test-data`**
   - [ ] POST `/api/admin/test-data` accessible (admin-only)
   - [ ] Body accepte: `{ mode: "AI"|"AWS"|"BOTH", amountEUR?: number }`
   - [ ] Génère 5-10 CostEvent synthétiques sur 2 derniers jours
   - [ ] Si mode inclut AI: crée aussi AiRequestLog correspondant
   - [ ] Utilise dimensions existantes (teamId/projectId/appId/clientId)
   - [ ] Retourne JSON: `{ eventsCreated, dimensionsUsed }`
   - [ ] IMPORTANT: ne touche jamais aux vraies données AWS CUR

### C) E2E Checklist / Admin validation

8. ✅ **Page `/admin/e2e`**
   - [ ] Page accessible (admin-only)
   - [ ] Affiche 8 checks en cards (OK/KO):
     - DB reachable + migrations ok (`data-testid="e2e-db"`)
     - Directory non vide (`data-testid="e2e-directory"`)
     - Au moins 1 budget actif (`data-testid="e2e-budgets"`)
     - Au moins 1 alert rule enabled (`data-testid="e2e-rules"`)
     - Cron run-alerts accessible + dernier CronRun (`data-testid="e2e-cron-alerts"`)
     - Cron apply-retention accessible + dernier CronRun
     - Cron sync-aws-cur accessible + dernier CronRun
     - Notifications preferences existantes
   - [ ] Bouton "Copy JSON" copie l'état de tous les checks
   - [ ] Boutons d'action:
     - "Seed now" (`data-testid="btn-seed"`)
     - "Generate test data" (`data-testid="btn-generate-test"`)
     - "Run cron now" (`data-testid="btn-run-cron"`)
   - [ ] Toasts success/error pour tous les appels

### D) Navigation

9. ✅ **Lien Onboarding**
   - [ ] Lien "Onboarding" visible dans navigation si org incomplète
   - [ ] Lien affiché uniquement si directory/budget/rules manquants
   - [ ] Style distinct (couleur jaune) pour visibilité

10. ✅ **Banners**
    - [ ] Banner "Finish setup" sur `/dashboard` si onboarding incomplet
    - [ ] Banner "Finish setup" sur `/costs` si onboarding incomplet
    - [ ] Banner non intrusif avec lien vers `/onboarding`
    - [ ] Pas de redirection automatique (banner seulement)

### Tests manuels

1. Compléter onboarding wizard de bout en bout
2. Vérifier que seed crée seulement les éléments manquants (idempotent)
3. Générer test data et vérifier CostEvent + AiRequestLog créés
4. Vérifier page E2E affiche tous les checks
5. Vérifier navigation et banners selon état onboarding

### Notes techniques

- Multi-tenant strict: tous les endpoints vérifient `orgId` scoping
- RBAC: admin/finance/manager peuvent configurer, user lecture seule
- Aucune route existante supprimée
- Build TypeScript doit passer sans erreur
- Tous les composants ont `data-testid` appropriés pour tests E2E


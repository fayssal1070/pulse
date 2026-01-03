# PR12 Validation Checklist

## A) Budgets V2: Budgets par App/Project/Client/Team

### 1. UI /budgets avec dropdowns Directory
- [ ] Les champs libres sont remplacés par dropdowns Directory (teamId/projectId/appId/clientId)
- [ ] Quand scope=APP, dropdown App est obligatoire
- [ ] Quand scope=PROJECT, dropdown Project est obligatoire
- [ ] Quand scope=CLIENT, dropdown Client est obligatoire
- [ ] Quand scope=TEAM, dropdown Team est obligatoire
- [ ] data-testid présents: budget-scope, budget-select-app, budget-select-project, budget-select-client, budget-select-team

### 2. API /api/budgets validation
- [ ] Valide que l'ID appartient à l'org active (multi-tenant strict)
- [ ] Empêche doublons: un budget MONTHLY par scope+target (ex: APP + appId)
- [ ] Messages d'erreur clairs (400) si doublon ou ID invalide

## B) Enforcement AI Gateway V2: Blocage par scope le plus spécifique

### 1. Calcul spend MTD selon requête
- [ ] Ordre de priorité vérifié: APP (si appId) -> PROJECT (si projectId) -> CLIENT -> TEAM -> ORG
- [ ] Spend calculé correctement pour chaque scope (MTD pour MONTHLY, today pour DAILY)

### 2. Blocage hardLimit
- [ ] Si budget hardLimit=true et CRITICAL -> bloquer (403) avec reason explicite
- [ ] Reason format: "budget_blocked_app" / "budget_blocked_project" / etc.
- [ ] Log dans AiRequestLog.rawRef le scope qui a bloqué (scopeType, budgetId)

### 3. requireAttribution message
- [ ] Si requireAttribution=true et appId missing: erreur 400
- [ ] Message guide: "Create an App in /directory then pass x-pulse-app header or appId in request body"

## C) Alerts V2: "Budget status by scope" visible

### 1. Dashboard /dashboard
- [ ] Panel alertes affiche le scope (APP/PROJECT/CLIENT/TEAM/ORG) + nom de la cible
- [ ] Format: "{scopeType}: {scopeName}" (ex: "APP: MyApp")

### 2. Page /alerts (optionnel si trop long)
- [ ] Si implémenté: filtre "Scope" + "Target" (dropdowns Directory) pour events/rules
- [ ] Sinon: au minimum les events affichent le targetName

## Tests rapides (5 étapes)

1. **Créer App + budget APP monthly 10€**: Aller sur /budgets, créer budget APP monthly 10€ avec hardLimit=true
2. **Faire requêtes AI avec appId**: Via /api/ai/request avec appId -> bloqué quand dépasse 10€ (403 avec reason "budget_blocked_app")
3. **Même org sans appId**: Si requireAttribution true, 400 avec message clair guidant vers /directory
4. **Dashboard alerte**: Vérifier que alerte budget affiche "APP: <name>" dans le panel
5. **Budgets dropdowns**: Vérifier dropdowns fonctionnels + validation anti-doublon (essayer créer 2 budgets APP monthly pour même appId)

## Notes

- Multi-tenant strict (orgId scoping partout)
- RBAC strict (admin/finance/manager manage; user read-only)
- Build TypeScript doit passer (`npm run build`)

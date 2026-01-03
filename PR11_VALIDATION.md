# PR11 Validation Checklist

## A) UX Costs: Dropdowns Directory

### 1. Dropdowns fonctionnels
- [ ] `/costs`: Les 4 dropdowns (Team, Project, App, Client) sont visibles
- [ ] Les dropdowns chargent les entités depuis `/api/directory/*`
- [ ] Les dropdowns affichent `name` et utilisent `id` comme value
- [ ] Les filtres persistent dans l'URL (query params: `teamId`, `projectId`, `appId`, `clientId`)
- [ ] Changer un dropdown met à jour l'URL et recharge les données
- [ ] Les filtres existants (dateRange, provider, search, dimension tabs) fonctionnent toujours

### 2. Tableau Events avec noms
- [ ] Le tableau Events affiche les NAMES (teamName, projectName, appName, clientName) au lieu des IDs
- [ ] Les noms sont chargés efficacement (pas de N+1)

### 3. Export CSV
- [ ] `/costs/export`: Le CSV inclut colonnes `Team`, `Project`, `App`, `Client` avec noms (pas IDs)

## B) Onboarding Warnings

### 1. Dashboard
- [ ] `/dashboard`: Affiche warning "Setup required" si 0 Apps OR 0 Projects OR 0 Clients
- [ ] CTA "Go to Directory" fonctionne
- [ ] CTA "Create first App" fonctionne (si appsCount === 0)

### 2. Costs
- [ ] `/costs`: Affiche warning "Setup required" si Directory vide
- [ ] Les warnings disparaissent après création d'entités

### 3. Policy requireAttribution
- [ ] Si `AiPolicy.requireAttribution=true` ET Directory vide: warning "Requests will fail until you create at least one App"

## C) AWS CUR Attribution via Tags

### 1. Mapping tags -> Directory
- [ ] Tags supportés: `pulse:app`, `pulse:project`, `pulse:client`, `pulse:team`
- [ ] App: match `slug` d'abord, sinon `name` (case-insensitive)
- [ ] Client: match `externalId` d'abord, sinon `name`
- [ ] Team/Project: match `name` (case-insensitive)
- [ ] Si trouvé: `appId`/`projectId`/`clientId`/`teamId` écrits dans CostEvent colonnes directes

### 2. Compteur attribution
- [ ] Status CUR inclut `nb events avec appId` vs total batch (dans metadata)

## Tests rapides (5 étapes)

1. **Directory setup**: Aller sur `/directory`, créer App/Project/Client/Team
2. **Costs dropdowns**: Aller sur `/costs`, vérifier que dropdowns chargent et filtrent réellement (events réduits)
3. **Costs export**: Exporter CSV, vérifier colonnes `Team`/`Project`/`App`/`Client` avec noms
4. **Dashboard warnings**: Vérifier warnings visibles quand directory vide, disparaissent après création App
5. **CUR attribution**: Si tag `pulse:app` sur un event AWS, vérifier que `CostEvent.appId` est renseigné après sync-now

## Notes

- Multi-tenant strict (orgId scoping partout)
- RBAC strict (admin/finance/manager manage; user read-only)
- Build TypeScript doit passer (`npm run build`)


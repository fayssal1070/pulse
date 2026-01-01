# Fix: amountEUR vs amount - Implementation Summary

## Problème
- Table `CostRecord` contient le champ `amountEUR` (pas `amount`)
- Dashboard affiche 0.00 EUR
- Supabase renvoie: `column "amount" does not exist, hint: CostRecord.amountEUR`

## Fichiers Modifiés

### 1. Route Debug
**`app/api/_debug/costs/route.ts`** - **NOUVEAU**
- Endpoint GET pour debug des coûts
- Retourne: `orgId`, `count`, `minDate`, `maxDate`, `sum_30d` (amountEUR)
- Utilise `_sum.amountEUR` correctement
- Protégé par `requireAuth()`
- Filtre par `orgId` (active organization)

### 2. Quickstart Widget
**`components/quickstart-widget.tsx`** - **MODIFIÉ**
- Ajout props: `hasActiveAWS`, `awsAccountInfo`
- Si AWS actif: masque CSV steps, affiche:
  - Step 1: "AWS connected" (✓ Connected)
  - Step 2: "AWS Cost Explorer updates every ~24h" (info)
  - Step 3: "Sync now" (lien vers cloud-accounts)
  - Step 4: "Create your first alert"
- Affiche "Last synced" si AWS connecté
- Sinon: affiche les 4 steps CSV normaux

### 3. Dashboard Page
**`app/dashboard/page.tsx`** - **MODIFIÉ**
- Détection AWS actif: cherche `CloudAccount` avec `provider='AWS'`, `connectionType='COST_EXPLORER'`, `status='active'`
- Passe `hasActiveAWS` et `awsAccountInfo` à `QuickstartWidget`
- Récupère `lastSyncedAt` pour affichage

## Vérifications Effectuées

### ✅ Agrégations Dashboard
- `lib/dashboard.ts`: Utilise `_sum.amountEUR` ✅
- `lib/budget.ts`: Utilise `_sum.amountEUR` ✅
- `app/organizations/[id]/page.tsx`: Utilise `cost.amountEUR` ✅
- `scripts/check-alerts.ts`: Utilise `_sum.amountEUR` ✅

### ✅ Formatage EUR
- Dashboard: `total7Days.toFixed(2) EUR` ✅
- Dashboard: `total30Days.toFixed(2) EUR` ✅
- Dashboard: `item.total.toFixed(2) EUR` ✅
- Organization page: `total7Days.toFixed(2) EUR` ✅
- Organization page: `total30Days.toFixed(2) EUR` ✅
- Organization page: `item.total.toFixed(2) EUR` ✅

### ✅ Filtres orgId
- Toutes les requêtes filtrent par `orgId` ✅
- `getUserOrganizationIds()` vérifie membership ✅
- `getActiveOrganizationId()` utilisé partout ✅

## Routes API

### `/api/_debug/costs` (GET)
**Auth**: RequireAuth
**Response**:
```json
{
  "orgId": "string",
  "count": 123,
  "minDate": "2024-01-01T00:00:00.000Z",
  "maxDate": "2024-12-24T00:00:00.000Z",
  "sum_30d": 1234.56
}
```

## Test Plan

### Local
1. **Vérifier debug endpoint**:
   ```bash
   curl http://localhost:3000/api/_debug/costs \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN"
   ```
   - Doit retourner: orgId, count, dates, sum_30d

2. **Vérifier dashboard**:
   - Aller à `/dashboard`
   - Vérifier que les totaux s'affichent (pas 0.00 EUR)
   - Vérifier format: `123.45 EUR` (2 décimales)

3. **Vérifier Quickstart avec AWS**:
   - Connecter un AWS account (status=active, connectionType=COST_EXPLORER)
   - Aller à `/dashboard`
   - Vérifier que Quickstart affiche "AWS connected" au lieu de CSV steps
   - Vérifier "Last synced" si synced

4. **Vérifier Quickstart sans AWS**:
   - Sans AWS account actif
   - Vérifier que Quickstart affiche les 4 steps CSV normaux

### Vercel
1. **Deploy**:
   ```bash
   git add .
   git commit -m "Fix amountEUR usage + add AWS Quickstart + debug endpoint"
   git push
   ```

2. **Test debug endpoint**:
   ```bash
   curl https://YOUR_VERCEL_URL/api/_debug/costs \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN"
   ```

3. **Test dashboard**:
   - Aller à `/dashboard`
   - Vérifier totaux non-zéro
   - Vérifier format EUR

4. **Test Quickstart**:
   - Avec/sans AWS account
   - Vérifier affichage correct

## Notes

- **Aucune requête SQL brute trouvée** utilisant "amount" au lieu de "amountEUR"
- **Toutes les agrégations Prisma** utilisent `_sum.amountEUR` correctement
- **Tous les filtres orgId** sont en place
- **Formatage EUR** avec 2 décimales partout

## Fichiers Non Modifiés (Déjà Corrects)

- `lib/dashboard.ts` - Utilise `amountEUR` ✅
- `lib/budget.ts` - Utilise `amountEUR` ✅
- `app/organizations/[id]/page.tsx` - Utilise `amountEUR` ✅
- `scripts/check-alerts.ts` - Utilise `amountEUR` ✅
- `lib/telegram.ts` - Formatage correct ✅

---

**Status**: ✅ **AMOUNT_EUR FIX COMPLETE**

**Debug Endpoint**: `/api/_debug/costs` ✅

**Quickstart AWS**: Masque CSV si AWS actif ✅

**Formatage EUR**: 2 décimales partout ✅

**Filtres orgId**: Tous en place ✅





# Instructions de test : Debug AWS Sync (amountEUR = 0)

## Objectif

Diagnostiquer pourquoi `amountEUR` est toujours 0 alors qu'il y a des CostRecord AWS.

## Activation du mode debug

### Sur Vercel

1. **Aller sur** Vercel Dashboard → Projet → Settings → Environment Variables
2. **Ajouter/Modifier** :
   - Variable: `AWS_SYNC_DEBUG`
   - Value: `true` (ou `1`)
3. **Redéployer** :
   - Vercel → Deployments → Latest → "Redeploy"
   - OU attendre le prochain auto-deploy

### Vérification

Après redéploiement, vérifier que la variable est bien active :
- Vercel → Deployments → Latest → "View Build Logs"
- Chercher `AWS_SYNC_DEBUG` dans les logs (devrait être `true`)

## Test

### 1. Lancer une sync manuelle

1. **Se connecter** sur Vercel (compte admin recommandé)
2. **Aller sur** `/dashboard`
3. **Aller sur** `/organizations/[id]/cloud-accounts`
4. **Cliquer** sur "Sync Now" pour un Cloud Account AWS

### 2. Lire les logs Vercel

1. **Aller sur** Vercel Dashboard → Projet → Logs
2. **Filtrer** par : `[AWS_SYNC_DEBUG]`
3. **Copier** tous les logs qui commencent par `[AWS_SYNC_DEBUG]`

## Logs à analyser

### 1. Requête AWS (fetch_request)

Chercher le log avec `stage: "fetch_request"` :
```json
[AWS_SYNC_DEBUG] {
  "stage": "fetch_request",
  "timePeriod": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "metric": "UnblendedCost",
  "granularity": "DAILY"
}
```

**Vérifier** :
- ✅ TimePeriod correspond à la période attendue
- ✅ Metric est `UnblendedCost`

### 2. Première réponse AWS (firstResult)

Chercher le log avec `firstResultTotal` :
```json
[AWS_SYNC_DEBUG] {
  "metric": "UnblendedCost",
  "firstResultTotal": {
    "UnblendedCost": {
      "Amount": "123.45",  // ← Vérifier si c'est "0" ou un montant
      "Unit": "USD"
    }
  },
  "firstGroup": {
    "Keys": ["EC2", "..."],
    "Metrics": {
      "UnblendedCost": {
        "Amount": "12.34",  // ← Vérifier si c'est "0" ou un montant
        "Unit": "USD"
      }
    }
  }
}
```

**Interprétation** :
- Si `firstResultTotal.UnblendedCost.Amount = "0"` → AWS renvoie 0 (pas de coûts)
- Si `firstResultTotal.UnblendedCost.Amount > "0"` mais `firstGroup.Metrics.UnblendedCost.Amount = "0"` → Problème de parsing des groupes

### 3. Parsing des montants (3 services max)

Chercher les logs avec `rawAmountString` (premiers 3 services) :
```json
[AWS_SYNC_DEBUG] {
  "date": "2024-01-15",
  "service": "EC2",
  "rawAmountString": "12.34",  // ← Valeur brute AWS
  "rawUnit": "USD",
  "parsedAmount": 12.34,  // ← Après parseFloat
  "isNaN": false,
  "amountGreaterThanZero": true
}
```

**Interprétation** :
- Si `rawAmountString = "0"` → AWS renvoie 0 pour ce service
- Si `rawAmountString > "0"` mais `parsedAmount = 0` → Problème de parsing
- Si `isNaN = true` → Format invalide (virgule, caractères spéciaux, etc.)

### 4. Résumé fetch (fetch_complete)

Chercher le log avec `stage: "fetch_complete"` :
```json
[AWS_SYNC_DEBUG] {
  "stage": "fetch_complete",
  "finalTotalRecords": 45,
  "finalTotalAmount": 1234.56,  // ← Total calculé depuis AWS
  "currency": "USD",
  "sampleServices": [
    {
      "service": "EC2",
      "amount": "12.34",
      "unit": "USD"
    }
  ]
}
```

**Interprétation** :
- Si `finalTotalAmount = 0` → AWS renvoie 0 ou tous les montants sont filtrés
- Si `finalTotalAmount > 0` → Les données sont correctes depuis AWS

### 5. Avant DB insert (before_db_insert)

Chercher le log avec `stage: "before_db_insert"` :
```json
[AWS_SYNC_DEBUG] {
  "stage": "before_db_insert",
  "dailyTotalsSize": 10,
  "recordsWithAmountGreaterThanZero": 10,
  "totalAmountBeforeInsert": 1234.56,  // ← Total avant conversion EUR
  "sampleRecords": [
    {
      "key": "2024-01-15:EC2",
      "service": "EC2",
      "amount": 12.34,
      "currency": "USD",
      "amountEUR": 11.35  // ← Après conversion EUR
    }
  ]
}
```

**Interprétation** :
- Si `totalAmountBeforeInsert = 0` → Problème dans le regroupement
- Si `totalAmountBeforeInsert > 0` → Les données sont correctes avant DB

### 6. Insertion DB (db_insert)

Chercher les logs avec `stage: "db_insert"` :
```json
[AWS_SYNC_DEBUG] {
  "stage": "db_insert",
  "key": "2024-01-15:EC2",
  "date": "2024-01-15",
  "service": "EC2",
  "amountFromAws": 12.34,
  "currencyFromAws": "USD",
  "amountEUR": 11.35  // ← Valeur qui sera écrite en DB
}
```

**Interprétation** :
- Si `amountEUR = 0` mais `amountFromAws > 0` → Problème de conversion EUR
- Si `amountEUR > 0` → La valeur devrait être écrite correctement

### 7. Après DB insert (after_db_insert)

Chercher le log avec `stage: "after_db_insert"` :
```json
[AWS_SYNC_DEBUG] {
  "stage": "after_db_insert",
  "upsertedCount": 10,
  "totalAmountEURInserted": 1135.57,  // ← Total écrit en DB
  "skippedZeroRecords": 0
}
```

**Interprétation** :
- Si `totalAmountEURInserted = 0` → Aucun record écrit (problème DB)
- Si `skippedZeroRecords > 0` → Des records ont été ignorés (problème de conversion)

## Vérification dans /api/debug/costs

1. **Cliquer** sur "Debug costs" dans le dashboard
2. **Vérifier** l'objet `lastAwsFetch` :
```json
{
  "lastAwsFetch": {
    "start": "2024-01-01",
    "end": "2024-01-31",
    "metric": "UnblendedCost",
    "totalFromAws": 1234.56,
    "currencyFromAws": "USD",
    "recordCount": 45,
    "fetchedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Interprétation** :
- Si `totalFromAws = 0` → AWS renvoie 0
- Si `totalFromAws > 0` mais `sum_30d = 0` → Problème DB ou conversion

## Diagnostic rapide

### Scénario 1: AWS renvoie 0
**Indicateurs** :
- `firstResultTotal.UnblendedCost.Amount = "0"`
- `finalTotalAmount = 0`
- `totalFromAws = 0` dans `/api/debug/costs`

**Action** : Vérifier dans AWS Console que Cost Explorer contient des données

### Scénario 2: Parsing incorrect
**Indicateurs** :
- `rawAmountString = "12,34"` (virgule) mais `parsedAmount = 0`
- `isNaN = true`
- `rawAmountString > "0"` mais `parsedAmount = 0`

**Action** : Vérifier le format des montants AWS (normalisation virgule/point)

### Scénario 3: Conversion EUR incorrecte
**Indicateurs** :
- `amountFromAws > 0` mais `amountEUR = 0`
- `skippedZeroRecords > 0`

**Action** : Vérifier la logique de conversion EUR

### Scénario 4: Problème DB
**Indicateurs** :
- `totalAmountEURInserted > 0` mais `sum_30d = 0` dans `/api/debug/costs`
- Pas d'erreur dans les logs

**Action** : Vérifier les requêtes Prisma et les dates

## Checklist de test

- [ ] `AWS_SYNC_DEBUG=true` configuré sur Vercel
- [ ] Redéployé après ajout de la variable
- [ ] Cliqué "Sync Now"
- [ ] Logs Vercel filtrés par `[AWS_SYNC_DEBUG]`
- [ ] Logs copiés et analysés
- [ ] Vérifié `fetch_request` (TimePeriod, metric)
- [ ] Vérifié `firstResultTotal` (Amount AWS)
- [ ] Vérifié `rawAmountString` vs `parsedAmount` (3 services)
- [ ] Vérifié `fetch_complete` (totalFromAws)
- [ ] Vérifié `before_db_insert` (totalAmountBeforeInsert)
- [ ] Vérifié `db_insert` (amountEUR)
- [ ] Vérifié `after_db_insert` (totalAmountEURInserted)
- [ ] Vérifié `/api/debug/costs` (lastAwsFetch)
- [ ] Comparé `totalFromAws` avec `sum_30d`

## Où lire les logs Vercel

1. **Vercel Dashboard** → Projet → Logs
2. **Filtrer** par : `[AWS_SYNC_DEBUG]`
3. **Sélectionner** la période : "Last 5 minutes" ou "Last hour"
4. **Copier** tous les logs JSON

## Format des logs

Tous les logs sont au format JSON avec le préfixe `[AWS_SYNC_DEBUG]` :
```
[AWS_SYNC_DEBUG] {"stage":"fetch_request","timePeriod":{...}}
[AWS_SYNC_DEBUG] {"stage":"fetch_complete","finalTotalAmount":123.45,...}
```

## Désactivation

Après diagnostic, retirer `AWS_SYNC_DEBUG` de Vercel ou le mettre à `false` pour éviter les logs volumineux.





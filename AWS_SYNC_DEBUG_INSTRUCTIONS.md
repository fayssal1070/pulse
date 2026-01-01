# Instructions: Debug AWS Sync Zero Amounts

## Objectif

Diagnostiquer pourquoi `sum(amountEUR_30d)=0` dans le bandeau "Data Pending":
- **Hypothèse 1**: AWS Cost Explorer API renvoie réellement 0
- **Hypothèse 2**: Notre code parse/mape mal les montants et écrit 0 en DB

## Activation du mode debug

1. **Sur Vercel**:
   - Aller dans Settings → Environment Variables
   - Ajouter: `AWS_SYNC_DEBUG` = `1`
   - **Important**: Redéployer après avoir ajouté la variable

## Test

1. Cliquer "Sync Now" sur un Cloud Account AWS
2. Aller dans Vercel → Projet → Logs
3. Filtrer par: `[AWS_SYNC_DEBUG]`

## Logs à analyser

### 1. Structure de la réponse AWS (première page)

Chercher le log avec `firstResult`:
```json
[AWS_SYNC_DEBUG] {
  "metric": "UnblendedCost",
  "firstResultTimePeriod": {...},
  "firstResultTotal": {
    "UnblendedCost": {
      "Amount": "123.45",  // ← Vérifier si c'est "0" ou un montant réel
      "Unit": "USD"
    }
  },
  "firstGroup": {
    "Keys": ["EC2", "..."],
    "Metrics": {
      "UnblendedCost": {
        "Amount": "12.34",  // ← Vérifier si c'est "0" ou un montant réel
        "Unit": "USD"
      }
    }
  }
}
```

**Interprétation**:
- Si `firstResultTotal.UnblendedCost.Amount = "0"` → **AWS renvoie 0** (pas de coûts)
- Si `firstResultTotal.UnblendedCost.Amount > "0"` mais `firstGroup.Metrics.UnblendedCost.Amount = "0"` → Problème de parsing des groupes

### 2. Parsing des montants (par record)

Chercher les logs avec `rawAmountString`:
```json
[AWS_SYNC_DEBUG] {
  "date": "2024-01-15",
  "service": "EC2",
  "rawAmountString": "12.34",  // ← Valeur brute depuis AWS
  "rawUnit": "USD",
  "parsedAmount": 12.34,  // ← Valeur après parseFloat
  "amountGreaterThanZero": true
}
```

**Interprétation**:
- Si `rawAmountString = "0"` → AWS renvoie 0 pour ce service/date
- Si `rawAmountString > "0"` mais `parsedAmount = 0` → Problème de parsing (format invalide)
- Si `amountGreaterThanZero = false` → Le record est ignoré (filtre `if (amount > 0)`)

### 3. Résumé par page

Chercher les logs avec `page`:
```json
[AWS_SYNC_DEBUG] {
  "page": "first",
  "recordsWithAmountGreaterThanZero": 5,  // ← Nombre de records > 0
  "totalRawAmount": 123.45,  // ← Somme brute avant conversion EUR
  "totalCostDataSoFar": 5
}
```

**Interprétation**:
- Si `recordsWithAmountGreaterThanZero = 0` → Aucun montant > 0 trouvé (AWS renvoie 0 ou tous les montants sont filtrés)
- Si `recordsWithAmountGreaterThanZero > 0` mais `totalCostDataSoFar = 0` → Problème dans la logique de regroupement

### 4. Résumé final (avant DB insert)

Chercher le log avec `stage: "before_db_insert"`:
```json
[AWS_SYNC_DEBUG] {
  "stage": "before_db_insert",
  "dailyTotalsSize": 10,  // ← Nombre de clés uniques (date:service)
  "recordsWithAmountGreaterThanZero": 10,
  "totalAmountBeforeInsert": 123.45,
  "sampleRecords": [...]
}
```

**Interprétation**:
- Si `totalAmountBeforeInsert = 0` → Problème dans le regroupement ou AWS renvoie 0
- Si `totalAmountBeforeInsert > 0` → Les données sont correctes avant DB

### 5. Après DB insert

Chercher le log avec `stage: "after_db_insert"`:
```json
[AWS_SYNC_DEBUG] {
  "stage": "after_db_insert",
  "upsertedCount": 10,
  "totalAmountEURInserted": 113.57  // ← Après conversion EUR (×0.92)
}
```

**Interprétation**:
- Si `totalAmountEURInserted = 0` → Problème dans l'insertion DB
- Si `totalAmountEURInserted > 0` mais `sum_30d = 0` dans `/api/_debug/costs` → Problème de requête DB ou de dates

## Conclusion

### Scénario 1: AWS renvoie 0
**Indicateurs**:
- `firstResultTotal.UnblendedCost.Amount = "0"`
- `recordsWithAmountGreaterThanZero = 0`
- `totalAmountBeforeInsert = 0`

**Action**: Vérifier dans AWS Console que Cost Explorer est activé et contient des données pour la période.

### Scénario 2: Parsing incorrect
**Indicateurs**:
- `firstResultTotal.UnblendedCost.Amount > "0"` mais `parsedAmount = 0`
- `rawAmountString` a un format invalide (ex: "N/A", "null", etc.)

**Action**: Vérifier le format des montants AWS et ajuster le parsing.

### Scénario 3: Filtrage trop agressif
**Indicateurs**:
- `rawAmountString > "0"` mais `amountGreaterThanZero = false`
- `recordsWithAmountGreaterThanZero = 0` alors que AWS renvoie des montants

**Action**: Vérifier la logique de filtrage `if (amount > 0)`.

### Scénario 4: Problème DB
**Indicateurs**:
- `totalAmountEURInserted > 0` mais `sum_30d = 0` dans `/api/_debug/costs`
- Vérifier les dates dans la requête DB

**Action**: Vérifier les requêtes Prisma et les dates utilisées.

## Désactivation

Après diagnostic, retirer `AWS_SYNC_DEBUG` de Vercel ou le mettre à `0` pour éviter les logs volumineux.





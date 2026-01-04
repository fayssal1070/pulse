# Demo Dataset Documentation

## 📍 Où est stocké le dataset

Le dataset de démo est stocké dans **`lib/demo-dataset.ts`**.

Ce fichier contient toutes les données statiques utilisées par la page `/demo` :
- 3 cloud accounts (AWS, GCP, Azure)
- 12 mois de dépenses avec tendance
- Top services (EC2, RDS, S3, Lambda, etc.)
- 3 budgets mensuels (Production, Development, Staging)
- 5 alertes (seuil dépassé, anomalie, spike, burn rate)

## 🔧 Comment modifier les chiffres facilement

### 1. Modifier les Cloud Accounts

Dans `lib/demo-dataset.ts`, section `DEMO_CLOUD_ACCOUNTS` :

```typescript
export const DEMO_CLOUD_ACCOUNTS: DemoCloudAccount[] = [
  {
    id: 'demo-aws-1',
    provider: 'AWS',
    accountName: 'Production AWS',        // ← Modifier ici
    accountIdentifier: '123456789012',    // ← Modifier ici
    status: 'active',
  },
  // Ajouter/modifier d'autres comptes...
]
```

### 2. Modifier les coûts mensuels (12 mois)

Dans `lib/demo-dataset.ts`, fonction `getDemoCostRecords()` :

**Services AWS** (lignes ~40-50) :
```typescript
const awsServices = [
  { name: 'EC2', baseCost: 1200, variance: 0.2 },    // ← Modifier baseCost
  { name: 'RDS', baseCost: 450, variance: 0.15 },
  // ...
]
```

**Taux de croissance** (ligne ~70) :
```typescript
const growthFactor = 1 + (month * 0.06) // ← Modifier 0.06 (6% mensuel)
```

**Pour modifier les services GCP/Azure** : même principe, sections `gcpServices` et `azureServices`.

### 3. Modifier les budgets mensuels

Dans `lib/demo-dataset.ts`, section `DEMO_BUDGETS` :

```typescript
export const DEMO_BUDGETS: DemoBudget[] = [
  {
    id: 'demo-budget-prod',
    name: 'Production Environment',
    monthlyLimitEUR: 15000,        // ← Modifier limite
    currentSpendEUR: 14250,        // ← Modifier dépense actuelle
    percentage: 95,                // ← Calculé automatiquement si cohérent
    status: 'WARNING',             // ← 'OK' | 'WARNING' | 'EXCEEDED'
  },
  // ...
]
```

**Note** : Le `percentage` est calculé automatiquement, mais vous pouvez le forcer. Le `status` doit correspondre au percentage.

### 4. Modifier les alertes

Dans `lib/demo-dataset.ts`, section `DEMO_ALERTS` :

```typescript
export const DEMO_ALERTS: DemoAlert[] = [
  {
    id: 'demo-alert-1',
    type: 'threshold',             // ← 'threshold' | 'anomaly' | 'spike' | 'burn_rate'
    title: 'Production budget threshold exceeded',  // ← Modifier titre
    message: 'Production environment spending...',  // ← Modifier message
    severity: 'high',              // ← 'high' | 'medium' | 'low'
    triggeredAt: new Date(2024, 11, 15, 14, 30),  // ← Modifier date
    resolved: false,               // ← true/false
  },
  // ...
]
```

### 5. Modifier le nombre de mois affichés

Par défaut, 12 mois sont générés. Pour changer :

Dans `getDemoCostRecords()`, ligne ~30 :
```typescript
for (let month = 0; month < 12; month++) {  // ← Modifier 12
```

### 6. Modifier le Top 5 Cost Drivers

Le top 5 est calculé automatiquement à partir des coûts. Pour changer le nombre affiché :

Dans `app/demo/page.tsx`, ligne ~10 :
```typescript
const topCostDrivers = getTopCostDrivers(5)  // ← Modifier 5
```

## 📊 Structure des données

### Cloud Accounts
- `id` : Identifiant unique
- `provider` : 'AWS' | 'GCP' | 'Azure'
- `accountName` : Nom affiché
- `accountIdentifier` : ID du compte cloud
- `status` : 'active' | 'pending' | 'disabled'

### Cost Records
- `date` : Date du coût
- `provider` : Provider cloud
- `service` : Nom du service
- `amountEUR` : Montant en EUR
- `currency` : Devise (généralement 'EUR')

### Budgets
- `id` : Identifiant unique
- `name` : Nom du budget
- `monthlyLimitEUR` : Limite mensuelle
- `currentSpendEUR` : Dépense actuelle
- `percentage` : Pourcentage consommé
- `status` : 'OK' | 'WARNING' | 'EXCEEDED'

### Alerts
- `id` : Identifiant unique
- `type` : Type d'alerte
- `title` : Titre de l'alerte
- `message` : Message détaillé
- `severity` : 'high' | 'medium' | 'low'
- `triggeredAt` : Date de déclenchement
- `resolved` : Résolu ou non

## 🎨 Affichage dans /demo

La page `/demo` (`app/demo/page.tsx`) affiche :

1. **Total monthly spend** : Dernier mois du trend
2. **12-Month Trend** : Graphique en barres simple (CSS pur, pas de lib externe)
3. **Top 5 Cost Drivers** : Liste des 5 services les plus coûteux
4. **Recent Alerts** : Liste des alertes non résolues
5. **Monthly Budgets** : 3 budgets avec barres de progression
6. **Cloud Accounts** : Liste des 3 comptes cloud

## ⚠️ Notes importantes

- **Toutes les données sont statiques** : Aucune connexion à la base de données
- **Les calculs sont faits à chaque chargement** : Les totaux sont recalculés depuis les records
- **Pas de librairie externe** : Le graphique 12 mois utilise uniquement CSS (barres)
- **Dates** : Les dates sont générées dynamiquement mais basées sur Jan 2024 - Dec 2024

## 🔄 Après modification

Après avoir modifié `lib/demo-dataset.ts` :

1. Le build se fera automatiquement (Next.js détecte les changements)
2. Rafraîchir la page `/demo` pour voir les changements
3. Si besoin, redémarrer le serveur : `npm run dev`

## 📝 Exemple de modification rapide

Pour augmenter les coûts AWS EC2 de 1200€ à 2000€ :

1. Ouvrir `lib/demo-dataset.ts`
2. Trouver `awsServices` (ligne ~40)
3. Modifier : `{ name: 'EC2', baseCost: 2000, variance: 0.2 }`
4. Sauvegarder
5. Rafraîchir `/demo`

Les totaux et le trend seront automatiquement recalculés !






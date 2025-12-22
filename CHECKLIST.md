# PULSE MVP - Checklist de démarrage et tests

## Prérequis

- Node.js 20+ installé
- Docker Desktop installé et démarré
- Port 3000 libre (ou modifier le port dans `package.json`)

## Démarrage local

### 1. Installation des dépendances

```bash
npm install
```

### 2. Configuration de l'environnement

Le fichier `.env` doit contenir :

```
DATABASE_URL="postgresql://pulse:pulse@localhost:5432/pulse"
AUTH_SECRET="n9lQuFdgIuJMyjNHryF/zye9XDle580IRF4+M/YHshE="
```

### 3. Démarrage de PostgreSQL (Docker)

```bash
docker compose up -d
```

Vérifier que le conteneur est démarré :

```bash
docker compose ps
```

### 4. Configuration de la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# Seed la base de données (reset complet si nécessaire)
# Si les données existent déjà, utiliser reset-and-seed.sql pour tout réinitialiser
Get-Content prisma/reset-and-seed.sql | docker compose exec -T postgres psql -U pulse -d pulse
```

### 5. Démarrage du serveur Next.js

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## Identifiants de test

- **Email** : `owner@example.com`
- **Mot de passe** : `password123`

## Tests des fonctionnalités

### 1. Test de l'authentification

1. Aller sur `http://localhost:3000/login`
2. Saisir les identifiants :
   - Email : `owner@example.com`
   - Mot de passe : `password123`
3. Cliquer sur "Sign In"
4. **Résultat attendu** : Redirection vers `/dashboard`

**Test d'accès non autorisé** :
1. Se déconnecter (bouton "Logout")
2. Essayer d'accéder directement à `http://localhost:3000/dashboard`
3. **Résultat attendu** : Redirection vers `/login`

### 2. Test du Dashboard

1. Se connecter avec les identifiants de test
2. Aller sur `http://localhost:3000/dashboard`
3. **Vérifications** :
   - Affiche "Last 7 days" avec un montant
   - Affiche "Last 30 days" avec un montant
   - Affiche "Top 10 Services (30 days)" avec une liste
   - Affiche "Daily Costs (30 days)" avec un tableau date + total
   - Affiche la liste des organisations

### 3. Test de l'import CSV

#### Créer un fichier CSV de test

Créer un fichier `test-import.csv` avec le contenu suivant :

```csv
date,provider,service,amountEUR,currency
2024-12-20,AWS,EC2,250.75,EUR
2024-12-19,Azure,Storage,180.50,EUR
2024-12-18,GCP,Compute,320.00,EUR
2024-12-17,AWS,S3,95.25,EUR
2024-12-16,DigitalOcean,Droplets,150.00,EUR
```

#### Importer le CSV

1. Se connecter
2. Aller sur `http://localhost:3000/import`
3. Sélectionner le fichier `test-import.csv`
4. Cliquer sur "Import CSV"
5. **Résultat attendu** : Message de succès avec le nombre d'enregistrements importés

#### Vérifier la mise à jour du Dashboard

1. Aller sur `http://localhost:3000/dashboard`
2. **Vérifications** :
   - Les totaux "Last 7 days" et "Last 30 days" ont été mis à jour
   - Les nouveaux services apparaissent dans "Top 10 Services"
   - Les nouvelles dates apparaissent dans "Daily Costs"

### 4. Test des Alertes

#### Créer une règle d'alerte

1. Se connecter
2. Aller sur `http://localhost:3000/alerts`
3. Remplir le formulaire :
   - Organization : Sélectionner "Acme Corp"
   - Threshold (EUR) : `50.00`
   - Window (days) : `7` (par défaut)
4. Cliquer sur "Create Alert Rule"
5. **Résultat attendu** : La règle apparaît dans le tableau avec status "Active"

#### Vérifier la liste des règles

1. Sur la page `/alerts`, vérifier le tableau :
   - Colonne "Organization" : Nom de l'organisation
   - Colonne "Threshold (EUR)" : Seuil en EUR
   - Colonne "Window (days)" : Nombre de jours
   - Colonne "Status" : "Active" ou "Triggered"
   - Colonne "Triggered At" : Date/heure si déclenchée

### 5. Test du script check-alerts

#### Exécuter le script

```bash
npm run check-alerts
```

#### Vérifier les résultats

1. Le script affiche dans la console :
   - Pour chaque règle : le statut (OK, triggered, already triggered)
   - Les montants calculés

2. Vérifier dans la base de données :

```bash
Get-Content prisma/verify-alert-triggered.sql | docker compose exec -T postgres psql -U pulse -d pulse
```

3. **Résultat attendu** :
   - Si le total des 7 derniers jours > threshold : `triggered = true` et `triggeredAt` rempli
   - Si le total <= threshold : `triggered = false`

4. Vérifier sur la page `/alerts` :
   - Les règles déclenchées affichent "Triggered" en rouge
   - La colonne "Triggered At" affiche la date/heure

## Flow complet de test

### Scénario end-to-end

1. **Login** → `http://localhost:3000/login`
   - Email : `owner@example.com`
   - Password : `password123`
   - ✅ Redirection vers `/dashboard`

2. **Dashboard** → `http://localhost:3000/dashboard`
   - ✅ Affiche les totaux 7 jours et 30 jours
   - ✅ Affiche le top 10 services
   - ✅ Affiche la série quotidienne

3. **Import CSV** → `http://localhost:3000/import`
   - ✅ Upload du fichier CSV
   - ✅ Message de succès

4. **Dashboard mis à jour** → `http://localhost:3000/dashboard`
   - ✅ Les totaux ont changé
   - ✅ Les nouveaux services apparaissent

5. **Alertes** → `http://localhost:3000/alerts`
   - ✅ Créer une nouvelle règle
   - ✅ Voir la liste des règles

6. **Check alerts** → Terminal
   ```bash
   npm run check-alerts
   ```
   - ✅ Le script s'exécute sans erreur
   - ✅ Les règles sont évaluées
   - ✅ Les règles déclenchées sont mises à jour

7. **Vérification finale** → `http://localhost:3000/alerts`
   - ✅ Les règles déclenchées affichent "Triggered"
   - ✅ La date de déclenchement est affichée

## Exemples de fichiers CSV

### Exemple 1 : Import simple

```csv
date,provider,service,amountEUR,currency
2024-12-20,AWS,EC2,250.75,EUR
2024-12-19,Azure,Storage,180.50,EUR
2024-12-18,GCP,Compute,320.00,EUR
```

### Exemple 2 : Import avec plusieurs providers

```csv
date,provider,service,amountEUR,currency
2024-12-21,AWS,Lambda,150.00,EUR
2024-12-21,Azure,Database,200.00,EUR
2024-12-21,GCP,Cloud Run,175.50,EUR
2024-12-20,DigitalOcean,Droplets,120.00,EUR
2024-20-20,Vercel,Functions,80.25,EUR
```

### Format CSV requis

- **Colonnes obligatoires** (dans l'ordre) :
  1. `date` : Format YYYY-MM-DD
  2. `provider` : Nom du provider (ex: AWS, Azure, GCP)
  3. `service` : Nom du service (ex: EC2, Storage, Compute)
  4. `amountEUR` : Montant en EUR (nombre décimal)
  5. `currency` : Code devise (ex: EUR, USD)

- **Première ligne** : En-têtes (header)
- **Lignes suivantes** : Données

## Commandes utiles

### Réinitialiser la base de données

```bash
# Supprimer toutes les données
docker compose exec -T postgres psql -U pulse -d pulse -c "TRUNCATE TABLE \"User\", \"Organization\", \"Membership\", \"CostRecord\", \"AlertRule\" CASCADE;"

# Re-seed
Get-Content prisma/seed.sql | docker compose exec -T postgres psql -U pulse -d pulse
```

### Vérifier les données

```bash
# Compter les enregistrements
docker compose exec -T postgres psql -U pulse -d pulse -c "SELECT 'User' as table_name, COUNT(*) as count FROM \"User\" UNION ALL SELECT 'Organization', COUNT(*) FROM \"Organization\" UNION ALL SELECT 'CostRecord', COUNT(*) FROM \"CostRecord\" UNION ALL SELECT 'AlertRule', COUNT(*) FROM \"AlertRule\";"
```

### Arrêter les services

```bash
# Arrêter Next.js : Ctrl+C dans le terminal
# Arrêter Docker
docker compose down
```

## Dépannage

### Erreur : Port 3000 déjà utilisé

Modifier le port dans `package.json` :
```json
"dev": "next dev -p 3001"
```

Puis accéder à `http://localhost:3001`

### Erreur : Docker non démarré

```bash
# Vérifier que Docker Desktop est lancé
docker ps

# Si erreur, démarrer Docker Desktop puis :
docker compose up -d
```

### Erreur : Base de données non accessible

```bash
# Vérifier que le conteneur est démarré
docker compose ps

# Vérifier les logs
docker compose logs postgres

# Redémarrer le conteneur
docker compose restart postgres
```

### Erreur : Prisma Client non généré

```bash
npx prisma generate
```

### Erreur : Login ne fonctionne pas

Vérifier que le seed a été exécuté avec le bon hash de mot de passe :

```bash
# Re-seed avec le bon hash
Get-Content prisma/seed.sql | docker compose exec -T postgres psql -U pulse -d pulse
```

## Notes importantes

- Le mot de passe par défaut est : `password123`
- Les données seed incluent 20 CostRecords répartis sur 30 jours
- Une règle d'alerte seed existe avec un threshold de 100 EUR sur 7 jours
- Le script `check-alerts` utilise SQL directement (pas de Prisma Client) pour éviter les problèmes de configuration

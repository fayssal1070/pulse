# PULSE - MVP Cost Management System

MVP de gestion de coûts cloud avec authentification, organisations, import CSV, dashboard et alertes.

## Stack technique

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** pour le styling
- **PostgreSQL** (via Docker Compose)
- **Prisma** comme ORM
- **bcryptjs** pour le hashage des mots de passe

## Installation

### Prérequis

- Docker et Docker Compose
- Node.js 18+
- npm

### Étapes

1. **Cloner et installer les dépendances**
   ```bash
   npm install
   ```

2. **Démarrer PostgreSQL**
   ```bash
   docker compose up -d
   ```

3. **Configurer la base de données**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Démarrer l'application**
   ```bash
   npm run dev
   ```

L'application sera accessible sur http://localhost:3000

## Utilisation

### Authentification

1. Créer un compte via `/register`
2. Se connecter via `/login`
3. Accéder au dashboard

### Organisations

- Créer une organisation depuis le dashboard
- Accéder à une organisation pour voir les coûts et alertes

### Import CSV

Format CSV attendu :
```csv
date,provider,service,amountEUR,currency
2024-01-15,AWS,EC2,150.50,EUR
2024-01-16,Azure,Storage,75.25,EUR
```

Colonnes requises :
- `date` : Date au format ISO (YYYY-MM-DD)
- `provider` : Nom du provider (ex: AWS, Azure, GCP)
- `service` : Nom du service
- `amountEUR` : Montant en EUR
- `currency` : Devise

### Alertes

1. Créer une alerte avec un seuil et une période (en jours)
2. Exécuter le script de vérification :
   ```bash
   npm run check-alerts
   ```
3. Les alertes déclenchées seront marquées "TRIGGERED"

## Scripts disponibles

- `npm run dev` : Démarrer le serveur de développement
- `npm run build` : Build de production
- `npm run start` : Démarrer le serveur de production
- `npm run lint` : Vérifier le code avec ESLint
- `npm run check-alerts` : Vérifier et déclencher les alertes

## Structure du projet

```
pulse/
├── app/                    # Pages Next.js (App Router)
│   ├── api/               # API routes
│   ├── dashboard/         # Page dashboard
│   ├── login/            # Page de connexion
│   ├── register/         # Page d'inscription
│   └── organizations/    # Pages organisations
├── lib/                   # Utilitaires
│   ├── auth.ts           # Authentification
│   ├── session.ts        # Gestion des sessions
│   ├── organizations.ts  # Gestion organisations
│   └── prisma.ts         # Client Prisma
├── prisma/                # Schéma Prisma
│   └── schema.prisma
├── scripts/               # Scripts utilitaires
│   └── check-alerts.ts    # Script de vérification des alertes
├── docker-compose.yml     # Configuration PostgreSQL
└── CHECKLIST.md          # Checklist de vérification
```

## Base de données

Le schéma Prisma inclut :
- **User** : Utilisateurs avec email/password
- **Organization** : Organisations avec owner
- **OrganizationMember** : Membres des organisations
- **Cost** : Coûts importés via CSV
- **Alert** : Règles d'alerte avec seuil et période

## Checklist

Voir `CHECKLIST.md` pour la liste complète des vérifications à effectuer.

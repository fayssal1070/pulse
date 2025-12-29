# Fix: Erreur de connexion Prisma Migrate avec Supabase

## Problème

Erreur `P1001: Can't reach database server` lors de `npx prisma migrate deploy`

## Solutions

### 1. Utiliser le pooler de session Supabase (port 5432)

Pour les migrations Prisma, utilisez le **pooler de session** (port 5432), pas le pooler transactionnel (port 6543).

**Format correct** :
```
postgresql://postgres.[ref]:[password]@aws-[n]-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

**Exemple** :
```
postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### 2. Vérifier le nom d'utilisateur

Le nom d'utilisateur doit être au format `postgres.[ref]` où `[ref]` est votre référence Supabase (ex: `gxwhfheouydwaryuoagx`).

### 3. Encoder le mot de passe correctement

Si votre mot de passe contient des caractères spéciaux, encodez-les :
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- etc.

### 4. Configurer SSL pour Prisma Migrate

Prisma Migrate peut avoir besoin d'une variable d'environnement supplémentaire :

**Windows PowerShell** :
```powershell
$env:PGSSLMODE="require"
$env:DATABASE_URL="postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
npx prisma migrate deploy
```

**Linux/Mac** :
```bash
export PGSSLMODE=require
export DATABASE_URL="postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
npx prisma migrate deploy
```

### 5. Mettre à jour le fichier `.env`

Assurez-vous que `.env` contient la bonne URL (pooler de session, port 5432) :

```env
DATABASE_URL=postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### 6. Tester la connexion

Utilisez le script de test :
```bash
node scripts/test-db-connection.js
```

### 7. Où trouver la bonne URL dans Supabase

1. Allez sur [Supabase Dashboard](https://app.supabase.com)
2. Sélectionnez votre projet
3. Settings → Database
4. Section "Connection string" ou "Connection pooling"
5. Choisissez "Session mode" (port 5432) pour les migrations
6. Copiez l'URL et ajoutez `?sslmode=require` si absent

## Erreurs courantes

### `ETIMEDOUT` avec `db.[ref].supabase.co`
- **Cause** : L'URL directe n'est pas accessible depuis l'extérieur
- **Solution** : Utilisez le pooler (`aws-[n]-[region].pooler.supabase.com`)

### `SELF_SIGNED_CERT_IN_CHAIN`
- **Cause** : SSL non configuré correctement
- **Solution** : Ajoutez `?sslmode=require` et `$env:PGSSLMODE="require"`

### `Circuit breaker open`
- **Cause** : Échecs de connexion répétés
- **Solution** : Vérifiez l'URL, le mot de passe, et attendez quelques secondes avant de réessayer


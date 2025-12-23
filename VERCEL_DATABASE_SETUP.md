# Configuration DATABASE_URL sur Vercel

## 1. Forme correcte de DATABASE_URL

```
postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
```

**Points importants :**
- Mot de passe : `Nordic-1987%40` (sans crochets `[]`, le `@` est encodé en `%40`)
- Port : `6543` (connection pooler)
- Host : `aws-1-eu-west-1.pooler.supabase.com`

## 2. Étapes pour configurer sur Vercel

### Étape 1 : Accéder aux Environment Variables
1. Allez sur https://vercel.com/dashboard
2. Sélectionnez le projet **pulse**
3. Cliquez sur **Settings** (en haut à droite)
4. Dans le menu de gauche, cliquez sur **Environment Variables**

### Étape 2 : Ajouter DATABASE_URL pour Production
1. Dans le champ **Key**, tapez : `DATABASE_URL`
2. Dans le champ **Value**, collez :
   ```
   postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
   ```
3. Cochez la case **Production**
4. Cliquez sur **Add**

### Étape 3 : Ajouter DATABASE_URL pour Preview
1. Cliquez à nouveau sur **Add** (ou utilisez le même formulaire)
2. Dans le champ **Key**, tapez : `DATABASE_URL`
3. Dans le champ **Value**, collez la même valeur :
   ```
   postgresql://postgres.gxwhfheouydwaryuoagx:Nordic-1987%40@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
   ```
4. Cochez la case **Preview**
5. Cliquez sur **Add**

### Étape 4 : Redéployer
1. Allez dans l'onglet **Deployments** (en haut)
2. Trouvez le dernier déploiement
3. Cliquez sur les **3 points** (⋯) à droite
4. Sélectionnez **Redeploy**
5. Confirmez le redéploiement

**OU** faites un nouveau commit et push pour déclencher un nouveau déploiement automatique.

## 3. Vérification

Après le redéploiement, testez :
- https://pulse-mt2fzivzg-pulses-projects-bcf85027.vercel.app/login
- https://pulse-mt2fzivzg-pulses-projects-bcf85027.vercel.app/register

Les pages doivent se charger sans erreur 500.

## 4. Credentials de test (après seed)

- **Email** : `owner@example.com`
- **Mot de passe** : `password123`

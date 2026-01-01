# Lead Capture Flow - Documentation

## Vue d'ensemble

Le système de capture de leads a été implémenté pour transformer la démo en outil de génération de leads. Le flow complet est : **Demo → Lead Submission → Thanks Page → Admin Leads**.

## Fichiers modifiés

### 1. API Route - `/app/api/leads/route.ts`
- **Modification** : Rendu le champ `company` optionnel (au lieu de requis)
- **Changements** :
  - Validation : Seul `email` est maintenant requis
  - Création de lead : `company` peut être `null`
  - Mise à jour de lead existant : Préserve `company` existant si non fourni

### 2. Composant - `/components/demo-early-access-form.tsx`
- **Nouveau fichier** : Formulaire "Get Early Access" pour la page demo
- **Fonctionnalités** :
  - Champ email (requis)
  - Champ company (optionnel)
  - Validation et gestion d'erreurs
  - Redirection vers `/thanks?source=demo` après soumission

### 3. Page Demo - `/app/demo/page.tsx`
- **Modification** : Ajout du formulaire "Get Early Access"
- **Emplacement** : Le formulaire apparaît avant la section CTA finale

### 4. Page Thanks - `/app/thanks/page.tsx`
- **Nouveau fichier** : Page de confirmation après soumission de lead
- **Fonctionnalités** :
  - Message de remerciement
  - Instructions pour l'utilisateur
  - Liens vers Home, Demo (si source=demo), et Register
  - Support du paramètre `source` pour personnaliser le message

### 5. Middleware - `/middleware.ts`
- **Modification** : Ajout de `/thanks` aux routes publiques

### 6. Composant LeadsTable - `/components/leads-table.tsx`
- **Modification** : Gestion de `company` null (affiche "-" si absent)

## Flow complet

### 1. Utilisateur visite `/demo`
- Voit le dashboard avec des données fictives
- Voit le panneau "Get Early Access" avec formulaire

### 2. Utilisateur soumet le formulaire
- Email (requis) + Company (optionnel)
- POST vers `/api/leads`
- Validation et création/mise à jour du lead en DB

### 3. Redirection vers `/thanks`
- Message de confirmation
- Instructions pour l'utilisateur
- Liens de navigation

### 4. Admin consulte les leads
- Accès à `/admin/leads` (protégé, nécessite login + owner)
- Liste paginée des leads
- Actions : Archive/Unarchive, Delete

## Tests de bout en bout

### Test 1 : Soumission depuis la démo
1. Aller sur `http://localhost:3000/demo`
2. Scroller jusqu'au formulaire "Get Early Access"
3. Remplir :
   - Email : `test@example.com`
   - Company : `Test Company` (ou laisser vide)
4. Cliquer sur "Request Access"
5. **Résultat attendu** : Redirection vers `/thanks?source=demo` avec message de confirmation

### Test 2 : Vérification en base de données
1. Se connecter en tant qu'admin (owner d'une organisation)
2. Aller sur `http://localhost:3000/admin/leads`
3. **Résultat attendu** : Le lead apparaît dans la liste avec email et company (ou "-" si vide)

### Test 3 : Soumission sans company
1. Aller sur `/demo`
2. Remplir uniquement l'email : `test2@example.com`
3. Laisser company vide
4. Soumettre
5. **Résultat attendu** : Lead créé avec `company = null`, affiché comme "-" dans l'admin

### Test 4 : Soumission avec email existant
1. Soumettre le même email qu'en Test 1
2. **Résultat attendu** : Lead existant mis à jour (pas de doublon)

### Test 5 : Rate limiting
1. Soumettre 6 leads en moins d'1 heure depuis la même IP
2. **Résultat attendu** : 5ème soumission OK, 6ème retourne 429 (Too many requests)

## Structure de la base de données

Le modèle `Lead` existe déjà dans `prisma/schema.prisma` :

```prisma
model Lead {
  id                    String   @id @default(cuid())
  email                 String
  company               String?  // Maintenant optionnel
  role                  String?
  cloudProvider         String?
  monthlyCloudSpendRange String?
  message               String?
  archived              Boolean  @default(false)
  createdAt             DateTime @default(now())

  @@index([email])
  @@index([createdAt])
  @@index([archived])
}
```

## Protection et sécurité

1. **Rate limiting** : 5 requêtes par heure par IP
2. **Honeypot** : Protection anti-spam (champ caché)
3. **Validation email** : Format email vérifié
4. **Déduplication** : Email existant → mise à jour au lieu de création
5. **Admin protégé** : `/admin/leads` nécessite login + owner d'organisation

## Prochaines étapes (optionnel)

Si vous souhaitez ajouter l'envoi d'email automatique :

1. Configurer un service d'email (Resend, SendGrid, etc.)
2. Créer une fonction dans `/lib/email.ts` pour envoyer les instructions
3. Appeler cette fonction dans `/app/api/leads/route.ts` après création du lead
4. Gérer les erreurs d'envoi (log + fallback sur message de confirmation)

## Commandes utiles

```bash
# Voir les leads en DB (via Prisma Studio)
npx prisma studio

# Tester localement
npm run dev

# Build de production
npm run build
```

## Notes

- Les leads sont stockés en base de données PostgreSQL
- La page admin est accessible uniquement aux owners d'organisations
- Le formulaire fonctionne sans JavaScript (grace à la redirection serveur)
- Les leads peuvent être archivés (soft delete) ou supprimés définitivement





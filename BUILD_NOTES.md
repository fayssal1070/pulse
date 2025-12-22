# Notes sur le build

## Problème connu avec Next.js 16 + Turbopack + Prisma

Le build de production (`npm run build`) peut échouer avec l'erreur :
```
Error: Cannot find module '.prisma/client/default'
```

C'est un problème connu avec Next.js 16 et Turbopack qui a des difficultés avec Prisma Client quand il est généré dans un chemin personnalisé.

### Solutions

1. **Mode développement** : Le mode dev (`npm run dev`) fonctionne correctement et peut être utilisé pour tester l'application.

2. **Build sans Turbopack** : Vous pouvez désactiver Turbopack pour le build en ajoutant dans `next.config.ts` :
```typescript
const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['@prisma/client'],
  // Désactiver Turbopack pour le build
  experimental: {
    turbo: false,
  },
};
```

3. **Attendre une mise à jour** : Ce problème devrait être résolu dans une future version de Next.js ou Prisma.

### Vérifications effectuées

- ✅ Toutes les dépendances sont installées
- ✅ Prisma Client est généré correctement
- ✅ Pas d'erreurs ESLint
- ✅ Pas d'erreurs TypeScript (sauf le problème de build mentionné)
- ✅ Le script `check-alerts.ts` fonctionne correctement
- ✅ Tous les fichiers sont correctement configurés

### Pour démarrer l'application

1. Démarrer PostgreSQL : `docker compose up -d`
2. Appliquer les migrations : `npx prisma migrate dev --name init`
3. Démarrer le serveur : `npm run dev`
4. Accéder à http://localhost:3000


